#!/bin/bash
pip install gunicorn
gunicorn --bind 0.0.0.0:$PORT app:app 