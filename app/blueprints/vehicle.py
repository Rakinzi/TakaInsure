from flask import Blueprint, request, jsonify
import os
import uuid
import json
import logging
from datetime import datetime
from app.services.blockchain_service import register_vehicle_on_blockchain
from app.services.image_processing import process_car_image, process_plate_image

logger = logging.getLogger(__name__)

vehicle_bp = Blueprint('vehicle', __name__)

# Directory to store uploaded images
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'vehicles')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@vehicle_bp.route('/register', methods=['POST'])
def register_vehicle():
    """
    Register a vehicle with images and metadata
    """
    try:
        # Extract form data
        plate_number = request.form.get('plate_number')
        car_make = request.form.get('car_make')
        car_model = request.form.get('car_model')
        car_year = request.form.get('car_year')
        
        # Validate required fields
        if not plate_number or not car_make or not car_model:
            logger.warning("Missing required vehicle registration fields")
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        # Generate unique vehicle ID
        vehicle_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create vehicle folder
        vehicle_folder = os.path.join(UPLOAD_FOLDER, vehicle_id)
        os.makedirs(vehicle_folder, exist_ok=True)
        
        # Process car image if provided
        car_image_url = None
        if 'car_image' in request.files:
            car_file = request.files['car_image']
            if car_file.filename:
                car_image_path = os.path.join(vehicle_folder, f"car_{vehicle_id}.jpg")
                car_file.save(car_image_path)
                car_image_url = f"/api/vehicle/image/{vehicle_id}/car"
                
                # Process car image for make/model verification (could be used to confirm user input)
                car_detection_result = process_car_image(car_image_path)
                logger.info(f"Car detection result: {car_detection_result}")
        
        # Process plate image if provided
        plate_image_url = None
        if 'plate_image' in request.files:
            plate_file = request.files['plate_image']
            if plate_file.filename:
                plate_image_path = os.path.join(vehicle_folder, f"plate_{vehicle_id}.jpg")
                plate_file.save(plate_image_path)
                plate_image_url = f"/api/vehicle/image/{vehicle_id}/plate"
                
                # Process plate image for verification
                plate_detection_result = process_plate_image(plate_image_path)
                logger.info(f"Plate detection result: {plate_detection_result}")
        
        # Create metadata for the vehicle
        vehicle_data = {
            "id": vehicle_id,
            "plateNumber": plate_number,
            "carMake": car_make,
            "carModel": car_model,
            "carYear": car_year,
            "timestamp": timestamp,
            "carImageUrl": car_image_url,
            "plateImageUrl": plate_image_url
        }
        
        # Save metadata to JSON file
        metadata_path = os.path.join(vehicle_folder, "metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(vehicle_data, f)
        
        # Register vehicle on blockchain
        try:
            blockchain_reference = register_vehicle_on_blockchain(vehicle_data)
            vehicle_data["blockchainReference"] = blockchain_reference
            
            # Update metadata JSON with blockchain reference
            with open(metadata_path, 'w') as f:
                json.dump(vehicle_data, f)
                
            logger.info(f"Vehicle {vehicle_id} registered with blockchain reference {blockchain_reference}")
        except Exception as blockchain_error:
            logger.error(f"Blockchain registration error: {str(blockchain_error)}")
            # Continue without blockchain reference - can be added later
        
        # Return success response
        return jsonify({
            "success": True,
            "vehicleId": vehicle_id,
            "blockchainReference": vehicle_data.get("blockchainReference"),
            "message": "Vehicle registered successfully"
        })
        
    except Exception as e:
        logger.exception(f"Error registering vehicle: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/list', methods=['GET'])
def list_vehicles():
    """
    Get a list of all vehicles for a user
    """
    try:
        # In a real app, you would get the user ID from authentication
        # and filter vehicles by user
        
        vehicles = []
        
        # Scan the upload folder for vehicle directories
        for vehicle_id in os.listdir(UPLOAD_FOLDER):
            vehicle_dir = os.path.join(UPLOAD_FOLDER, vehicle_id)
            if os.path.isdir(vehicle_dir):
                # Load metadata
                metadata_path = os.path.join(vehicle_dir, "metadata.json")
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        vehicle_data = json.load(f)
                        vehicles.append(vehicle_data)
        
        return jsonify({"success": True, "vehicles": vehicles})
        
    except Exception as e:
        logger.exception(f"Error listing vehicles: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/<vehicle_id>', methods=['GET'])
def get_vehicle(vehicle_id):
    """
    Get a specific vehicle by ID
    """
    try:
        vehicle_dir = os.path.join(UPLOAD_FOLDER, vehicle_id)
        if not os.path.isdir(vehicle_dir):
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        # Load metadata
        metadata_path = os.path.join(vehicle_dir, "metadata.json")
        if not os.path.exists(metadata_path):
            return jsonify({"success": False, "error": "Vehicle metadata not found"}), 404
            
        with open(metadata_path, 'r') as f:
            vehicle_data = json.load(f)
        
        return jsonify({"success": True, "vehicle": vehicle_data})
        
    except Exception as e:
        logger.exception(f"Error getting vehicle {vehicle_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/image/<vehicle_id>/<image_type>', methods=['GET'])
def get_vehicle_image(vehicle_id, image_type):
    """
    Get a vehicle image (car or plate)
    """
    try:
        if image_type not in ['car', 'plate']:
            return jsonify({"success": False, "error": "Invalid image type"}), 400
            
        vehicle_dir = os.path.join(UPLOAD_FOLDER, vehicle_id)
        if not os.path.isdir(vehicle_dir):
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        image_path = os.path.join(vehicle_dir, f"{image_type}_{vehicle_id}.jpg")
        if not os.path.exists(image_path):
            return jsonify({"success": False, "error": "Image not found"}), 404
        
        # In a real implementation, you'd return the actual image file
        # For now, we'll return a success message with the path
        return jsonify({
            "success": True,
            "imageUrl": f"/uploads/vehicles/{vehicle_id}/{image_type}_{vehicle_id}.jpg"
        })
        
    except Exception as e:
        logger.exception(f"Error getting vehicle image: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500