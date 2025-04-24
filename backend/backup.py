import os
import shutil
from datetime import datetime
import sqlite3
from flask import current_app

class DatabaseBackup:
    def __init__(self, app=None):
        self.app = app
        self.backup_dir = None
        self.aws_access_key = None
        self.aws_secret_key = None
        self.s3_bucket = None
        self.use_s3 = False
        
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        self.backup_dir = os.path.join(app.root_path, 'backups')
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY')
        self.aws_secret_key = os.getenv('AWS_SECRET_KEY')
        self.s3_bucket = os.getenv('S3_BACKUP_BUCKET')
        
        # Create backup directory if it doesn't exist
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
            
        # Check if S3 backup is configured
        self.use_s3 = all([self.aws_access_key, self.aws_secret_key, self.s3_bucket])
    
    def create_backup(self):
        """Create a backup of the database"""
        try:
            # Get database path
            db_path = current_app.config['DATABASE']
            
            # Create backup filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'health_metrics_{timestamp}.db'
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            # Copy database file
            shutil.copy2(db_path, backup_path)
            
            # Upload to S3 if configured
            if self.use_s3:
                try:
                    import boto3
                    from botocore.exceptions import ClientError
                    
                    s3_client = boto3.client(
                        's3',
                        aws_access_key_id=self.aws_access_key,
                        aws_secret_access_key=self.aws_secret_key
                    )
                    
                    s3_client.upload_file(
                        backup_path,
                        self.s3_bucket,
                        f'backups/{backup_filename}'
                    )
                except ImportError:
                    current_app.logger.warning("boto3 not available, skipping S3 upload")
                except ClientError as e:
                    current_app.logger.error(f"S3 upload failed: {str(e)}")
            
            return backup_path
        except Exception as e:
            current_app.logger.error(f"Backup failed: {str(e)}")
            return None
    
    def restore_backup(self, backup_path):
        """Restore database from backup"""
        try:
            db_path = current_app.config['DATABASE']
            
            # Create a backup of current database before restore
            self.create_backup()
            
            # Copy backup to database location
            shutil.copy2(backup_path, db_path)
            
            return True
        except Exception as e:
            current_app.logger.error(f"Restore failed: {str(e)}")
            return False
    
    def list_backups(self):
        """List all available backups"""
        backups = []
        for filename in os.listdir(self.backup_dir):
            if filename.endswith('.db'):
                file_path = os.path.join(self.backup_dir, filename)
                backups.append({
                    'filename': filename,
                    'path': file_path,
                    'size': os.path.getsize(file_path),
                    'created_at': datetime.fromtimestamp(os.path.getctime(file_path))
                })
        return sorted(backups, key=lambda x: x['created_at'], reverse=True)

backup_system = DatabaseBackup() 