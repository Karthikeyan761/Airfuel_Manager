"""
Fuel Transactions Blueprint
Full transaction history with filtering and audit trails.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import desc
from models import FuelTransaction, FuelInventory

fuel_transactions_bp = Blueprint('fuel_transactions', __name__)


@fuel_transactions_bp.route('', methods=['GET'])
@jwt_required()
def list_transactions():
    """List all fuel transactions with filters."""
    tx_type = request.args.get('transaction_type')
    fuel_type = request.args.get('fuel_type')
    flight_id = request.args.get('flight_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    per_page = int(request.args.get('per_page', 50))
    page = int(request.args.get('page', 1))

    query = FuelTransaction.query
    if tx_type:
        query = query.filter_by(transaction_type=tx_type)
    if fuel_type:
        query = query.filter_by(fuel_type=fuel_type)
    if flight_id:
        query = query.filter_by(flight_id=int(flight_id))
    if start_date:
        query = query.filter(FuelTransaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(FuelTransaction.transaction_date <= end_date)

    pagination = query.order_by(desc(FuelTransaction.transaction_date)).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'transactions': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@fuel_transactions_bp.route('/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    """Get current fuel inventory levels."""
    inventories = FuelInventory.query.all()
    return jsonify([i.to_dict() for i in inventories]), 200


@fuel_transactions_bp.route('/summary', methods=['GET'])
@jwt_required()
def transaction_summary():
    """Summary of transactions grouped by type."""
    from sqlalchemy import func
    from extensions import db

    result = db.session.query(
        FuelTransaction.transaction_type,
        FuelTransaction.fuel_type,
        func.sum(FuelTransaction.quantity_liters).label('total_liters'),
        func.sum(FuelTransaction.total_cost).label('total_cost'),
        func.count(FuelTransaction.id).label('count')
    ).group_by(FuelTransaction.transaction_type, FuelTransaction.fuel_type).all()

    return jsonify([{
        'transaction_type': r.transaction_type,
        'fuel_type': r.fuel_type,
        'total_liters': round(r.total_liters or 0, 2),
        'total_cost': round(r.total_cost or 0, 2),
        'count': r.count
    } for r in result]), 200
