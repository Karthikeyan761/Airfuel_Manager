"""
Flights Blueprint
Trip management with auto-calculated fuel requirements and fuel allocation.
Business Logic:
  - required_fuel = distance_km × aircraft.fuel_consumption_rate
  - trip_fuel_cost = actual_fuel_used × current_price_per_liter
  - Completing a trip deducts fuel from inventory
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import desc
from extensions import db
from models import Flight, Aircraft, FuelPurchase, FuelInventory, FuelTransaction, DailyFuelUsage

flights_bp = Blueprint('flights', __name__)


def _get_current_price(fuel_type):
    """Helper: get the current price per liter for a fuel type."""
    latest = FuelPurchase.query.filter_by(fuel_type=fuel_type).order_by(
        desc(FuelPurchase.purchase_date), desc(FuelPurchase.id)
    ).first()
    return latest.price_per_liter if latest else 0.0


@flights_bp.route('/', methods=['GET'])
@jwt_required()
def list_flights():
    """List all flights with optional filters."""
    status = request.args.get('status')
    aircraft_id = request.args.get('aircraft_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    per_page = int(request.args.get('per_page', 20))
    page = int(request.args.get('page', 1))

    query = Flight.query
    if status:
        query = query.filter_by(status=status)
    if aircraft_id:
        query = query.filter_by(aircraft_id_fk=int(aircraft_id))
    if start_date:
        query = query.filter(Flight.flight_date >= start_date)
    if end_date:
        query = query.filter(Flight.flight_date <= end_date)

    pagination = query.order_by(desc(Flight.created_at)).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'flights': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@flights_bp.route('/<int:flight_id>', methods=['GET'])
@jwt_required()
def get_flight(flight_id):
    """Get a single flight by ID."""
    flight = Flight.query.get_or_404(flight_id)
    return jsonify(flight.to_dict()), 200


@flights_bp.route('/', methods=['POST'])
@jwt_required()
def create_flight():
    """
    Create a new flight/trip.
    Auto-calculates required_fuel = distance × aircraft.consumption_rate.
    Automatically allocates fuel from inventory.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ['flight_number', 'aircraft_id_fk', 'source', 'destination', 'distance_km', 'flight_date']
    for field in required:
        if not data.get(field) and data.get(field) != 0:
            return jsonify({'error': f'{field} is required'}), 400

    if Flight.query.filter_by(flight_number=data['flight_number']).first():
        return jsonify({'error': 'Flight number already exists'}), 409

    aircraft = Aircraft.query.get(data['aircraft_id_fk'])
    if not aircraft:
        return jsonify({'error': 'Aircraft not found'}), 404

    distance = float(data['distance_km'])
    required_fuel = round(distance * aircraft.fuel_consumption_rate, 2)
    current_price = _get_current_price(aircraft.fuel_type)

    # Check inventory availability
    inventory = FuelInventory.query.filter_by(fuel_type=aircraft.fuel_type).first()
    if not inventory or inventory.total_quantity_liters < required_fuel:
        return jsonify({
            'error': f'Insufficient {aircraft.fuel_type} inventory. '
                     f'Required: {required_fuel}L, Available: {inventory.total_quantity_liters if inventory else 0}L'
        }), 400

    flight_date = datetime.strptime(data['flight_date'], '%Y-%m-%d').date()

    flight = Flight(
        flight_number=data['flight_number'],
        aircraft_id_fk=aircraft.id,
        source=data['source'],
        destination=data['destination'],
        distance_km=distance,
        required_fuel_liters=required_fuel,
        status='scheduled',
        flight_date=flight_date,
        fuel_price_at_time=current_price,
        notes=data.get('notes'),
        created_by=int(user_id)
    )

    if data.get('departure_time'):
        flight.departure_time = datetime.fromisoformat(data['departure_time'])

    db.session.add(flight)
    db.session.flush()  # Get flight ID

    # Allocate fuel from inventory
    inventory.total_quantity_liters = round(inventory.total_quantity_liters - required_fuel, 2)

    # Record fuel transaction
    tx = FuelTransaction(
        flight_id=flight.id,
        fuel_type=aircraft.fuel_type,
        quantity_liters=required_fuel,
        transaction_type='allocation',
        price_per_liter=current_price,
        total_cost=round(required_fuel * current_price, 2),
        notes=f'Fuel allocated for flight {flight.flight_number}',
        created_by=int(user_id)
    )
    db.session.add(tx)
    db.session.commit()

    return jsonify(flight.to_dict()), 201


