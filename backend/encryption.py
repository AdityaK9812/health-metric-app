from cryptography.fernet import Fernet
from base64 import b64encode, b64decode
import os
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class HealthDataEncryption:
    def __init__(self):
        self.key = os.getenv('ENCRYPTION_KEY')
        if not self.key:
            logger.warning("No encryption key found in environment, generating new key")
            self.key = Fernet.generate_key()
        self.cipher_suite = Fernet(self.key)
    
    def encrypt_value(self, value):
        """Encrypt a health metric value"""
        try:
            if isinstance(value, (int, float)):
                value = str(value)
            return b64encode(self.cipher_suite.encrypt(value.encode())).decode()
        except Exception as e:
            logger.error(f"Error encrypting value: {str(e)}")
            raise
    
    def decrypt_value(self, encrypted_value):
        """Decrypt a health metric value"""
        try:
            decrypted = self.cipher_suite.decrypt(b64decode(encrypted_value))
            return float(decrypted.decode())
        except Exception as e:
            logger.error(f"Error decrypting value: {str(e)}")
            raise
    
    def encrypt_metric(self, metric):
        """Encrypt sensitive health metric data"""
        if metric.metric_type in ['blood_pressure', 'blood_sugar', 'weight']:
            try:
                metric.value = self.encrypt_value(metric.value)
                metric.encrypted = True
            except Exception as e:
                logger.error(f"Failed to encrypt metric {metric.id}: {str(e)}")
                raise
        return metric
    
    def decrypt_metric(self, metric):
        """Decrypt sensitive health metric data"""
        if getattr(metric, 'encrypted', False):
            try:
                metric.value = self.decrypt_value(metric.value)
                metric.encrypted = False
            except Exception as e:
                logger.error(f"Failed to decrypt metric {metric.id}: {str(e)}")
                raise
        return metric

# Initialize encryption
encryption = HealthDataEncryption() 