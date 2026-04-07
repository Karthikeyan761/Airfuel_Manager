"""
Daily Usage Blueprint
Aggregate daily fuel consumption logs and trends.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import DailyFuelUsage

daily_usage_bp = Blueprint('daily_usage', __name__)


@daily_usage_bp.route('/', methods=['GET'])
@jwt_required()
def list_daily_usage():
    """
    Returns daily fuel usage records.
    Query params: start_date, end_date, days (default: 30)
    """
    days = int(request.args.get('days', 30))
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = DailyFuelUsage.query
    if start_date:
        query = query.filter(DailyFuelUsage.usage_date >= start_date)
    if end_date:
        query = query.filter(DailyFuelUsage.usage_date <= end_date)

    records = query.order_by(DailyFuelUsage.usage_date.desc()).limit(days).all()
    records.reverse()

    return jsonify([r.to_dict() for r in records]), 200


@daily_usage_bp.route('/summary', methods=['GET'])
@jwt_required()
def usage_summary():
    """Overall summary of daily usage statistics."""
    from sqlalchemy import func
    from extensions import db

    result = db.session.query(
        func.sum(DailyFuelUsage.total_fuel_used_liters).label('total_fuel'),
        func.sum(DailyFuelUsage.total_flights).label('total_flights'),
        func.sum(DailyFuelUsage.total_fuel_cost).label('total_cost'),
        func.avg(DailyFuelUsage.total_fuel_used_liters).label('avg_daily_fuel'),
        func.count(DailyFuelUsage.id).label('total_days')
    ).first()

    return jsonify({
        'total_fuel_used_liters': round(result.total_fuel or 0, 2),
        'total_flights': result.total_flights or 0,
        'total_fuel_cost': round(result.total_cost or 0, 2),
        'avg_daily_fuel_liters': round(result.avg_daily_fuel or 0, 2),
        'total_days_tracked': result.total_days or 0
    }), 200