@flights_bp.route('/<int:flight_id>/complete', methods=['POST'])
@jwt_required()
def complete_flight(flight_id):
    """
    Mark a flight as completed with actual fuel usage.
    Calculates efficiency and trip cost.
    Records refund if less fuel was used than allocated.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data.get('actual_fuel_used_liters'):
        return jsonify({'error': 'actual_fuel_used_liters is required'}), 400

    flight = Flight.query.get_or_404(flight_id)
    if flight.status == 'completed':
        return jsonify({'error': 'Flight already completed'}), 400

    actual_fuel = float(data['actual_fuel_used_liters'])
    required_fuel = flight.required_fuel_liters
    current_price = flight.fuel_price_at_time or _get_current_price(flight.aircraft.fuel_type)

    efficiency = round(actual_fuel / required_fuel, 4) if required_fuel > 0 else 1.0
    trip_cost = round(actual_fuel * current_price, 2)

    flight.actual_fuel_used_liters = actual_fuel
    flight.fuel_efficiency = efficiency
    flight.trip_fuel_cost = trip_cost
    flight.status = 'completed'

    if data.get('arrival_time'):
        flight.arrival_time = datetime.fromisoformat(data['arrival_time'])
    else:
        flight.arrival_time = datetime.now(timezone.utc)

    # If actual < allocated, refund the difference to inventory
    difference = round(required_fuel - actual_fuel, 2)
    if difference > 0:
        aircraft = flight.aircraft
        inventory = FuelInventory.query.filter_by(fuel_type=aircraft.fuel_type).first()
        if inventory:
            inventory.total_quantity_liters = round(inventory.total_quantity_liters + difference, 2)

        refund_tx = FuelTransaction(
            flight_id=flight.id,
            fuel_type=aircraft.fuel_type,
            quantity_liters=difference,
            transaction_type='refund',
            price_per_liter=current_price,
            total_cost=round(difference * current_price, 2),
            notes=f'Fuel refund for flight {flight.flight_number} (unused)',
            created_by=int(user_id)
        )
        db.session.add(refund_tx)

    # Record consumption transaction
    consumption_tx = FuelTransaction(
        flight_id=flight.id,
        fuel_type=flight.aircraft.fuel_type,
        quantity_liters=actual_fuel,
        transaction_type='consumption',
        price_per_liter=current_price,
        total_cost=trip_cost,
        notes=f'Actual fuel consumed for flight {flight.flight_number}',
        created_by=int(user_id)
    )
    db.session.add(consumption_tx)

    # Update daily usage
    _update_daily_usage(flight.flight_date, actual_fuel, flight.aircraft.fuel_type, trip_cost)

    db.session.commit()

    return jsonify({
        'flight': flight.to_dict(),
        'efficiency': efficiency,
        'efficiency_label': 'excellent' if efficiency < 0.95 else ('good' if efficiency < 1.05 else 'high'),
        'fuel_saved_liters': max(0, difference),
        'trip_fuel_cost': trip_cost
    }), 200


@flights_bp.route('/<int:flight_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_flight(flight_id):
    """Cancel a flight and return allocated fuel to inventory."""
    user_id = get_jwt_identity()
    flight = Flight.query.get_or_404(flight_id)

    if flight.status in ['completed', 'cancelled']:
        return jsonify({'error': f'Cannot cancel a {flight.status} flight'}), 400

    aircraft = flight.aircraft
    inventory = FuelInventory.query.filter_by(fuel_type=aircraft.fuel_type).first()
    if inventory:
        inventory.total_quantity_liters = round(
            inventory.total_quantity_liters + flight.required_fuel_liters, 2
        )

    # Refund allocation
    refund_tx = FuelTransaction(
        flight_id=flight.id,
        fuel_type=aircraft.fuel_type,
        quantity_liters=flight.required_fuel_liters,
        transaction_type='refund',
        price_per_liter=flight.fuel_price_at_time or 0,
        total_cost=round(flight.required_fuel_liters * (flight.fuel_price_at_time or 0), 2),
        notes=f'Flight {flight.flight_number} cancelled - fuel returned to inventory',
        created_by=int(user_id)
    )
    db.session.add(refund_tx)

    flight.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': f'Flight {flight.flight_number} cancelled', 'fuel_returned': flight.required_fuel_liters}), 200


def _update_daily_usage(flight_date, fuel_liters, fuel_type, fuel_cost):
    """Update or create DailyFuelUsage record for a given date."""
    daily = DailyFuelUsage.query.filter_by(usage_date=flight_date).first()
    if not daily:
        daily = DailyFuelUsage(usage_date=flight_date, total_fuel_used_liters=0.0,
                               total_flights=0, total_fuel_cost=0.0, jet_a1_used=0.0, avgas_used=0.0)
        db.session.add(daily)

    daily.total_fuel_used_liters = round(daily.total_fuel_used_liters + fuel_liters, 2)
    daily.total_flights += 1
    daily.total_fuel_cost = round(daily.total_fuel_cost + fuel_cost, 2)

    if fuel_type == 'Jet A1':
        daily.jet_a1_used = round(daily.jet_a1_used + fuel_liters, 2)
    else:
        daily.avgas_used = round(daily.avgas_used + fuel_liters, 2)
