from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, User, HealthMetric, UserSession
from auth import token_required, register_user, login_user, logout_user
from encryption import encryption
from backup import backup_system
import os
from dotenv import load_dotenv
import google.generativeai as genai
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///health_metrics.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['DATABASE'] = os.path.join(app.root_path, 'health_metrics.db')

# Initialize Gemini
try:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    logger.info("Initializing Gemini with API key...")
    genai.configure(api_key=api_key)
    
    # List available models
    logger.info("Available models:")
    for m in genai.list_models():
        logger.info(f"- {m.name}")
    
    # Use the latest stable model
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    logger.info("Gemini initialization successful")
except Exception as e:
    logger.error(f"Failed to initialize Gemini: {str(e)}")
    raise

# Initialize extensions
db.init_app(app)
backup_system.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    user, error = register_user(
        data.get('email'),
        data.get('password'),
        data.get('name')
    )
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    result, error = login_user(data.get('email'), data.get('password'))
    
    if error:
        return jsonify({'error': error}), 401
    
    return jsonify(result), 200

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(user):
    token = request.headers['Authorization'].split(" ")[1]
    logout_user(token)
    return jsonify({'message': 'Logged out successfully'}), 200

# Health metrics routes
@app.route('/api/metrics', methods=['POST'])
@token_required
def add_metric(user):
    data = request.get_json()
    
    metric = HealthMetric(
        user_id=user.id,
        metric_type=data['metric_type'],
        value=data['value'],
        unit=data.get('unit'),
        notes=data.get('notes', '')
    )
    
    # Encrypt sensitive data
    metric = encryption.encrypt_metric(metric)
    
    db.session.add(metric)
    db.session.commit()
    
    return jsonify({
        "message": "Metric added successfully",
        "metric_id": metric.id
    }), 201

@app.route('/api/metrics/<int:user_id>', methods=['GET'])
@token_required
def get_user_metrics(user, user_id):
    if user.id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    metrics = HealthMetric.query.filter_by(user_id=user_id).all()
    
    # Decrypt sensitive data
    decrypted_metrics = [encryption.decrypt_metric(metric) for metric in metrics]
    
    return jsonify([metric.to_dict() for metric in decrypted_metrics]), 200

@app.route('/api/metrics/<int:metric_id>', methods=['DELETE'])
@token_required
def delete_metric(user, metric_id):
    metric = HealthMetric.query.get(metric_id)
    
    if not metric or metric.user_id != user.id:
        return jsonify({'error': 'Metric not found or unauthorized'}), 404
    
    db.session.delete(metric)
    db.session.commit()
    
    return jsonify({"message": "Metric deleted successfully"}), 200

# Backup routes
@app.route('/api/backup', methods=['POST'])
@token_required
def create_backup(user):
    if not user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    backup_path = backup_system.create_backup()
    if backup_path:
        return jsonify({
            'message': 'Backup created successfully',
            'path': backup_path
        }), 200
    return jsonify({'error': 'Backup failed'}), 500

@app.route('/api/backup/restore/<path:backup_path>', methods=['POST'])
@token_required
def restore_backup(user, backup_path):
    if not user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if backup_system.restore_backup(backup_path):
        return jsonify({'message': 'Backup restored successfully'}), 200
    return jsonify({'error': 'Restore failed'}), 500

@app.route('/api/backup/list', methods=['GET'])
@token_required
def list_backups(user):
    if not user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    backups = backup_system.list_backups()
    return jsonify(backups), 200

@app.route('/api/chat', methods=['POST'])
@token_required
def chat(user):
    data = request.get_json()
    user_message = data.get('message')
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400
    
    try:
        # Get user's metrics for context
        metrics = HealthMetric.query.filter_by(user_id=user.id).all()
        metrics_context = "\n".join([
            f"{m.metric_type}: {m.value} {m.unit} (recorded at {m.recorded_at})"
            for m in metrics
        ])
        
        # Create prompt with user's metrics context
        prompt = f"""You are a health assistant. The user has the following health metrics:
{metrics_context}

User message: {user_message}

Please provide a helpful response that:
1. Answers the user's question
2. References their health metrics when relevant
3. Provides health advice when appropriate
4. Maintains a friendly and professional tone
"""
        
        try:
            logger.info("Sending request to Gemini...")
            # Get response from Gemini
            response = model.generate_content(prompt)
            
            if not response or not response.text:
                raise Exception("Empty response from Gemini")
            
            logger.info("Successfully received response from Gemini")
            return jsonify({
                'response': response.text
            }), 200
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return jsonify({
                'error': 'Failed to get response from AI',
                'details': str(e)
            }), 500
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
