import os
import uuid
import logging
from werkzeug.utils import secure_filename
from flask import current_app, url_for
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Create upload directories
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
VEHICLE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'vehicles')
CLAIM_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'claims')
PROFILE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'profiles')

# Create directories if they don't exist
for folder in [UPLOAD_FOLDER, VEHICLE_UPLOAD_FOLDER, CLAIM_UPLOAD_FOLDER, PROFILE_UPLOAD_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """Check if the file has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_image_dimensions(file_stream):
    """Get image dimensions without saving the file"""
    try:
        img = Image.open(file_stream)
        width, height = img.size
        file_stream.seek(0)  # Reset file pointer to beginning
        return width, height
    except Exception as e:
        logger.error(f"Error getting image dimensions: {str(e)}")
        file_stream.seek(0)  # Reset file pointer to beginning
        return None, None

def compress_image(file_stream, max_size_kb=500, quality=85):
    """Compress an image to reduce size while maintaining quality"""
    try:
        # Open image and convert to RGB if needed
        img = Image.open(file_stream)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Create an in-memory byte stream
        output = io.BytesIO()
        
        # Save image with compression
        img.save(output, format='JPEG', quality=quality, optimize=True)
        
        # Check size and reduce quality if needed
        while output.tell() > max_size_kb * 1024 and quality > 30:
            output = io.BytesIO()
            quality -= 10
            img.save(output, format='JPEG', quality=quality, optimize=True)
        
        output.seek(0)
        return output
    except Exception as e:
        logger.error(f"Error compressing image: {str(e)}")
        file_stream.seek(0)  # Reset the original file pointer to beginning
        return file_stream

def save_vehicle_image(file, vehicle_id, image_type='car'):
    """
    Save a vehicle image to the filesystem
    
    Args:
        file: The uploaded file
        vehicle_id: The ID of the vehicle
        image_type: Either 'car' or 'plate'
        
    Returns:
        The URL path to the saved file
    """
    try:
        if not file or file.filename == '':
            logger.warning(f"No {image_type} image provided for vehicle {vehicle_id}")
            return None
            
        if not allowed_file(file.filename):
            logger.warning(f"Invalid file format for {image_type} image: {file.filename}")
            return None
        
        # Create a unique filename
        sanitized_filename = secure_filename(file.filename)
        extension = sanitized_filename.rsplit('.', 1)[1].lower()
        filename = f"{vehicle_id}_{image_type}.{extension}"
        
        # Create a folder for the vehicle if it doesn't exist
        vehicle_folder = os.path.join(VEHICLE_UPLOAD_FOLDER, str(vehicle_id))
        if not os.path.exists(vehicle_folder):
            os.makedirs(vehicle_folder)
        
        # Get image dimensions and compress if needed
        width, height = get_image_dimensions(file)
        if width and height and (width > 1200 or height > 1200 or file.tell() > 1000 * 1024):
            logger.info(f"Compressing large image: {width}x{height}")
            file = compress_image(file)
        else:
            file.seek(0)  # Reset file pointer to beginning
        
        # Save the file
        file_path = os.path.join(vehicle_folder, filename)
        with open(file_path, 'wb') as f:
            f.write(file.read())
        
        logger.info(f"Saved {image_type} image for vehicle {vehicle_id}: {file_path}")
        
        # Return the URL path to the file (relative to the server)
        return f"/uploads/vehicles/{vehicle_id}/{filename}"
    except Exception as e:
        logger.exception(f"Error saving {image_type} image for vehicle {vehicle_id}: {str(e)}")
        return None

def save_claim_image(file, claim_id, image_index=0):
    """
    Save a claim evidence image to the filesystem
    
    Args:
        file: The uploaded file
        claim_id: The ID of the claim
        image_index: Index of the image (for multiple images per claim)
        
    Returns:
        The URL path to the saved file
    """
    try:
        if not file or file.filename == '':
            logger.warning(f"No image provided for claim {claim_id}")
            return None
            
        if not allowed_file(file.filename):
            logger.warning(f"Invalid file format for claim image: {file.filename}")
            return None
        
        # Create a unique filename
        sanitized_filename = secure_filename(file.filename)
        extension = sanitized_filename.rsplit('.', 1)[1].lower()
        filename = f"{claim_id}_evidence_{image_index}.{extension}"
        
        # Create a folder for the claim if it doesn't exist
        claim_folder = os.path.join(CLAIM_UPLOAD_FOLDER, str(claim_id))
        if not os.path.exists(claim_folder):
            os.makedirs(claim_folder)
        
        # Get image dimensions and compress if needed
        width, height = get_image_dimensions(file)
        if width and height and (width > 1200 or height > 1200 or file.tell() > 1000 * 1024):
            logger.info(f"Compressing large image: {width}x{height}")
            file = compress_image(file)
        else:
            file.seek(0)  # Reset file pointer to beginning
        
        # Save the file
        file_path = os.path.join(claim_folder, filename)
        with open(file_path, 'wb') as f:
            f.write(file.read())
        
        logger.info(f"Saved image for claim {claim_id}: {file_path}")
        
        # Return the URL path to the file (relative to the server)
        return f"/uploads/claims/{claim_id}/{filename}"
    except Exception as e:
        logger.exception(f"Error saving image for claim {claim_id}: {str(e)}")
        return None

def save_profile_image(file, policyholder_id):
    """
    Save a profile image to the filesystem
    
    Args:
        file: The uploaded file
        policyholder_id: The ID of the policyholder
        
    Returns:
        The URL path to the saved file
    """
    try:
        if not file or file.filename == '':
            logger.warning(f"No profile image provided for policyholder {policyholder_id}")
            return None
            
        if not allowed_file(file.filename):
            logger.warning(f"Invalid file format for profile image: {file.filename}")
            return None
        
        # Create a unique filename
        sanitized_filename = secure_filename(file.filename)
        extension = sanitized_filename.rsplit('.', 1)[1].lower()
        filename = f"{policyholder_id}_profile.{extension}"
        
        # Create a folder for the policyholder if it doesn't exist
        profile_folder = os.path.join(PROFILE_UPLOAD_FOLDER, str(policyholder_id))
        if not os.path.exists(profile_folder):
            os.makedirs(profile_folder)
        
        # Get image dimensions and compress if needed
        width, height = get_image_dimensions(file)
        if width and height and (width > 800 or height > 800 or file.tell() > 500 * 1024):
            logger.info(f"Compressing large profile image: {width}x{height}")
            file = compress_image(file, max_size_kb=300)  # More compression for profile pics
        else:
            file.seek(0)  # Reset file pointer to beginning
        
        # Save the file
        file_path = os.path.join(profile_folder, filename)
        with open(file_path, 'wb') as f:
            f.write(file.read())
        
        logger.info(f"Saved profile image for policyholder {policyholder_id}: {file_path}")
        
        # Return the URL path to the file (relative to the server)
        return f"/uploads/profiles/{policyholder_id}/{filename}"
    except Exception as e:
        logger.exception(f"Error saving profile image for policyholder {policyholder_id}: {str(e)}")
        return None

def delete_file(file_url):
    """
    Delete a file from the filesystem
    
    Args:
        file_url: The URL path to the file
        
    Returns:
        True if the file was deleted, False otherwise
    """
    try:
        if not file_url:
            return False
            
        # Strip any leading / from the URL path
        file_url = file_url.lstrip('/')
        
        # Get the absolute path to the file
        file_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            file_url
        )
        
        # Check if the file exists
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            return False
            
        # Delete the file
        os.remove(file_path)
        logger.info(f"Deleted file: {file_path}")
        
        return True
    except Exception as e:
        logger.exception(f"Error deleting file {file_url}: {str(e)}")
        return False

def get_file_url(relative_path):
    """
    Get the full URL for a relative file path
    
    Args:
        relative_path: The relative path to the file
        
    Returns:
        The full URL to the file
    """
    if not relative_path:
        return None
    
    # Get the base URL from environment or config
    base_url = os.getenv('APP_URL', None)
    
    if base_url:
        # Strip any trailing slash from base URL
        base_url = base_url.rstrip('/')
        # Strip any leading slash from relative path
        relative_path = relative_path.lstrip('/')
        return f"{base_url}/{relative_path}"
    
    # If no base URL is set, try to use Flask's url_for
    try:
        if current_app:
            return url_for('static', filename=relative_path, _external=True)
    except Exception:
        pass
    
    # If all else fails, return the relative path
    return relative_path