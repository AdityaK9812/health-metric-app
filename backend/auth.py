from datetime import datetime, timedelta
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from models import User, UserSession, db

def generate_token(user_id):
    """Generate a JWT token for the user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            
            if not user or not user.is_active:
                return jsonify({'message': 'Invalid token!'}), 401
                
            # Check if token is in active sessions
            session = UserSession.query.filter_by(
                user_id=user.id,
                token=token,
                is_active=True
            ).first()
            
            if not session or session.expires_at < datetime.utcnow():
                return jsonify({'message': 'Token has expired!'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(user, *args, **kwargs)
    return decorated

def register_user(email, password, name=None):
    """Register a new user"""
    if User.query.filter_by(email=email).first():
        return None, "Email already registered"
    
    user = User(email=email, name=name)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return user, None

def login_user(email, password):
    """Login a user and return token"""
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return None, "Invalid email or password"
    
    if not user.is_active:
        return None, "Account is deactivated"
    
    # Generate token
    token = generate_token(user.id)
    
    # Create session
    session = UserSession(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=1)
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    db.session.add(session)
    db.session.commit()
    
    return {
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name
        }
    }, None

def logout_user(token):
    """Logout a user by deactivating their session"""
    session = UserSession.query.filter_by(token=token).first()
    if session:
        session.is_active = False
        db.session.commit()
    return True 