import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('health_metrics.db')
    c = conn.cursor()
    
    # Create users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Create health_metrics table
    c.execute('''CREATE TABLE IF NOT EXISTS health_metrics
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  metric_type TEXT NOT NULL,
                  value REAL NOT NULL,
                  unit TEXT NOT NULL,
                  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  notes TEXT,
                  FOREIGN KEY (user_id) REFERENCES users (id))''')
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect('health_metrics.db')
    conn.row_factory = sqlite3.Row
    return conn 