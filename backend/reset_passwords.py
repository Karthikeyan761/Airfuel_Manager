
from app import create_app
from extensions import db
from models import User

app = create_app()
with app.app_context():
    user = User.query.filter_by(username='admin').first()
    if user:
        user.set_password('admin123')
        db.session.commit()
        print("Admin password reset to 'admin123'")
    else:
        # Create it if missing
        admin = User(username='admin', email='admin@aroplane.com', role='admin')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("Admin user created with 'admin123'")

    user2 = User.query.filter_by(username='operator').first()
    if user2:
        user2.set_password('operator123')
        db.session.commit()
        print("Operator password reset to 'operator123'")
    else:
        op = User(username='operator', email='operator@aroplane.com', role='operator')
        op.set_password('operator123')
        db.session.add(op)
        db.session.commit()
        print("Operator user created with 'operator123'")
