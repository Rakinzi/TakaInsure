from flask import Flask, request, g
import time
import logging
import os

try:
    from app.config.logging_config import setup_logging
except ImportError:
    # If the config module doesn't exist yet
    os.makedirs('app/config', exist_ok=True)
    with open('app/config/__init__.py', 'w') as f:
        f.write('# Config package\n')

def create_app():
    app = Flask(__name__)
    
    # Set up logging
    logger = setup_logging(app)
    
    # Request logging middleware
    @app.before_request
    def before_request():
        g.start_time = time.time()
        logger.info(f"Request started: {request.method} {request.path} - IP: {request.remote_addr}")
        if request.is_json:
            logger.debug(f"JSON Request data: {request.get_json()}")
        elif request.form:
            # Log Twilio form data while masking sensitive info
            safe_form = dict(request.form)
            if 'Body' in safe_form:
                logger.info(f"WhatsApp message received: {safe_form['Body']}")
            if 'From' in safe_form:
                # Mask the phone number except last 4 digits
                from_value = safe_form['From']
                if isinstance(from_value, str) and len(from_value) > 4:
                    safe_form['From'] = '****' + from_value[-4:]
            logger.debug(f"Form data: {safe_form}")
        
        if request.files:
            logger.info(f"Files included in request: {list(request.files.keys())}")
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            elapsed_time = round((time.time() - g.start_time) * 1000, 2)
            logger.info(f"Request completed: {request.method} {request.path} - Status: {response.status_code} - Duration: {elapsed_time}ms")
        return response
    
    # Error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception(f"Unhandled exception: {str(e)}")
        return "Internal server error", 500
    
    # Register blueprints
    from app.blueprints.whatsapp import whatsapp_bp
    from app.blueprints.car_damage import car_damage_bp
    from app.blueprints.car_recognition import car_recognition_bp
    
    app.register_blueprint(whatsapp_bp, url_prefix='/api/whatsapp')
    app.register_blueprint(car_damage_bp, url_prefix='/api/car-damage')
    app.register_blueprint(car_recognition_bp, url_prefix='/api/car-recognition')
    
    @app.route('/')
    def index():
        logger.info("Root endpoint accessed")
        return "Insurance API is running!"
    
    logger.info("Application initialized successfully")
    return app