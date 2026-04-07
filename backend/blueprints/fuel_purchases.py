"""
Fuel Purchases Blueprint
Handles recording, querying fuel purchases and price tracking.
Business Logic: 
  - Current fuel price = most recent purchase price per fuel type
  - Inventory is incremented on each purchase
"""
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import desc
from extensions import db
from models import FuelPurchase, FuelInventory, FuelSupplier

fuel_purchases_bp = Blueprint('fuel_purchases', __name__)


@fuel_purchases_bp.route('/', methods=['GET'])
@jwt_required()
def list_purchases():
    """List fuel purchases with optional filters: fuel_type, start_date, end_date."""
    fuel_type = request.args.get('fuel_type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    per_page = int(request.args.get('per_page', 50))
    page = int(request.args.get('page', 1))

    query = FuelPurchase.query

    if fuel_type:
        query = query.filter_by(fuel_type=fuel_type)
    if start_date:
        query = query.filter(FuelPurchase.purchase_date >= start_date)
    if end_date:
        query = query.filter(FuelPurchase.purchase_date <= end_date)

    pagination = query.order_by(desc(FuelPurchase.purchase_date)).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'purchases': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@fuel_purchases_bp.route('/<int:purchase_id>', methods=['GET'])
@jwt_required()
def get_purchase(purchase_id):
    """Get a single fuel purchase by ID."""
    purchase = FuelPurchase.query.get_or_404(purchase_id)
    return jsonify(purchase.to_dict()), 200


@fuel_purchases_bp.route('/', methods=['POST'])
@jwt_required()
def create_purchase():
    """
    Record a new fuel purchase.
    Automatically updates the FuelInventory for the relevant fuel type.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ['supplier_name', 'location', 'fuel_type', 'quantity_liters', 'price_per_liter', 'purchase_date']
    for field in required:
        if not data.get(field) and data.get(field) != 0:
            return jsonify({'error': f'{field} is required'}), 400

    if data['fuel_type'] not in ['Jet A1', 'Avgas']:
        return jsonify({'error': 'fuel_type must be Jet A1 or Avgas'}), 400

    qty = float(data['quantity_liters'])
    price = float(data['price_per_liter'])

    purchase = FuelPurchase(
        supplier_name=data['supplier_name'],
        location=data['location'],
        fuel_type=data['fuel_type'],
        quantity_liters=qty,
        price_per_liter=price,
        total_cost=round(qty * price, 2),
        purchase_date=datetime.strptime(data['purchase_date'], '%Y-%m-%d').date(),
        invoice_number=data.get('invoice_number'),
        notes=data.get('notes'),
        created_by=int(user_id)
    )

    # Link supplier if ID provided
    if data.get('supplier_id'):
        supplier = FuelSupplier.query.get(data['supplier_id'])
        if supplier:
            purchase.supplier_id = supplier.id

    db.session.add(purchase)

    # Update inventory
    inventory = FuelInventory.query.filter_by(fuel_type=data['fuel_type']).first()
    if not inventory:
        inventory = FuelInventory(fuel_type=data['fuel_type'], total_quantity_liters=0.0)
        db.session.add(inventory)
    inventory.total_quantity_liters = round(inventory.total_quantity_liters + qty, 2)

    db.session.commit()
    return jsonify(purchase.to_dict()), 201


@fuel_purchases_bp.route('/current-price', methods=['GET'])
@jwt_required()
def current_price():
    """
    Returns the current (latest) fuel price for each fuel type.
    Current price = most recent purchase price.
    """
    jet = FuelPurchase.query.filter_by(fuel_type='Jet A1').order_by(
        desc(FuelPurchase.purchase_date), desc(FuelPurchase.id)
    ).first()

    avgas = FuelPurchase.query.filter_by(fuel_type='Avgas').order_by(
        desc(FuelPurchase.purchase_date), desc(FuelPurchase.id)
    ).first()

    return jsonify({
        'Jet A1': {
            'price_per_liter': jet.price_per_liter if jet else None,
            'last_purchase_date': jet.purchase_date.isoformat() if jet else None,
            'supplier': jet.supplier_name if jet else None
        },
        'Avgas': {
            'price_per_liter': avgas.price_per_liter if avgas else None,
            'last_purchase_date': avgas.purchase_date.isoformat() if avgas else None,
            'supplier': avgas.supplier_name if avgas else None
        }
    }), 200


@fuel_purchases_bp.route('/price-trend', methods=['GET'])
@jwt_required()
def price_trend():
    """
    Returns price trend data grouped by date for charting.
    Query param: fuel_type (default: Jet A1), days (default: 30)
    """
    fuel_type = request.args.get('fuel_type', 'Jet A1')
    days = int(request.args.get('days', 30))

    purchases = FuelPurchase.query.filter_by(fuel_type=fuel_type).order_by(
        FuelPurchase.purchase_date
    ).all()

    # Group by date, take the last price of each day
    price_map = {}
    for p in purchases:
        key = p.purchase_date.isoformat()
        price_map[key] = p.price_per_liter

    trend = [{'date': k, 'price_per_liter': v} for k, v in sorted(price_map.items())]

    # Return only last N days
    return jsonify(trend[-days:]), 200


@fuel_purchases_bp.route('/average-price', methods=['GET'])
@jwt_required()
def average_price():
    """Calculate weighted average fuel price per fuel type."""
    from sqlalchemy import func

    result = db.session.query(
        FuelPurchase.fuel_type,
        func.avg(FuelPurchase.price_per_liter).label('avg_price'),
        func.sum(FuelPurchase.quantity_liters).label('total_qty'),
        func.count(FuelPurchase.id).label('purchase_count')
    ).group_by(FuelPurchase.fuel_type).all()

    return jsonify([{
        'fuel_type': r.fuel_type,
        'avg_price_per_liter': round(r.avg_price, 4) if r.avg_price else 0,
        'total_quantity_liters': round(r.total_qty, 2) if r.total_qty else 0,
        'purchase_count': r.purchase_count
    } for r in result]), 200


@fuel_purchases_bp.route('/predict-price', methods=['GET'])
@jwt_required()
def predict_price():
    """
    Basic linear regression to predict future fuel prices.
    Query param: fuel_type, days_ahead (default: 7)
    """
    import numpy as np
    from sklearn.linear_model import LinearRegression

    fuel_type = request.args.get('fuel_type', 'Jet A1')
    days_ahead = int(request.args.get('days_ahead', 7))

    purchases = FuelPurchase.query.filter_by(fuel_type=fuel_type).order_by(
        FuelPurchase.purchase_date
    ).all()

    if len(purchases) < 5:
        return jsonify({'error': 'Insufficient data for prediction (need at least 5 records)'}), 400

    from datetime import datetime as dt
    base_date = purchases[0].purchase_date
    X = np.array([(p.purchase_date - base_date).days for p in purchases]).reshape(-1, 1)
    y = np.array([p.price_per_liter for p in purchases])

    model = LinearRegression()
    model.fit(X, y)

    last_day = (purchases[-1].purchase_date - base_date).days
    predictions = []
    for i in range(1, days_ahead + 1):
        future_day = last_day + i
        pred_price = round(float(model.predict([[future_day]])[0]), 4)
        from datetime import timedelta
        future_date = purchases[-1].purchase_date + timedelta(days=i)
        predictions.append({
            'date': future_date.isoformat(),
            'predicted_price': pred_price
        })

    return jsonify({
        'fuel_type': fuel_type,
        'current_price': purchases[-1].price_per_liter,
        'predictions': predictions,
        'trend': 'increasing' if model.coef_[0] > 0 else 'decreasing',
        'daily_change_rate': round(float(model.coef_[0]), 4)
    }), 200


@fuel_purchases_bp.route('/suppliers', methods=['GET'])
@jwt_required()
def list_suppliers():
    """List all fuel suppliers."""
    suppliers = FuelSupplier.query.filter_by(is_active=True).all()
    return jsonify([s.to_dict() for s in suppliers]), 200


@fuel_purchases_bp.route('/suppliers', methods=['POST'])
@jwt_required()
def create_supplier():
    """Create a new fuel supplier."""
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Supplier name is required'}), 400

    supplier = FuelSupplier(
        name=data['name'],
        contact_email=data.get('contact_email'),
        contact_phone=data.get('contact_phone'),
        address=data.get('address')
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201
