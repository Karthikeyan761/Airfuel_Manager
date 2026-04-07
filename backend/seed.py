"""
Seed data for initial application state.
Creates default admin user, sample aircraft, suppliers, and historical purchases.
"""
from datetime import date, timedelta
import random
from extensions import db
from models import User, FuelSupplier, FuelPurchase, FuelInventory, Aircraft


def seed_initial_data():
    """Idempotent seeder - only seeds if data doesn't exist."""

    # ---- Users ----
    if not User.query.first():
        admin = User(username='admin', email='admin@aroplane.com', role='admin')
        admin.set_password('admin123')

        operator = User(username='operator', email='operator@aroplane.com', role='operator')
        operator.set_password('operator123')

        db.session.add_all([admin, operator])
        db.session.commit()
        print("[SEED] Users created.")

    # ---- Fuel Inventory ----
    if not FuelInventory.query.first():
        jet_inv = FuelInventory(fuel_type='Jet A1', total_quantity_liters=0.0)
        avgas_inv = FuelInventory(fuel_type='Avgas', total_quantity_liters=0.0)
        db.session.add_all([jet_inv, avgas_inv])
        db.session.commit()
        print("[SEED] Fuel inventory records created.")

    # ---- Suppliers ----
    if not FuelSupplier.query.first():
        suppliers = [
            FuelSupplier(name='AirFuel India Pvt Ltd', contact_email='orders@airfuel.in',
                         contact_phone='+91-9876543210', address='Mumbai Airport, T2 Complex'),
            FuelSupplier(name='JetFlow Aviation Fuels', contact_email='supply@jetflow.co',
                         contact_phone='+91-8765432109', address='Delhi IGI Airport'),
            FuelSupplier(name='SkyEnergy Corp', contact_email='fuel@skyenergy.com',
                         contact_phone='+91-7654321098', address='Bengaluru HAL Airport'),
        ]
        db.session.add_all(suppliers)
        db.session.commit()
        print("[SEED] Suppliers created.")

    # ---- Aircraft ----
    if not Aircraft.query.first():
        aircraft_list = [
            Aircraft(aircraft_id='VT-AKC', model='Boeing 737-800', manufacturer='Boeing',
                     year=2018, fuel_tank_capacity_liters=26020, fuel_consumption_rate=3.5,
                     fuel_type='Jet A1', max_range_km=5765),
            Aircraft(aircraft_id='VT-JNK', model='Airbus A320', manufacturer='Airbus',
                     year=2020, fuel_tank_capacity_liters=26730, fuel_consumption_rate=3.2,
                     fuel_type='Jet A1', max_range_km=6150),
            Aircraft(aircraft_id='VT-PLN', model='ATR 72-600', manufacturer='ATR',
                     year=2019, fuel_tank_capacity_liters=6370, fuel_consumption_rate=1.8,
                     fuel_type='Jet A1', max_range_km=1528),
            Aircraft(aircraft_id='VT-SKY', model='Cessna 172', manufacturer='Cessna',
                     year=2015, fuel_tank_capacity_liters=212, fuel_consumption_rate=0.35,
                     fuel_type='Avgas', max_range_km=1289),
            Aircraft(aircraft_id='VT-SRI', model='Bombardier Q400', manufacturer='Bombardier',
                     year=2017, fuel_tank_capacity_liters=6700, fuel_consumption_rate=2.1,
                     fuel_type='Jet A1', max_range_km=2522),
        ]
        db.session.add_all(aircraft_list)
        db.session.commit()
        print("[SEED] Aircraft created.")

    # ---- Historical Fuel Purchases (last 60 days) ----
    if not FuelPurchase.query.first():
        suppliers = FuelSupplier.query.all()
        locations = ['Mumbai (BOM)', 'Delhi (DEL)', 'Bengaluru (BLR)',
                     'Chennai (MAA)', 'Hyderabad (HYD)', 'Kolkata (CCU)']
        base_price_jet = 87.5   # INR per liter
        base_price_avgas = 105.0

        total_jet = 0.0
        total_avgas = 0.0

        for i in range(60):
            purchase_date = date.today() - timedelta(days=60 - i)

            # Jet A1 purchase
            qty_jet = round(random.uniform(5000, 15000), 2)
            # Slight price drift over time (realistic trend)
            price_jet = round(base_price_jet + (i * 0.15) + random.uniform(-2, 2), 2)
            sup = random.choice(suppliers)
            jet_purchase = FuelPurchase(
                supplier_id=sup.id, supplier_name=sup.name,
                location=random.choice(locations),
                fuel_type='Jet A1', quantity_liters=qty_jet,
                price_per_liter=price_jet,
                total_cost=round(qty_jet * price_jet, 2),
                purchase_date=purchase_date,
                invoice_number=f'INV-JA-{2024000 + i}'
            )
            db.session.add(jet_purchase)
            total_jet += qty_jet

            # Occasional Avgas purchase
            if i % 5 == 0:
                qty_avgas = round(random.uniform(200, 800), 2)
                price_avgas = round(base_price_avgas + (i * 0.1) + random.uniform(-1, 1), 2)
                avgas_purchase = FuelPurchase(
                    supplier_id=sup.id, supplier_name=sup.name,
                    location=random.choice(locations),
                    fuel_type='Avgas', quantity_liters=qty_avgas,
                    price_per_liter=price_avgas,
                    total_cost=round(qty_avgas * price_avgas, 2),
                    purchase_date=purchase_date,
                    invoice_number=f'INV-AV-{2024000 + i}'
                )
                db.session.add(avgas_purchase)
                total_avgas += qty_avgas

        db.session.commit()

        # Update inventory with 40% remaining (rest was consumed)
        jet_inv = FuelInventory.query.filter_by(fuel_type='Jet A1').first()
        avgas_inv = FuelInventory.query.filter_by(fuel_type='Avgas').first()
        if jet_inv:
            jet_inv.total_quantity_liters = round(total_jet * 0.40, 2)
        if avgas_inv:
            avgas_inv.total_quantity_liters = round(total_avgas * 0.40, 2)
        db.session.commit()
        print("[SEED] Historical fuel purchases and inventory seeded.")

    print("[SEED] Database seeding complete.")
