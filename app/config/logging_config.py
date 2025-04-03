import logging
import os
import sys
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    log_level = os.environ.get('LOG_LEVEL', 'INFO')
    log_format = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(module)s - %(funcName)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Get the logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level))
    
    # Clear existing handlers to avoid duplicate logs
    if logger.handlers:
        logger.handlers.clear()
    
    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)
    
    # Check if we can write to a log file
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        try:
            os.makedirs(log_dir)
        except Exception as e:
            app.logger.warning(f"Could not create logs directory: {e}")
    
    try:
        # Add file handler
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'app.log'),
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(log_format)
        logger.addHandler(file_handler)
    except Exception as e:
        app.logger.warning(f"Could not set up file logging: {e}")
    
    # Set Werkzeug logger level
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    
    return logger