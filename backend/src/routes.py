from flask import Blueprint, request, jsonify
from .models import db, User, HealthMetric
from datetime import datetime

api = Blueprint('api', __name__)

@api.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    new_user = User(
        username=data['username'],
        email=data['email']
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User created successfully", "user_id": new_user.id}), 201

@api.route('/metrics', methods=['POST'])
def add_metric():
    data = request.get_json()
    new_metric = HealthMetric(
        user_id=data['user_id'],
        metric_type=data['metric_type'],
        value=data['value'],
        unit=data['unit'],
        notes=data.get('notes', '')
    )
    db.session.add(new_metric)
    db.session.commit()
    return jsonify({"message": "Metric added successfully", "metric_id": new_metric.id}), 201

@api.route('/metrics/<int:user_id>', methods=['GET'])
def get_user_metrics(user_id):
    metrics = HealthMetric.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': m.id,
        'metric_type': m.metric_type,
        'value': m.value,
        'unit': m.unit,
        'recorded_at': m.recorded_at.isoformat(),
        'notes': m.notes
    } for m in metrics]), 200 