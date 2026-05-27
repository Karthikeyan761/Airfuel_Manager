"""
Aircraft Fuel Cost & Trip Management System - Flask Application
Main application entry point with Blueprint registration
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from extensions import db, ma
from blueprints.auth import auth_bp
from blueprints.aircraft import aircraft_bp
from blueprints.fuel_purchases import fuel_purchases_bp
from blueprints.flights import flights_bp
from blueprints.fuel_transactions import fuel_transactions_bp
from blueprints.daily_usage import daily_usage_bp
from blueprints.dashboard import dashboard_bp
from blueprints.reports import reports_bp


def create_app(config_class=Config):
    """Application factory function."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.url_map.strict_slashes = False

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    JWTManager(app)
    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"], supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(aircraft_bp, url_prefix='/api/aircraft')
    app.register_blueprint(fuel_purchases_bp, url_prefix='/api/fuel-purchases')
    app.register_blueprint(flights_bp, url_prefix='/api/flights')
    app.register_blueprint(fuel_transactions_bp, url_prefix='/api/fuel-transactions')
    app.register_blueprint(daily_usage_bp, url_prefix='/api/daily-usage')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Aircraft Fuel Management API is running'}

    with app.app_context():
        db.create_all()
        # Seed initial data
        from seed import seed_initial_data
        seed_initial_data()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
