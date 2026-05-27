import os
import html

files = [
    "backend/app.py",
    "backend/config.py",
    "backend/extensions.py",
    "backend/models.py",
    "backend/blueprints/aircraft.py",
    "backend/blueprints/auth.py",
    "backend/blueprints/daily_usage.py",
    "backend/blueprints/dashboard.py",
    "backend/blueprints/flights.py",
    "backend/blueprints/fuel_purchases.py",
    "backend/blueprints/fuel_transactions.py",
    "backend/blueprints/reports.py",
    "backend/requirements.txt",
    "frontend/package.json",
    "frontend/src/App.js",
    "frontend/src/index.js",
    "frontend/src/index.css",
    "frontend/src/api/client.js",
    "frontend/src/api/services.js",
    "frontend/src/components/Sidebar.js",
    "frontend/src/contexts/AuthContext.js",
    "frontend/src/pages/AircraftPage.js",
    "frontend/src/pages/DailyUsagePage.js",
    "frontend/src/pages/DashboardPage.js",
    "frontend/src/pages/FlightsPage.js",
    "frontend/src/pages/FuelInventoryPage.js",
    "frontend/src/pages/FuelPurchasesPage.js",
    "frontend/src/pages/LoginPage.js",
    "frontend/src/pages/PriceTrendsPage.js",
    "frontend/src/pages/ReportsPage.js",
    "frontend/src/pages/TransactionsPage.js",
    "frontend/src/pages/UsersPage.js",
]

base_path = r"d:\projects\aroplane__fuel"
output_file = os.path.join(base_path, "scratch", "all_code.html")

html_content = """<!DOCTYPE html>
<html>
<head>
<title>Aroplane Fuel Manager Code</title>
<style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; padding: 40px; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
    h2 { color: #e67e22; margin-top: 40px; border-bottom: 1px solid #eee; }
    pre { background: #f8f9fa; border: 1px solid #e1e4e8; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 13px; }
    .file-path { font-weight: bold; color: #2980b9; }
</style>
</head>
<body>
<h1>Aroplane Fuel Manager - Full Project Code</h1>
"""

for f in files:
    full_path = os.path.join(base_path, f)
    if os.path.exists(full_path):
        html_content += f"<h2>File: <span class='file-path'>{f}</span></h2>\n"
        try:
            with open(full_path, "r", encoding="utf-8") as infile:
                content = infile.read()
                html_content += f"<pre>{html.escape(content)}</pre>\n"
        except Exception as e:
            html_content += f"<p style='color:red'>Error reading file: {e}</p>\n"
    else:
        html_content += f"<h2>File: <span class='file-path'>{f}</span> (Not Found)</h2>\n"

html_content += "</body></html>"

with open(output_file, "w", encoding="utf-8") as out:
    out.write(html_content)

print(f"Code collated into {output_file}")
