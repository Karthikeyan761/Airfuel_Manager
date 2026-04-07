# Aircraft Fuel Cost & Trip Management System — AeroFuel Manager

A production-grade full-stack aviation fuel operations management system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Recharts, Axios, React Router |
| Backend | Python Flask, Blueprints, JWT |
| Database | PostgreSQL (via SQLAlchemy ORM) |
| PDF Export | ReportLab |
| ML Prediction | scikit-learn (Linear Regression) |

---

## Project Structure

```
aroplane__fuel/
├── backend/
│   ├── app.py               # Flask app factory
│   ├── config.py            # Configuration
│   ├── extensions.py        # Shared extensions (db, ma)
│   ├── models.py            # All SQLAlchemy ORM models
│   ├── seed.py              # Database seeder (60 days of historical data)
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables ⚠️ Edit this!
│   └── blueprints/
│       ├── auth.py          # Login / JWT / User management
│       ├── aircraft.py      # Aircraft CRUD + stats
│       ├── fuel_purchases.py # Purchases, price tracking, ML prediction
│       ├── flights.py       # Trip management + fuel allocation
│       ├── fuel_transactions.py # Transaction history + inventory
│       ├── daily_usage.py   # Daily usage logs
│       ├── dashboard.py     # KPIs, chart data, alerts
│       └── reports.py       # Report generation + PDF export
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js    # Axios client with JWT interceptors
    │   │   └── services.js  # All API endpoint functions
    │   ├── contexts/
    │   │   └── AuthContext.js
    │   ├── components/
    │   │   └── Sidebar.js   # Navigation sidebar
    │   ├── pages/
    │   │   ├── LoginPage.js
    │   │   ├── DashboardPage.js
    │   │   ├── FuelPurchasesPage.js
    │   │   ├── FuelInventoryPage.js
    │   │   ├── TransactionsPage.js
    │   │   ├── AircraftPage.js
    │   │   ├── FlightsPage.js
    │   │   ├── DailyUsagePage.js
    │   │   ├── ReportsPage.js
    │   │   ├── PriceTrendsPage.js
    │   │   └── UsersPage.js
    │   ├── App.js
    │   └── index.css        # Full dark aviation design system
    └── package.json
```

---

## ⚡ Quick Start

### Step 1 — Configure PostgreSQL

1. Open `backend/.env`
2. Replace `YOUR_POSTGRES_PASSWORD` with your actual PostgreSQL password:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/aroplane_fuel
   ```

### Step 2 — Create the Database

Open PostgreSQL shell (psql or pgAdmin) and run:
```sql
CREATE DATABASE aroplane_fuel;
```

Or via command line (replace password):
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE aroplane_fuel;"
```

### Step 3 — Start the Backend

```powershell
cd backend
python app.py
```

Flask will run at: **http://localhost:5000**

The database tables are auto-created on first run. Sample data (60 days of purchases, 5 aircraft, 3 suppliers) is seeded automatically.

### Step 4 — Start the Frontend

In a new terminal:
```powershell
cd frontend
npm start
```

React dev server runs at: **http://localhost:3000**

---

## 🔑 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Operator | `operator` | `operator123` |

---

## 📋 Features

### Dashboard
- Real-time KPIs: fuel stock, current price, today's usage, monthly flights
- Low-fuel inventory alerts
- Daily consumption area chart
- Fuel price dual-line trend chart
- Aircraft-wise consumption bar charts

### Fuel Purchases
- Record purchases from suppliers with date, quantity, price, invoice
- Automatic inventory update on each purchase
- Current price display (latest purchase)
- Date and fuel-type filtering

### Fuel Inventory
- Visual stock gauges with low-stock alerts
- Transaction summary (allocation / consumption / refund)
- Complete transaction history with filters

### Aircraft Management
- Register aircraft with fuel specs (tank capacity, consumption rate/km)
- Stats panel: total flights, fuel used, cost per aircraft
- Fleet capacity progress bars

### Flight / Trip Management
- Create flights with auto-calculated required fuel
- Real-time inventory check before scheduling
- Complete flight with actual fuel → calculates efficiency
- Cancel flights → returns fuel to inventory
- Status tracking: Scheduled → Completed / Cancelled

### Price Trends
- Interactive 14/30/60/90-day price charts
- Average price reference line
- 🤖 ML-powered 7-day price prediction (Linear Regression via scikit-learn)

### Reports
- **Trip Costs**: per-flight fuel cost breakdown
- **Monthly Usage**: month-by-month aggregation with bar chart
- **Aircraft-wise**: consumption comparison across fleet
- **PDF Export**: one-click export for any report type (via ReportLab)

### Daily Fuel Usage
- Stacked bar chart (Jet A1 vs Avgas per day)
- Daily log table with flight count, cost, avg cost/liter

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/aircraft/` | List all aircraft |
| POST | `/api/aircraft/` | Register aircraft (admin) |
| GET | `/api/aircraft/{id}/stats` | Aircraft usage stats |
| GET | `/api/fuel-purchases/` | List purchases (with filters) |
| POST | `/api/fuel-purchases/` | Record new purchase |
| GET | `/api/fuel-purchases/current-price` | Latest price per fuel type |
| GET | `/api/fuel-purchases/price-trend` | Historical prices for chart |
| GET | `/api/fuel-purchases/predict-price` | ML price prediction |
| GET | `/api/flights/` | List flights |
| POST | `/api/flights/` | Create flight (allocates fuel) |
| POST | `/api/flights/{id}/complete` | Complete with actual fuel |
| POST | `/api/flights/{id}/cancel` | Cancel (returns fuel) |
| GET | `/api/fuel-transactions/inventory` | Current stock levels |
| GET | `/api/dashboard/kpis` | Dashboard KPIs |
| GET | `/api/dashboard/aircraft-consumption` | Aircraft chart data |
| GET | `/api/reports/trip-costs` | Trip cost report |
| GET | `/api/reports/monthly-usage` | Monthly usage report |
| GET | `/api/reports/export-pdf` | Download PDF report |

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Authentication with roles (admin/operator) |
| `fuel_suppliers` | Supplier registry |
| `fuel_purchases` | Every fuel procurement event |
| `fuel_inventory` | Current stock per fuel type |
| `aircraft` | Fleet registry with fuel specs |
| `flights` | Trip records with fuel allocation |
| `fuel_transactions` | Full audit trail (allocation/consumption/refund) |
| `daily_fuel_usage` | Aggregated daily consumption logs |

---

## Business Logic

- **Current Fuel Price** = most recent purchase price for that fuel type
- **Required Fuel** = `distance_km × aircraft.fuel_consumption_rate`
- **Trip Fuel Cost** = `actual_fuel_used × price_per_liter_at_time_of_flight`
- **Remaining Fuel** = `total_purchased − total_allocated` (auto-managed per transaction)
- **Fuel Efficiency** = `actual_fuel_used / required_fuel` (< 1.0 = under budget)
