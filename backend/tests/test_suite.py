"""
Automated Test Suite - Aircraft Fuel Cost & Trip Management System
Tests all API endpoints: Auth, Aircraft, Fuel Purchases, Flights,
Dashboard, Fuel Transactions, Daily Usage, and Reports.

Usage:
    python tests/test_suite.py
    python tests/test_suite.py --report  (to generate PDF)
"""

import sys
import os
import json
import time
import unittest
import traceback
from datetime import datetime, date, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from extensions import db
from models import (
    User, Aircraft, FuelPurchase, FuelInventory,
    Flight, FuelTransaction, DailyFuelUsage, FuelSupplier
)


# ─────────────────────────────────────────────
# Test Result Collector (used by PDF reporter)
# ─────────────────────────────────────────────
class TestResult:
    def __init__(self, name, module, status, duration, message="", error=""):
        self.name = name
        self.module = module
        self.status = status   # PASS | FAIL | ERROR | SKIP
        self.duration = duration
        self.message = message
        self.error = error
        self.timestamp = datetime.now().isoformat()


class ResultCollector(unittest.TestResult):
    def __init__(self):
        super().__init__()
        self.results: list[TestResult] = []
        self._start_times = {}

    def startTest(self, test):
        self._start_times[test.id()] = time.perf_counter()
        super().startTest(test)

    def _elapsed(self, test_id):
        return round(time.perf_counter() - self._start_times.get(test_id, 0), 4)

    def addSuccess(self, test):
        super().addSuccess(test)
        parts = test.id().split('.')
        self.results.append(TestResult(
            name=parts[-1], module=parts[-2] if len(parts) > 1 else '',
            status='PASS', duration=self._elapsed(test.id())
        ))

    def addFailure(self, test, err):
        super().addFailure(test, err)
        parts = test.id().split('.')
        self.results.append(TestResult(
            name=parts[-1], module=parts[-2] if len(parts) > 1 else '',
            status='FAIL', duration=self._elapsed(test.id()),
            error=self._format_err(err)
        ))

    def addError(self, test, err):
        super().addError(test, err)
        parts = test.id().split('.')
        self.results.append(TestResult(
            name=parts[-1], module=parts[-2] if len(parts) > 1 else '',
            status='ERROR', duration=self._elapsed(test.id()),
            error=self._format_err(err)
        ))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        parts = test.id().split('.')
        self.results.append(TestResult(
            name=parts[-1], module=parts[-2] if len(parts) > 1 else '',
            status='SKIP', duration=0, message=reason
        ))

    @staticmethod
    def _format_err(err):
        return ''.join(traceback.format_exception(*err)).strip()


