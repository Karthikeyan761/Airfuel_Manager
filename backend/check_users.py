
import os
from app import create_app
from extensions import db
from models import User

app = create_app()
with app.app_context():
    try:
        users = User.query.all()
        print(f"Total users found: {len(users)}")
        for user in users:
            print(f"Username: {user.username}, Hash: {user.password_hash[:20]}...")
            print(f"Password 'admin123' correct? {user.check_password('admin123')}")
    except Exception as e:
        print(f"Error: {e}")
