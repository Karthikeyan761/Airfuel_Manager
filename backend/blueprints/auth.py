"""
Authentication Blueprint
Handles user login, registration, and profile management with JWT tokens.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from extensions import db
from models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint.
    Request: { username, password }
    Response: { access_token, user }
    """
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    additional_claims = {'role': user.role, 'email': user.email}
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )

    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Returns the profile of the currently authenticated user."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """List all users (Admin only)."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    """Create a new user (Admin only)."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    required = ['username', 'password', 'role']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Auto-generate email if not provided
    email = data.get('email') or f"{data['username']}@aerofuel.internal"

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        # Try a unique variant
        import time
        email = f"{data['username']}.{int(time.time())}@aerofuel.internal"

    if data['role'] not in ['admin', 'operator']:
        return jsonify({'error': 'Role must be admin or operator'}), 400

    user = User(username=data['username'], email=email, role=data['role'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password for authenticated user."""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current and new password are required'}), 400

    user = User.query.get(int(user_id))
    if not user.check_password(data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 401

    user.set_password(data['new_password'])
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'}), 200