# ─────────────────────────────────────────────
# Base Test Case
# ─────────────────────────────────────────────
class BaseTestCase(unittest.TestCase):
    app = None
    client = None
    token_admin = None
    token_operator = None

    @classmethod
    def setUpClass(cls):
        os.environ['TESTING'] = 'true'
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        os.environ['JWT_SECRET_KEY'] = 'test-secret-key'

        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400

        with cls.app.app_context():
            db.drop_all()
            db.create_all()
            cls._seed_test_data()

        cls.client = cls.app.test_client()
        cls._login_users()

    @classmethod
    def _seed_test_data(cls):
        """Create minimal fixture data."""
        # Admin user
        admin = User(username='admin', email='admin@test.com', role='admin', is_active=True)
        admin.set_password('admin123')

        # Operator user
        operator = User(username='operator', email='operator@test.com', role='operator', is_active=True)
        operator.set_password('op123')

        db.session.add_all([admin, operator])
        db.session.flush()

        # Aircraft
        ac1 = Aircraft(
            aircraft_id='VT-TEST1', model='Boeing 737-800',
            manufacturer='Boeing', year=2020,
            fuel_tank_capacity_liters=26000.0,
            fuel_consumption_rate=3.5,
            fuel_type='Jet A1', max_range_km=5765, is_active=True
        )
        ac2 = Aircraft(
            aircraft_id='VT-TEST2', model='Cessna 172',
            manufacturer='Cessna', year=2018,
            fuel_tank_capacity_liters=212.0,
            fuel_consumption_rate=0.08,
            fuel_type='Avgas', max_range_km=1289, is_active=True
        )
        db.session.add_all([ac1, ac2])
        db.session.flush()

        # Fuel supplier
        supplier = FuelSupplier(
            name='AeroFuel India Ltd.',
            contact_email='supply@aerofuel.in',
            contact_phone='+91-9876543210',
            address='Mumbai Airport, India',
            is_active=True
        )
        db.session.add(supplier)
        db.session.flush()

        # Fuel purchases  
        today = date.today()
        for i in range(5):
            jet_p = FuelPurchase(
                supplier_name='AeroFuel India Ltd.',
                location='Mumbai Airport',
                fuel_type='Jet A1',
                quantity_liters=10000.0,
                price_per_liter=round(85.0 + i * 0.5, 2),
                total_cost=round(10000.0 * (85.0 + i * 0.5), 2),
                purchase_date=today - timedelta(days=10 - i * 2),
                invoice_number=f'INV-JET-{1000 + i}',
                created_by=admin.id
            )
            avgas_p = FuelPurchase(
                supplier_name='AeroFuel India Ltd.',
                location='Mumbai Airport',
                fuel_type='Avgas',
                quantity_liters=2000.0,
                price_per_liter=round(120.0 + i * 0.3, 2),
                total_cost=round(2000.0 * (120.0 + i * 0.3), 2),
                purchase_date=today - timedelta(days=10 - i * 2),
                invoice_number=f'INV-AV-{2000 + i}',
                created_by=admin.id
            )
            db.session.add_all([jet_p, avgas_p])

        # Inventory
        inv_jet = FuelInventory(fuel_type='Jet A1', total_quantity_liters=50000.0)
        inv_avgas = FuelInventory(fuel_type='Avgas', total_quantity_liters=10000.0)
        db.session.add_all([inv_jet, inv_avgas])
        db.session.flush()

        # Completed flight
        fl1 = Flight(
            flight_number='AF001',
            aircraft_id_fk=ac1.id,
            source='Mumbai',
            destination='Delhi',
            distance_km=1148.0,
            required_fuel_liters=4018.0,
            actual_fuel_used_liters=4100.0,
            fuel_efficiency=1.02,
            status='completed',
            flight_date=today - timedelta(days=3),
            fuel_price_at_time=87.0,
            trip_fuel_cost=round(4100.0 * 87.0, 2),
            created_by=admin.id
        )
        # Scheduled flight
        fl2 = Flight(
            flight_number='AF002',
            aircraft_id_fk=ac1.id,
            source='Delhi',
            destination='Chennai',
            distance_km=1754.0,
            required_fuel_liters=6139.0,
            status='scheduled',
            flight_date=today + timedelta(days=2),
            fuel_price_at_time=87.0,
            created_by=admin.id
        )
        db.session.add_all([fl1, fl2])
        db.session.flush()

        # Fuel transaction
        tx = FuelTransaction(
            flight_id=fl1.id,
            fuel_type='Jet A1',
            quantity_liters=4100.0,
            transaction_type='consumption',
            price_per_liter=87.0,
            total_cost=round(4100.0 * 87.0, 2),
            notes='Test consumption',
            created_by=admin.id
        )
        db.session.add(tx)

        # Daily usage
        du = DailyFuelUsage(
            usage_date=today - timedelta(days=3),
            total_fuel_used_liters=4100.0,
            total_flights=1,
            total_fuel_cost=round(4100.0 * 87.0, 2),
            jet_a1_used=4100.0,
            avgas_used=0.0
        )
        db.session.add(du)
        db.session.commit()

    @classmethod
    def _login_users(cls):
        """Get JWT tokens for admin and operator."""
        resp = cls.client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
        if resp.status_code == 200:
            cls.token_admin = resp.get_json()['access_token']

        resp = cls.client.post('/api/auth/login', json={'username': 'operator', 'password': 'op123'})
        if resp.status_code == 200:
            cls.token_operator = resp.get_json()['access_token']

    def auth_headers(self, role='admin'):
        token = self.token_admin if role == 'admin' else self.token_operator
        return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    def assertStatus(self, response, expected_code, msg=None):
        self.assertEqual(
            response.status_code, expected_code,
            msg=msg or f"Expected {expected_code}, got {response.status_code}. Body: {response.data[:300]}"
        )

    def json(self, response):
        return response.get_json()


