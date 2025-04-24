from cryptography.fernet import Fernet
from base64 import b64encode, b64decode
import os
from flask import current_app

class HealthDataEncryption:
    def __init__(self):
        self.key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
        self.cipher_suite = Fernet(self.key)
    
    def encrypt_value(self, value):
        """Encrypt a health metric value"""
        if isinstance(value, (int, float)):
            value = str(value)
        return b64encode(self.cipher_suite.encrypt(value.encode())).decode()
    
    def decrypt_value(self, encrypted_value):
        """Decrypt a health metric value"""
        try:
            decrypted = self.cipher_suite.decrypt(b64decode(encrypted_value))
            return float(decrypted.decode())
        except:
            return None
    
    def encrypt_metric(self, metric):
        """Encrypt sensitive health metric data"""
        if metric.metric_type in ['blood_pressure', 'blood_sugar', 'weight']:
            metric.value = self.encrypt_value(metric.value)
            metric.encrypted = True
        return metric
    
    def decrypt_metric(self, metric):
        """Decrypt sensitive health metric data"""
        if hasattr(metric, 'encrypted') and metric.encrypted:
            metric.value = self.decrypt_value(metric.value)
        return metric

# Initialize encryption
encryption = HealthDataEncryption() 