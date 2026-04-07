"""
Aircraft Blueprint
CRUD operations for aircraft registration and management.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Aircraft

aircraft_bp = Blueprint('aircraft', __name__)


@aircraft_bp.route('/', methods=['GET'])
@jwt_required()
def list_aircraft():
    """List all aircraft with optional active filter."""
    active_only = request.args.get('active', 'false').lower() == 'true'
    query = Aircraft.query
    if active_only:
        query = query.filter_by(is_active=True)
    aircraft_list = query.order_by(Aircraft.aircraft_id).all()
    return jsonify([a.to_dict() for a in aircraft_list]), 200


@aircraft_bp.route('/<int:aircraft_id>', methods=['GET'])
@jwt_required()
def get_aircraft(aircraft_id):
    """Get a single aircraft by ID."""
    aircraft = Aircraft.query.get_or_404(aircraft_id)
    return jsonify(aircraft.to_dict()), 200


@aircraft_bp.route('/', methods=['POST'])
@jwt_required()
def create_aircraft():
    """Create a new aircraft record (Admin only)."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    required = ['aircraft_id', 'model', 'fuel_tank_capacity_liters', 'fuel_consumption_rate']
    for field in required:
        if data.get(field) is None:
            return jsonify({'error': f'{field} is required'}), 400

    if Aircraft.query.filter_by(aircraft_id=data['aircraft_id']).first():
        return jsonify({'error': 'Aircraft ID already exists'}), 409

    aircraft = Aircraft(
        aircraft_id=data['aircraft_id'],
        model=data['model'],
        manufacturer=data.get('manufacturer'),
        year=data.get('year'),
        fuel_tank_capacity_liters=float(data['fuel_tank_capacity_liters']),
        fuel_consumption_rate=float(data['fuel_consumption_rate']),
        fuel_type=data.get('fuel_type', 'Jet A1'),
        max_range_km=data.get('max_range_km')
    )
    db.session.add(aircraft)
    db.session.commit()
    return jsonify(aircraft.to_dict()), 201


@aircraft_bp.route('/<int:aircraft_id>', methods=['PUT'])
@jwt_required()
def update_aircraft(aircraft_id):
    """Update an aircraft record."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    aircraft = Aircraft.query.get_or_404(aircraft_id)
    data = request.get_json()

    aircraft.model = data.get('model', aircraft.model)
    aircraft.manufacturer = data.get('manufacturer', aircraft.manufacturer)
    aircraft.year = data.get('year', aircraft.year)
    aircraft.fuel_tank_capacity_liters = float(data.get('fuel_tank_capacity_liters', aircraft.fuel_tank_capacity_liters))
    aircraft.fuel_consumption_rate = float(data.get('fuel_consumption_rate', aircraft.fuel_consumption_rate))
    aircraft.fuel_type = data.get('fuel_type', aircraft.fuel_type)
    aircraft.max_range_km = data.get('max_range_km', aircraft.max_range_km)
    aircraft.is_active = data.get('is_active', aircraft.is_active)

    db.session.commit()
    return jsonify(aircraft.to_dict()), 200


@aircraft_bp.route('/<int:aircraft_id>', methods=['DELETE'])
@jwt_required()
def delete_aircraft(aircraft_id):
    """Soft-delete an aircraft (marks as inactive)."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    aircraft = Aircraft.query.get_or_404(aircraft_id)
    aircraft.is_active = False
    db.session.commit()
    return jsonify({'message': f'Aircraft {aircraft.aircraft_id} deactivated'}), 200


@aircraft_bp.route('/<int:aircraft_id>/stats', methods=['GET'])
@jwt_required()
def aircraft_stats(aircraft_id):
    """Get consumption statistics for a specific aircraft."""
    from models import Flight
    aircraft = Aircraft.query.get_or_404(aircraft_id)

    completed_flights = Flight.query.filter_by(
        aircraft_id_fk=aircraft_id, status='completed'
    ).all()

    total_fuel_used = sum(f.actual_fuel_used_liters or 0 for f in completed_flights)
    total_distance = sum(f.distance_km for f in completed_flights)
    total_cost = sum(f.trip_fuel_cost or 0 for f in completed_flights)

    return jsonify({
        'aircraft': aircraft.to_dict(),
        'total_flights': len(completed_flights),
        'total_fuel_used_liters': round(total_fuel_used, 2),
        'total_distance_km': round(total_distance, 2),
        'total_fuel_cost': round(total_cost, 2),
        'avg_consumption_rate': round(total_fuel_used / total_distance, 4) if total_distance > 0 else 0
    }), 200