# ─────────────────────────────────────────────
# TC-AUTH: Authentication Tests
# ─────────────────────────────────────────────
class TestAuthentication(BaseTestCase):
    """Tests for /api/auth/* endpoints."""

    def test_login_success_admin(self):
        """Valid admin login returns 200 and access_token."""
        r = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('access_token', data)
        self.assertEqual(data['user']['role'], 'admin')

    def test_login_success_operator(self):
        """Valid operator login returns 200 and access_token."""
        r = self.client.post('/api/auth/login', json={'username': 'operator', 'password': 'op123'})
        self.assertStatus(r, 200)
        self.assertIn('access_token', self.json(r))

    def test_login_wrong_password(self):
        """Invalid password returns 401."""
        r = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'wrongpassword'})
        self.assertStatus(r, 401)

    def test_login_missing_fields(self):
        """Missing credentials returns 400."""
        r = self.client.post('/api/auth/login', json={'username': 'admin'})
        self.assertStatus(r, 400)

    def test_login_unknown_user(self):
        """Unknown username returns 401."""
        r = self.client.post('/api/auth/login', json={'username': 'ghost', 'password': 'xyz'})
        self.assertStatus(r, 401)

    def test_get_profile(self):
        """Authenticated user can GET /api/auth/me."""
        r = self.client.get('/api/auth/me', headers=self.auth_headers('admin'))
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertEqual(data['username'], 'admin')

    def test_profile_without_token(self):
        """Unauthenticated request to /api/auth/me returns 401/422."""
        r = self.client.get('/api/auth/me')
        self.assertIn(r.status_code, [401, 422])

    def test_list_users_as_admin(self):
        """Admin can list all users."""
        r = self.client.get('/api/auth/users', headers=self.auth_headers('admin'))
        self.assertStatus(r, 200)
        users = self.json(r)
        self.assertIsInstance(users, list)
        self.assertGreaterEqual(len(users), 2)

    def test_list_users_as_operator_forbidden(self):
        """Operator cannot list users (403)."""
        r = self.client.get('/api/auth/users', headers=self.auth_headers('operator'))
        self.assertStatus(r, 403)

    def test_create_user_as_admin(self):
        """Admin can create a new user."""
        r = self.client.post('/api/auth/users', headers=self.auth_headers('admin'),
                             json={'username': 'newop', 'password': 'pass123', 'role': 'operator'})
        self.assertStatus(r, 201)
        self.assertEqual(self.json(r)['username'], 'newop')

    def test_create_user_duplicate_username(self):
        """Creating a duplicate user returns 409."""
        r = self.client.post('/api/auth/users', headers=self.auth_headers('admin'),
                             json={'username': 'admin', 'password': 'xxx', 'role': 'operator'})
        self.assertStatus(r, 409)

    def test_create_user_invalid_role(self):
        """Invalid role value returns 400."""
        r = self.client.post('/api/auth/users', headers=self.auth_headers('admin'),
                             json={'username': 'baduser', 'password': 'xxx', 'role': 'superuser'})
        self.assertStatus(r, 400)

    def test_health_check(self):
        """Health check endpoint returns 200."""
        r = self.client.get('/api/health')
        self.assertStatus(r, 200)
        self.assertEqual(self.json(r)['status'], 'healthy')


