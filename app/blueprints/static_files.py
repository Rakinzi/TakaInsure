# app/blueprints/static_files.py
from flask import Blueprint, send_from_directory
import os
import logging

logger = logging.getLogger(__name__)

static_files_bp = Blueprint('static_files', __name__)

@static_files_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    """
    Serve files from the uploads directory
    """
    try:
        # Get the base directory (root of the application)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_folder = os.path.join(base_dir, 'uploads')
        
        logger.info(f"Serving file: {filename} from uploads folder")
        return send_from_directory(uploads_folder, filename)
    except Exception as e:
        logger.exception(f"Error serving uploaded file {filename}: {str(e)}")
        return f"Error serving file: {str(e)}", 500