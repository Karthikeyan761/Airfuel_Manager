"""
Dashboard Blueprint
Aggregated KPIs and summary data for the main dashboard.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from datetime import date, timedelta
from extensions import db
from models import (FuelInventory, FuelPurchase, Flight, FuelTransaction,
                    DailyFuelUsage, Aircraft)

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/kpis', methods=['GET'])
@jwt_required()
def get_kpis():
    """
    Returns core KPIs for the dashboard:
    - Current fuel stock (per type)
    - Current fuel price
    - Today's fuel usage
    - Total flights this month
    - Monthly fuel cost
    """
    today = date.today()
    month_start = today.replace(day=1)

    # Current inventory
    inventories = FuelInventory.query.all()
    stock = {inv.fuel_type: inv.total_quantity_liters for inv in inventories}

    # Current prices
    jet_price = FuelPurchase.query.filter_by(fuel_type='Jet A1').order_by(
        desc(FuelPurchase.purchase_date), desc(FuelPurchase.id)
    ).first()
    avgas_price = FuelPurchase.query.filter_by(fuel_type='Avgas').order_by(
        desc(FuelPurchase.purchase_date), desc(FuelPurchase.id)
    ).first()

    # Today's usage
    today_usage = DailyFuelUsage.query.filter_by(usage_date=today).first()

    # Monthly stats
    monthly = db.session.query(
        func.sum(DailyFuelUsage.total_fuel_used_liters).label('total_fuel'),
        func.sum(DailyFuelUsage.total_flights).label('total_flights'),
        func.sum(DailyFuelUsage.total_fuel_cost).label('total_cost')
    ).filter(DailyFuelUsage.usage_date >= month_start).first()

    # Aircraft count
    total_aircraft = Aircraft.query.filter_by(is_active=True).count()

    # Active flights
    active_flights = Flight.query.filter(
        Flight.status.in_(['scheduled', 'in_flight'])
    ).count()

    # Low fuel alert (below 20% capacity threshold = 50,000L)
    LOW_THRESHOLD = 50000
    alerts = []
    for inv in inventories:
        if inv.total_quantity_liters < LOW_THRESHOLD:
            alerts.append({
                'type': 'low_fuel',
                'fuel_type': inv.fuel_type,
                'current_level': inv.total_quantity_liters,
                'threshold': LOW_THRESHOLD,
                'message': f'{inv.fuel_type} stock is critically low ({inv.total_quantity_liters:.0f}L remaining)'
            })

    return jsonify({
        'fuel_stock': stock,
        'current_prices': {
            'Jet A1': jet_price.price_per_liter if jet_price else None,
            'Avgas': avgas_price.price_per_liter if avgas_price else None
        },
        'today': {
            'fuel_used_liters': today_usage.total_fuel_used_liters if today_usage else 0,
            'flights': today_usage.total_flights if today_usage else 0,
            'fuel_cost': today_usage.total_fuel_cost if today_usage else 0
        },
        'this_month': {
            'total_fuel_used_liters': round(monthly.total_fuel or 0, 2),
            'total_flights': monthly.total_flights or 0,
            'total_fuel_cost': round(monthly.total_cost or 0, 2)
        },
        'total_active_aircraft': total_aircraft,
        'active_flights': active_flights,
        'alerts': alerts
    }), 200


@dashboard_bp.route('/fuel-consumption-chart', methods=['GET'])
@jwt_required()
def fuel_consumption_chart():
    """Last 30 days daily fuel usage for bar chart."""
    end_date = date.today()
    start_date = end_date - timedelta(days=29)

    records = DailyFuelUsage.query.filter(
        DailyFuelUsage.usage_date >= start_date,
        DailyFuelUsage.usage_date <= end_date
    ).order_by(DailyFuelUsage.usage_date).all()

    return jsonify([r.to_dict() for r in records]), 200


@dashboard_bp.route('/price-chart', methods=['GET'])
@jwt_required()
def price_chart():
    """Last 30 days price trend for line chart."""
    from blueprints.fuel_purchases import fuel_purchases_bp

    purchases = FuelPurchase.query.order_by(FuelPurchase.purchase_date).all()

    # Build dual-series dataset
    jet_prices = {}
    avgas_prices = {}
    for p in purchases:
        key = p.purchase_date.isoformat()
        if p.fuel_type == 'Jet A1':
            jet_prices[key] = p.price_per_liter
        elif p.fuel_type == 'Avgas':
            avgas_prices[key] = p.price_per_liter

    all_dates = sorted(set(list(jet_prices.keys()) + list(avgas_prices.keys())))

    # Last 30 data points
    all_dates = all_dates[-30:]

    result = []
    for d in all_dates:
        result.append({
            'date': d,
            'jet_a1_price': jet_prices.get(d),
            'avgas_price': avgas_prices.get(d)
        })

    return jsonify(result), 200


@dashboard_bp.route('/aircraft-consumption', methods=['GET'])
@jwt_required()
def aircraft_consumption():
    """Per-aircraft fuel consumption for bar chart."""
    aircraft_list = Aircraft.query.filter_by(is_active=True).all()
    result = []

    for aircraft in aircraft_list:
        flights = Flight.query.filter_by(
            aircraft_id_fk=aircraft.id, status='completed'
        ).all()
        total_fuel = sum(f.actual_fuel_used_liters or 0 for f in flights)
        total_cost = sum(f.trip_fuel_cost or 0 for f in flights)

        result.append({
            'aircraft_id': aircraft.aircraft_id,
            'model': aircraft.model,
            'total_fuel_used': round(total_fuel, 2),
            'total_cost': round(total_cost, 2),
            'flight_count': len(flights)
        })

    return jsonify(result), 200