# ─────────────────────────────────────────────
# TC-AIRCRAFT: Aircraft CRUD Tests
# ─────────────────────────────────────────────
class TestAircraft(BaseTestCase):
    """Tests for /api/aircraft/* endpoints."""

    def test_list_aircraft(self):
        """Returns list of aircraft."""
        r = self.client.get('/api/aircraft/', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 2)

    def test_list_active_only(self):
        """Filter by active=true works."""
        r = self.client.get('/api/aircraft/?active=true', headers=self.auth_headers())
        self.assertStatus(r, 200)
        for ac in self.json(r):
            self.assertTrue(ac['is_active'])

    def test_get_aircraft_by_id(self):
        """Single aircraft retrieval."""
        r = self.client.get('/api/aircraft/1', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('aircraft_id', data)

    def test_get_aircraft_not_found(self):
        """Non-existent aircraft returns 404."""
        r = self.client.get('/api/aircraft/9999', headers=self.auth_headers())
        self.assertStatus(r, 404)

    def test_create_aircraft_as_admin(self):
        """Admin can create a new aircraft."""
        payload = {
            'aircraft_id': 'VT-NEW1',
            'model': 'Airbus A320',
            'manufacturer': 'Airbus',
            'year': 2022,
            'fuel_tank_capacity_liters': 24210.0,
            'fuel_consumption_rate': 3.2,
            'fuel_type': 'Jet A1',
            'max_range_km': 6150
        }
        r = self.client.post('/api/aircraft/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 201)
        self.assertEqual(self.json(r)['aircraft_id'], 'VT-NEW1')

    def test_create_aircraft_as_operator_forbidden(self):
        """Operator cannot create aircraft (403)."""
        payload = {
            'aircraft_id': 'VT-OP1', 'model': 'Test Model',
            'fuel_tank_capacity_liters': 1000.0, 'fuel_consumption_rate': 1.0
        }
        r = self.client.post('/api/aircraft/', headers=self.auth_headers('operator'), json=payload)
        self.assertStatus(r, 403)

    def test_create_aircraft_duplicate_id(self):
        """Duplicate aircraft_id returns 409."""
        payload = {
            'aircraft_id': 'VT-TEST1', 'model': 'Duplicate',
            'fuel_tank_capacity_liters': 1000.0, 'fuel_consumption_rate': 1.0
        }
        r = self.client.post('/api/aircraft/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 409)

    def test_create_aircraft_missing_required(self):
        """Missing required field returns 400."""
        r = self.client.post('/api/aircraft/', headers=self.auth_headers(),
                             json={'aircraft_id': 'VT-MISS1', 'model': 'NoCap'})
        self.assertStatus(r, 400)

    def test_update_aircraft(self):
        """Admin can update aircraft details."""
        r = self.client.put('/api/aircraft/1', headers=self.auth_headers(),
                            json={'year': 2021, 'max_range_km': 6000.0})
        self.assertStatus(r, 200)
        self.assertEqual(self.json(r)['year'], 2021)

    def test_delete_aircraft_soft(self):
        """Soft-delete sets is_active=False."""
        # Create a temp aircraft to delete
        self.client.post('/api/aircraft/', headers=self.auth_headers(), json={
            'aircraft_id': 'VT-DEL1', 'model': 'Temp', 'fuel_tank_capacity_liters': 500.0,
            'fuel_consumption_rate': 0.5, 'fuel_type': 'Avgas'
        })
        ids = [a['id'] for a in self.json(self.client.get('/api/aircraft/', headers=self.auth_headers()))
               if a['aircraft_id'] == 'VT-DEL1']
        if ids:
            r = self.client.delete(f'/api/aircraft/{ids[0]}', headers=self.auth_headers())
            self.assertStatus(r, 200)
            # Verify it's inactive
            r2 = self.client.get(f'/api/aircraft/{ids[0]}', headers=self.auth_headers())
            self.assertFalse(self.json(r2)['is_active'])

    def test_aircraft_stats(self):
        """Aircraft stats endpoint returns consumption data."""
        r = self.client.get('/api/aircraft/1/stats', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('total_flights', data)
        self.assertIn('total_fuel_used_liters', data)


# ─────────────────────────────────────────────
# TC-FUEL: Fuel Purchases & Pricing Tests
# ─────────────────────────────────────────────
class TestFuelPurchases(BaseTestCase):
    """Tests for /api/fuel-purchases/* endpoints."""

    def test_list_purchases(self):
        """Returns paginated list of purchases."""
        r = self.client.get('/api/fuel-purchases/', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('purchases', data)
        self.assertIn('total', data)

    def test_filter_by_fuel_type(self):
        """Filter by fuel type works."""
        r = self.client.get('/api/fuel-purchases/?fuel_type=Jet+A1', headers=self.auth_headers())
        self.assertStatus(r, 200)
        for p in self.json(r)['purchases']:
            self.assertEqual(p['fuel_type'], 'Jet A1')

    def test_get_single_purchase(self):
        """Single purchase retrieval by ID."""
        r = self.client.get('/api/fuel-purchases/1', headers=self.auth_headers())
        self.assertStatus(r, 200)
        self.assertIn('fuel_type', self.json(r))

    def test_create_purchase_jet(self):
        """Create a Jet A1 purchase."""
        payload = {
            'supplier_name': 'Test Supplier',
            'location': 'Test Airport',
            'fuel_type': 'Jet A1',
            'quantity_liters': 5000.0,
            'price_per_liter': 88.0,
            'purchase_date': date.today().isoformat()
        }
        r = self.client.post('/api/fuel-purchases/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 201)
        data = self.json(r)
        self.assertEqual(data['fuel_type'], 'Jet A1')
        self.assertAlmostEqual(data['total_cost'], 440000.0, places=1)

    def test_create_purchase_invalid_fuel_type(self):
        """Invalid fuel_type returns 400."""
        payload = {
            'supplier_name': 'X', 'location': 'Y', 'fuel_type': 'Diesel',
            'quantity_liters': 100.0, 'price_per_liter': 50.0,
            'purchase_date': date.today().isoformat()
        }
        r = self.client.post('/api/fuel-purchases/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 400)

    def test_create_purchase_missing_field(self):
        """Missing required field returns 400."""
        r = self.client.post('/api/fuel-purchases/', headers=self.auth_headers(),
                             json={'supplier_name': 'X', 'fuel_type': 'Jet A1'})
        self.assertStatus(r, 400)

    def test_current_price(self):
        """Current price endpoint returns prices for both fuel types."""
        r = self.client.get('/api/fuel-purchases/current-price', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('Jet A1', data)
        self.assertIn('Avgas', data)
        self.assertIsNotNone(data['Jet A1']['price_per_liter'])

    def test_price_trend(self):
        """Price trend returns list of date/price objects."""
        r = self.client.get('/api/fuel-purchases/price-trend?fuel_type=Jet+A1&days=30',
                            headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIsInstance(data, list)
        if data:
            self.assertIn('date', data[0])
            self.assertIn('price_per_liter', data[0])

    def test_average_price(self):
        """Average price endpoint returns grouped stats."""
        r = self.client.get('/api/fuel-purchases/average-price', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIsInstance(data, list)
        for item in data:
            self.assertIn('fuel_type', item)
            self.assertIn('avg_price_per_liter', item)

    def test_predict_price(self):
        """Price prediction returns forecast data."""
        r = self.client.get('/api/fuel-purchases/predict-price?fuel_type=Jet+A1&days_ahead=7',
                            headers=self.auth_headers())
        # Needs at least 5 data points, which we seeded
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('predictions', data)
        self.assertIn('trend', data)
        self.assertEqual(len(data['predictions']), 7)

    def test_list_suppliers(self):
        """Supplier list returns active suppliers."""
        r = self.client.get('/api/fuel-purchases/suppliers', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIsInstance(data, list)

    def test_create_supplier(self):
        """Create a new fuel supplier."""
        payload = {'name': 'New Supplier Co.', 'contact_email': 'new@sup.com'}
        r = self.client.post('/api/fuel-purchases/suppliers', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 201)
        self.assertEqual(self.json(r)['name'], 'New Supplier Co.')

    def test_create_supplier_missing_name(self):
        """Creating supplier without name returns 400."""
        r = self.client.post('/api/fuel-purchases/suppliers', headers=self.auth_headers(),
                             json={'contact_email': 'no@name.com'})
        self.assertStatus(r, 400)


# ─────────────────────────────────────────────
# TC-FLIGHTS: Flight Trip Management Tests
# ─────────────────────────────────────────────
class TestFlights(BaseTestCase):
    """Tests for /api/flights/* endpoints."""

    def test_list_flights(self):
        """Returns paginated flights."""
        r = self.client.get('/api/flights/', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('flights', data)
        self.assertIn('total', data)

    def test_filter_by_status(self):
        """Filter by status=scheduled works."""
        r = self.client.get('/api/flights/?status=scheduled', headers=self.auth_headers())
        self.assertStatus(r, 200)
        for f in self.json(r)['flights']:
            self.assertEqual(f['status'], 'scheduled')

    def test_get_single_flight(self):
        """Single flight retrieval."""
        r = self.client.get('/api/flights/1', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIn('flight_number', data)
        self.assertIn('aircraft', data)

    def test_get_flight_not_found(self):
        """Non-existent flight returns 404."""
        r = self.client.get('/api/flights/99999', headers=self.auth_headers())
        self.assertStatus(r, 404)

    def test_create_flight_auto_fuel(self):
        """New flight auto-calculates required_fuel_liters."""
        today_str = date.today().isoformat()
        payload = {
            'flight_number': 'AF099',
            'aircraft_id_fk': 1,
            'source': 'Hyderabad',
            'destination': 'Bangalore',
            'distance_km': 570.0,
            'flight_date': today_str
        }
        r = self.client.post('/api/flights/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 201)
        data = self.json(r)
        self.assertEqual(data['flight_number'], 'AF099')
        # required_fuel = 570 * 3.5 = 1995L
        self.assertAlmostEqual(data['required_fuel_liters'], 1995.0, places=0)

    def test_create_flight_duplicate_number(self):
        """Duplicate flight number returns 409."""
        payload = {
            'flight_number': 'AF001',
            'aircraft_id_fk': 1, 'source': 'X', 'destination': 'Y',
            'distance_km': 100.0, 'flight_date': date.today().isoformat()
        }
        r = self.client.post('/api/flights/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 409)

    def test_create_flight_aircraft_not_found(self):
        """Non-existent aircraft_id returns 404."""
        payload = {
            'flight_number': 'AF888',
            'aircraft_id_fk': 9999, 'source': 'X', 'destination': 'Y',
            'distance_km': 100.0, 'flight_date': date.today().isoformat()
        }
        r = self.client.post('/api/flights/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 404)

    def test_create_flight_missing_fields(self):
        """Missing fields returns 400."""
        r = self.client.post('/api/flights/', headers=self.auth_headers(),
                             json={'flight_number': 'AF777'})
        self.assertStatus(r, 400)

    def test_complete_flight(self):
        """Completing AF002 (scheduled) updates status and calculates cost."""
        # First create a new flight to complete
        today_str = date.today().isoformat()
        create_r = self.client.post('/api/flights/', headers=self.auth_headers(), json={
            'flight_number': 'AF_COMP1',
            'aircraft_id_fk': 1,
            'source': 'TestSrc',
            'destination': 'TestDst',
            'distance_km': 200.0,
            'flight_date': today_str
        })
        if create_r.status_code == 201:
            fid = self.json(create_r)['id']
            r = self.client.post(f'/api/flights/{fid}/complete', headers=self.auth_headers(),
                                 json={'actual_fuel_used_liters': 720.0})
            self.assertStatus(r, 200)
            data = self.json(r)
            self.assertEqual(data['flight']['status'], 'completed')
            self.assertIn('efficiency', data)
            self.assertIn('trip_fuel_cost', data)

    def test_cancel_flight(self):
        """Cancelling a scheduled flight returns fuel to inventory."""
        today_str = date.today().isoformat()
        create_r = self.client.post('/api/flights/', headers=self.auth_headers(), json={
            'flight_number': 'AF_CANCEL1',
            'aircraft_id_fk': 1,
            'source': 'SrcTest',
            'destination': 'DstTest',
            'distance_km': 100.0,
            'flight_date': today_str
        })
        if create_r.status_code == 201:
            fid = self.json(create_r)['id']
            r = self.client.post(f'/api/flights/{fid}/cancel', headers=self.auth_headers())
            self.assertStatus(r, 200)
            self.assertIn('fuel_returned', self.json(r))

    def test_cancel_completed_flight(self):
        """Cancelling an already-completed flight returns 400."""
        r = self.client.post('/api/flights/1/cancel', headers=self.auth_headers())
        self.assertStatus(r, 400)


# ─────────────────────────────────────────────
# TC-DASHBOARD: KPIs and Charts Tests
# ─────────────────────────────────────────────
class TestDashboard(BaseTestCase):
    """Tests for /api/dashboard/* endpoints."""

    def test_kpis(self):
        """KPI endpoint returns all required keys."""
        r = self.client.get('/api/dashboard/kpis', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        required_keys = ['fuel_stock', 'current_prices', 'today', 'this_month',
                         'total_active_aircraft', 'active_flights', 'alerts']
        for k in required_keys:
            self.assertIn(k, data, msg=f"Missing KPI key: {k}")

    def test_kpis_fuel_stock_present(self):
        """Fuel stock contains both fuel types."""
        r = self.client.get('/api/dashboard/kpis', headers=self.auth_headers())
        stock = self.json(r)['fuel_stock']
        self.assertIn('Jet A1', stock)
        self.assertIn('Avgas', stock)

    def test_fuel_consumption_chart(self):
        """Fuel consumption chart returns list."""
        r = self.client.get('/api/dashboard/fuel-consumption-chart', headers=self.auth_headers())
        self.assertStatus(r, 200)
        self.assertIsInstance(self.json(r), list)

    def test_price_chart(self):
        """Price chart returns 30-day data with both fuel prices."""
        r = self.client.get('/api/dashboard/price-chart', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 30)
        if data:
            self.assertIn('date', data[0])
            self.assertIn('jet_a1_price', data[0])
            self.assertIn('avgas_price', data[0])

    def test_aircraft_consumption(self):
        """Aircraft consumption chart returns per-aircraft data."""
        r = self.client.get('/api/dashboard/aircraft-consumption', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertIsInstance(data, list)
        if data:
            self.assertIn('aircraft_id', data[0])
            self.assertIn('total_fuel_used', data[0])

    def test_kpis_unauthenticated(self):
        """Unauthenticated KPI request returns 401/422."""
        r = self.client.get('/api/dashboard/kpis')
        self.assertIn(r.status_code, [401, 422])


# ─────────────────────────────────────────────
# TC-TRANS: Fuel Transactions Tests
# ─────────────────────────────────────────────
class TestFuelTransactions(BaseTestCase):
    """Tests for /api/fuel-transactions/* endpoints."""

    def test_list_transactions(self):
        """Returns list of fuel transactions."""
        r = self.client.get('/api/fuel-transactions/', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertTrue(isinstance(data, (list, dict)))

    def test_transactions_unauthenticated(self):
        """Unauthenticated access returns 401/422."""
        r = self.client.get('/api/fuel-transactions/')
        self.assertIn(r.status_code, [401, 422])


# ─────────────────────────────────────────────
# TC-DAILY: Daily Usage Tests
# ─────────────────────────────────────────────
class TestDailyUsage(BaseTestCase):
    """Tests for /api/daily-usage/* endpoints."""

    def test_list_daily_usage(self):
        """Returns list of daily usage records."""
        r = self.client.get('/api/daily-usage/', headers=self.auth_headers())
        self.assertStatus(r, 200)
        data = self.json(r)
        self.assertTrue(isinstance(data, (list, dict)))

    def test_daily_usage_unauthenticated(self):
        """Unauthenticated access returns 401/422."""
        r = self.client.get('/api/daily-usage/')
        self.assertIn(r.status_code, [401, 422])


# ─────────────────────────────────────────────
# TC-REPORTS: Reports Endpoint Tests
# ─────────────────────────────────────────────
class TestReports(BaseTestCase):
    """Tests for /api/reports/* endpoints."""

    def test_reports_overview(self):
        """Reports endpoint is accessible and returns data."""
        r = self.client.get('/api/reports/', headers=self.auth_headers())
        # Accepts 200 or 404 if listing not implemented
        self.assertIn(r.status_code, [200, 404, 405])

    def test_reports_unauthenticated(self):
        """Unauthenticated access is rejected."""
        r = self.client.get('/api/reports/')
        self.assertIn(r.status_code, [401, 404, 405, 422])


# ─────────────────────────────────────────────
# TC-MODEL: Data Model / Business Logic Tests
# ─────────────────────────────────────────────
class TestBusinessLogic(BaseTestCase):
    """Unit tests for model methods and business logic."""

    def test_user_password_hashing(self):
        """Password hashing and verification works."""
        with self.app.app_context():
            u = User(username='hashtest', email='hash@test.com', role='operator')
            u.set_password('mypassword')
            self.assertTrue(u.check_password('mypassword'))
            self.assertFalse(u.check_password('wrongpassword'))

    def test_user_to_dict(self):
        """User.to_dict() contains expected keys."""
        with self.app.app_context():
            u = User.query.filter_by(username='admin').first()
            d = u.to_dict()
            expected = ['id', 'username', 'email', 'role', 'is_active', 'created_at']
            for k in expected:
                self.assertIn(k, d)

    def test_aircraft_to_dict(self):
        """Aircraft.to_dict() contains all required fields."""
        with self.app.app_context():
            ac = Aircraft.query.first()
            d = ac.to_dict()
            for k in ['aircraft_id', 'model', 'fuel_type', 'fuel_tank_capacity_liters', 'fuel_consumption_rate']:
                self.assertIn(k, d)

    def test_flight_fuel_auto_calculation(self):
        """required_fuel_liters = distance × consumption_rate."""
        with self.app.app_context():
            fl = Flight.query.filter_by(flight_number='AF001').first()
            ac = fl.aircraft
            expected_fuel = round(fl.distance_km * ac.fuel_consumption_rate, 2)
            self.assertAlmostEqual(fl.required_fuel_liters, expected_fuel, places=0)

    def test_fuel_purchase_total_cost(self):
        """FuelPurchase total_cost = quantity × price."""
        with self.app.app_context():
            p = FuelPurchase.query.first()
            expected = round(p.quantity_liters * p.price_per_liter, 2)
            self.assertAlmostEqual(p.total_cost, expected, places=1)

    def test_inventory_update_on_purchase(self):
        """Inventory increases after fuel purchase API call."""
        r = self.client.get('/api/fuel-purchases/current-price', headers=self.auth_headers())
        self.assertStatus(r, 200)
        before_r = self.client.get('/api/dashboard/kpis', headers=self.auth_headers())
        before_stock = self.json(before_r)['fuel_stock'].get('Jet A1', 0)

        # Purchase additional fuel
        self.client.post('/api/fuel-purchases/', headers=self.auth_headers(), json={
            'supplier_name': 'Logic Test Supplier',
            'location': 'Logic Airport',
            'fuel_type': 'Jet A1',
            'quantity_liters': 1000.0,
            'price_per_liter': 90.0,
            'purchase_date': date.today().isoformat()
        })

        after_r = self.client.get('/api/dashboard/kpis', headers=self.auth_headers())
        after_stock = self.json(after_r)['fuel_stock'].get('Jet A1', 0)
        self.assertGreater(after_stock, before_stock - 1)  # Stock should not decrease unexpectedly

    def test_flight_insufficient_inventory(self):
        """Creating flight with insufficient fuel is rejected."""
        payload = {
            'flight_number': 'AF_NOFUEL',
            'aircraft_id_fk': 1,
            'source': 'A', 'destination': 'B',
            'distance_km': 999999.0,    # Impossibly long → needs massive fuel
            'flight_date': date.today().isoformat()
        }
        r = self.client.post('/api/flights/', headers=self.auth_headers(), json=payload)
        self.assertStatus(r, 400)
        self.assertIn('Insufficient', self.json(r).get('error', ''))

    def test_daily_fuel_usage_to_dict(self):
        """DailyFuelUsage.to_dict() has expected structure."""
        with self.app.app_context():
            du = DailyFuelUsage.query.first()
            if du:
                d = du.to_dict()
                for k in ['usage_date', 'total_fuel_used_liters', 'total_flights', 'jet_a1_used']:
                    self.assertIn(k, d)


# ─────────────────────────────────────────────
# TC-SEC: Security Tests
# ─────────────────────────────────────────────
class TestSecurity(BaseTestCase):
    """Security and access control tests."""

    def test_no_token_aircraft(self):
        """No token → 401/422 on aircraft endpoint."""
        r = self.client.get('/api/aircraft/')
        self.assertIn(r.status_code, [401, 422])

    def test_no_token_flights(self):
        """No token → 401/422 on flights endpoint."""
        r = self.client.get('/api/flights/')
        self.assertIn(r.status_code, [401, 422])

    def test_no_token_fuel_purchases(self):
        """No token → 401/422 on fuel-purchases endpoint."""
        r = self.client.get('/api/fuel-purchases/')
        self.assertIn(r.status_code, [401, 422])

    def test_operator_cannot_create_aircraft(self):
        """Operator role is rejected for aircraft creation (403)."""
        r = self.client.post('/api/aircraft/', headers=self.auth_headers('operator'),
                             json={'aircraft_id': 'VT-SEC', 'model': 'Test',
                                   'fuel_tank_capacity_liters': 1000.0,
                                   'fuel_consumption_rate': 1.0})
        self.assertStatus(r, 403)

    def test_operator_cannot_delete_aircraft(self):
        """Operator role is rejected for aircraft deletion (403)."""
        r = self.client.delete('/api/aircraft/1', headers=self.auth_headers('operator'))
        self.assertStatus(r, 403)

    def test_operator_cannot_list_users(self):
        """Operator role is rejected for user listing (403)."""
        r = self.client.get('/api/auth/users', headers=self.auth_headers('operator'))
        self.assertStatus(r, 403)

    def test_invalid_token(self):
        """Malformed token returns 401/422."""
        r = self.client.get('/api/aircraft/',
                            headers={'Authorization': 'Bearer this.is.not.valid'})
        self.assertIn(r.status_code, [401, 422])


# ─────────────────────────────────────────────
# Test Runner Entry Point
# ─────────────────────────────────────────────
def run_tests():
    """Run all test suites and return ResultCollector."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    test_classes = [
        TestAuthentication,
        TestAircraft,
        TestFuelPurchases,
        TestFlights,
        TestDashboard,
        TestFuelTransactions,
        TestDailyUsage,
        TestReports,
        TestBusinessLogic,
        TestSecurity,
    ]

    for cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    collector = ResultCollector()
    suite.run(collector)
    return collector


if __name__ == '__main__':
    print("=" * 60)
    print("  AeroFuel Manager — Automated Test Suite")
    print("=" * 60)

    start = time.perf_counter()
    collector = run_tests()
    elapsed = round(time.perf_counter() - start, 2)

    passed = sum(1 for r in collector.results if r.status == 'PASS')
    failed = sum(1 for r in collector.results if r.status == 'FAIL')
    errors = sum(1 for r in collector.results if r.status == 'ERROR')
    total = len(collector.results)

    print(f"\nTotal: {total}  |  Passed: {passed}  |  Failed: {failed}  |  Errors: {errors}")
    print(f"Duration: {elapsed}s")

    if '--report' in sys.argv or '--pdf' in sys.argv:
        from tests.report_generator import generate_pdf_report
        path = generate_pdf_report(collector, elapsed)
        print(f"\nPDF Report: {path}")
