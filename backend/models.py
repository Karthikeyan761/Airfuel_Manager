"""
Database Models for Aircraft Fuel Cost & Trip Management System
All SQLAlchemy ORM models are defined here with proper relationships.
"""
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    """User model supporting Admin and Operator roles."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='operator')  # admin | operator
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FuelSupplier(db.Model):
    """Fuel supplier information."""
    __tablename__ = 'fuel_suppliers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    fuel_purchases = db.relationship('FuelPurchase', back_populates='supplier', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'address': self.address,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FuelPurchase(db.Model):
    """
    Records each fuel purchase event including supplier, quantity, price, and location.
    Also drives current fuel price and inventory levels.
    """
    __tablename__ = 'fuel_purchases'

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('fuel_suppliers.id'), nullable=True)
    supplier_name = db.Column(db.String(100), nullable=False)  # Denormalized for quick access
    location = db.Column(db.String(150), nullable=False)       # Airport or city
    fuel_type = db.Column(db.String(20), nullable=False)       # Jet A1 | Avgas
    quantity_liters = db.Column(db.Float, nullable=False)
    price_per_liter = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    purchase_date = db.Column(db.Date, nullable=False)
    invoice_number = db.Column(db.String(50))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    supplier = db.relationship('FuelSupplier', back_populates='fuel_purchases')

    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier_name,
            'location': self.location,
            'fuel_type': self.fuel_type,
            'quantity_liters': self.quantity_liters,
            'price_per_liter': self.price_per_liter,
            'total_cost': self.total_cost,
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'invoice_number': self.invoice_number,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FuelInventory(db.Model):
    """
    Tracks current fuel inventory levels per fuel type.
    Updated whenever fuel is purchased or consumed.
    """
    __tablename__ = 'fuel_inventory'

    id = db.Column(db.Integer, primary_key=True)
    fuel_type = db.Column(db.String(20), nullable=False, unique=True)  # Jet A1 | Avgas
    total_quantity_liters = db.Column(db.Float, default=0.0)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'fuel_type': self.fuel_type,
            'total_quantity_liters': self.total_quantity_liters,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Aircraft(db.Model):
    """
    Aircraft registry with fuel capacity and consumption characteristics.
    """
    __tablename__ = 'aircraft'

    id = db.Column(db.Integer, primary_key=True)
    aircraft_id = db.Column(db.String(20), unique=True, nullable=False)  # e.g. VT-AKC
    model = db.Column(db.String(100), nullable=False)
    manufacturer = db.Column(db.String(100))
    year = db.Column(db.Integer)
    fuel_tank_capacity_liters = db.Column(db.Float, nullable=False)
    fuel_consumption_rate = db.Column(db.Float, nullable=False)  # liters per km
    fuel_type = db.Column(db.String(20), nullable=False, default='Jet A1')
    max_range_km = db.Column(db.Float)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    flights = db.relationship('Flight', back_populates='aircraft', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'aircraft_id': self.aircraft_id,
            'model': self.model,
            'manufacturer': self.manufacturer,
            'year': self.year,
            'fuel_tank_capacity_liters': self.fuel_tank_capacity_liters,
            'fuel_consumption_rate': self.fuel_consumption_rate,
            'fuel_type': self.fuel_type,
            'max_range_km': self.max_range_km,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Flight(db.Model):
    """
    Flight trip record. Auto-calculates required fuel based on
    aircraft consumption rate and trip distance.
    """
    __tablename__ = 'flights'

    id = db.Column(db.Integer, primary_key=True)
    flight_number = db.Column(db.String(20), unique=True, nullable=False)
    aircraft_id_fk = db.Column(db.Integer, db.ForeignKey('aircraft.id'), nullable=False)
    source = db.Column(db.String(100), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    distance_km = db.Column(db.Float, nullable=False)
    required_fuel_liters = db.Column(db.Float, nullable=False)  # Auto-calculated
    actual_fuel_used_liters = db.Column(db.Float)               # Updated after trip
    fuel_efficiency = db.Column(db.Float)                        # actual/required ratio
    status = db.Column(db.String(20), default='scheduled')       # scheduled | in_flight | completed | cancelled
    departure_time = db.Column(db.DateTime)
    arrival_time = db.Column(db.DateTime)
    flight_date = db.Column(db.Date)
    fuel_price_at_time = db.Column(db.Float)                     # Price snapshot at trip time
    trip_fuel_cost = db.Column(db.Float)                         # Calculated cost
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    aircraft = db.relationship('Aircraft', back_populates='flights')
    fuel_transactions = db.relationship('FuelTransaction', back_populates='flight', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'flight_number': self.flight_number,
            'aircraft_id_fk': self.aircraft_id_fk,
            'aircraft': self.aircraft.to_dict() if self.aircraft else None,
            'source': self.source,
            'destination': self.destination,
            'distance_km': self.distance_km,
            'required_fuel_liters': self.required_fuel_liters,
            'actual_fuel_used_liters': self.actual_fuel_used_liters,
            'fuel_efficiency': self.fuel_efficiency,
            'status': self.status,
            'departure_time': self.departure_time.isoformat() if self.departure_time else None,
            'arrival_time': self.arrival_time.isoformat() if self.arrival_time else None,
            'flight_date': self.flight_date.isoformat() if self.flight_date else None,
            'fuel_price_at_time': self.fuel_price_at_time,
            'trip_fuel_cost': self.trip_fuel_cost,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FuelTransaction(db.Model):
    """
    Records every fuel allocation or consumption event.
    Maintains full transaction history for auditing.
    transaction_type: 'allocation' | 'consumption' | 'refund'
    """
    __tablename__ = 'fuel_transactions'

    id = db.Column(db.Integer, primary_key=True)
    flight_id = db.Column(db.Integer, db.ForeignKey('flights.id'), nullable=True)
    fuel_type = db.Column(db.String(20), nullable=False)
    quantity_liters = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # allocation | consumption | refund
    price_per_liter = db.Column(db.Float)
    total_cost = db.Column(db.Float)
    transaction_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    flight = db.relationship('Flight', back_populates='fuel_transactions')

    def to_dict(self):
        return {
            'id': self.id,
            'flight_id': self.flight_id,
            'flight_number': self.flight.flight_number if self.flight else None,
            'fuel_type': self.fuel_type,
            'quantity_liters': self.quantity_liters,
            'transaction_type': self.transaction_type,
            'price_per_liter': self.price_per_liter,
            'total_cost': self.total_cost,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'notes': self.notes
        }


class DailyFuelUsage(db.Model):
    """
    Aggregated daily fuel usage summary.
    Generated/updated at end of day or on demand.
    """
    __tablename__ = 'daily_fuel_usage'

    id = db.Column(db.Integer, primary_key=True)
    usage_date = db.Column(db.Date, unique=True, nullable=False)
    total_fuel_used_liters = db.Column(db.Float, default=0.0)
    total_flights = db.Column(db.Integer, default=0)
    total_fuel_cost = db.Column(db.Float, default=0.0)
    jet_a1_used = db.Column(db.Float, default=0.0)
    avgas_used = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'usage_date': self.usage_date.isoformat() if self.usage_date else None,
            'total_fuel_used_liters': self.total_fuel_used_liters,
            'total_flights': self.total_flights,
            'total_fuel_cost': self.total_fuel_cost,
            'jet_a1_used': self.jet_a1_used,
            'avgas_used': self.avgas_used
        }
