from flask import Blueprint, request, jsonify, send_from_directory
import os
import uuid
import json
import logging
from datetime import datetime

from app.services.supabase_service import (
    register_vehicle_in_supabase, 
    get_vehicle_by_id, 
    get_vehicles_by_policyholder,
    update_vehicle,
    delete_vehicle,
    get_policies_by_vehicle
)
from app.services.file_upload_service import (
    save_vehicle_image,
    get_file_url,
    delete_file
)
from app.services.image_processing import process_car_image, process_plate_image

logger = logging.getLogger(__name__)

vehicle_bp = Blueprint('vehicle', __name__)

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
        policyholder_id = request.form.get('policyholder_id')
        
        # Validate required fields
        if not plate_number or not car_make or not car_model:
            logger.warning("Missing required vehicle registration fields")
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        # Generate unique vehicle ID
        vehicle_id = str(uuid.uuid4())
        
        # Process car image if provided
        car_image_url = None
        if 'car_image' in request.files:
            car_file = request.files['car_image']
            if car_file.filename:
                car_image_url = save_vehicle_image(car_file, vehicle_id, 'car')
                
                # Process car image for make/model verification (could be used to confirm user input)
                if car_image_url:
                    # Get the absolute path from the relative URL
                    car_image_path = os.path.join(
                        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                        car_image_url.lstrip('/')
                    )
                    car_detection_result = process_car_image(car_image_path)
                    logger.info(f"Car detection result: {car_detection_result}")
        
        # Process plate image if provided
        plate_image_url = None
        if 'plate_image' in request.files:
            plate_file = request.files['plate_image']
            if plate_file.filename:
                plate_image_url = save_vehicle_image(plate_file, vehicle_id, 'plate')
                
                # Process plate image for verification
                if plate_image_url:
                    # Get the absolute path from the relative URL
                    plate_image_path = os.path.join(
                        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                        plate_image_url.lstrip('/')
                    )
                    plate_detection_result = process_plate_image(plate_image_path)
                    logger.info(f"Plate detection result: {plate_detection_result}")
        
        # Create vehicle data for Supabase
        vehicle_data = {
            "id": vehicle_id,
            "plateNumber": plate_number,
            "carMake": car_make,
            "carModel": car_model,
            "carYear": car_year,
            "carImageUrl": car_image_url,
            "plateImageUrl": plate_image_url,
            "policyHolderId": policyholder_id
        }
        
        # Register vehicle in Supabase
        try:
            supabase_vehicle_id = register_vehicle_in_supabase(vehicle_data)
            
            if supabase_vehicle_id:
                logger.info(f"Vehicle {vehicle_id} registered in Supabase")
                
                # Return success response
                return jsonify({
                    "success": True,
                    "vehicleId": vehicle_id,
                    "message": "Vehicle registered successfully"
                })
            else:
                logger.error(f"Failed to register vehicle in Supabase")
                return jsonify({"success": False, "error": "Failed to register vehicle"}), 500
        except Exception as e:
            logger.error(f"Supabase registration error: {str(e)}")
            
            # Clean up any uploaded files if database registration fails
            if car_image_url:
                delete_file(car_image_url)
            if plate_image_url:
                delete_file(plate_image_url)
                
            return jsonify({"success": False, "error": str(e)}), 500
        
    except Exception as e:
        logger.exception(f"Error registering vehicle: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/list', methods=['GET'])
def list_vehicles():
    """
    Get a list of all vehicles for a user
    """
    try:
        # Get policyholder ID from query parameter
        policyholder_id = request.args.get('policyholder_id')
        
        if not policyholder_id:
            return jsonify({"success": False, "error": "Policyholder ID required"}), 400
            
        # Validate UUID format
        try:
            # Convert to UUID to ensure valid format
            policyholder_uuid = uuid.UUID(policyholder_id)
            # Use the string representation for the query
            policyholder_id = str(policyholder_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Policyholder ID format - must be a valid UUID"}), 400
        
        # Get vehicles from Supabase
        vehicles = get_vehicles_by_policyholder(policyholder_id)
        
        # Format response data
        formatted_vehicles = []
        for vehicle in vehicles:
            # Convert full URLs for images if needed
            car_image_url = get_file_url(vehicle.get('car_image_url')) if vehicle.get('car_image_url') else None
            plate_image_url = get_file_url(vehicle.get('plate_image_url')) if vehicle.get('plate_image_url') else None
            
            formatted_vehicles.append({
                "id": vehicle['vehicle_id'],
                "plateNumber": vehicle['plate_number'],
                "carMake": vehicle['car_make'],
                "carModel": vehicle['car_model'],
                "carYear": vehicle['car_year'],
                "carImageUri": car_image_url,
                "plateImageUri": plate_image_url,
                "timestamp": vehicle['created_at'],
                "status": vehicle['status']
            })
        
        return jsonify({"success": True, "vehicles": formatted_vehicles})
        
    except Exception as e:
        logger.exception(f"Error listing vehicles: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/<vehicle_id>', methods=['GET'])
def get_vehicle(vehicle_id):
    """
    Get a specific vehicle by ID
    """
    try:
        # Validate UUID format
        try:
            vehicle_uuid = uuid.UUID(vehicle_id)
            vehicle_id = str(vehicle_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Vehicle ID format - must be a valid UUID"}), 400
        
        # Get vehicle from Supabase
        vehicle = get_vehicle_by_id(vehicle_id)
        
        if not vehicle:
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        # Convert full URLs for images if needed
        car_image_url = get_file_url(vehicle.get('car_image_url')) if vehicle.get('car_image_url') else None
        plate_image_url = get_file_url(vehicle.get('plate_image_url')) if vehicle.get('plate_image_url') else None
        
        # Get associated policies
        try:
            policies = get_policies_by_vehicle(vehicle_id)
            has_policies = len(policies) > 0
        except Exception:
            has_policies = False
        
        # Format response data
        formatted_vehicle = {
            "id": vehicle['vehicle_id'],
            "plateNumber": vehicle['plate_number'],
            "carMake": vehicle['car_make'],
            "carModel": vehicle['car_model'],
            "carYear": vehicle['car_year'],
            "carImageUri": car_image_url,
            "plateImageUri": plate_image_url,
            "timestamp": vehicle['created_at'],
            "status": vehicle['status'],
            "hasInsurance": has_policies
        }
        
        return jsonify({"success": True, "vehicle": formatted_vehicle})
        
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
        
        # Validate UUID format
        try:
            vehicle_uuid = uuid.UUID(vehicle_id)
            vehicle_id = str(vehicle_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Vehicle ID format - must be a valid UUID"}), 400
        
        # Get vehicle from Supabase
        vehicle = get_vehicle_by_id(vehicle_id)
        
        if not vehicle:
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        # Get image URL based on type
        image_url = vehicle['car_image_url'] if image_type == 'car' else vehicle['plate_image_url']
        
        if not image_url:
            return jsonify({"success": False, "error": "Image not found"}), 404
        
        # Check if the image is a relative path or a full URL
        if image_url.startswith('http'):
            # Return the full URL directly
            return jsonify({
                "success": True,
                "imageUrl": image_url
            })
        else:
            # For relative paths, use get_file_url to get the full URL
            full_url = get_file_url(image_url)
            return jsonify({
                "success": True,
                "imageUrl": full_url
            })
        
    except Exception as e:
        logger.exception(f"Error getting vehicle image: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/<vehicle_id>', methods=['PUT'])
def update_vehicle_info(vehicle_id):
    """
    Update a vehicle's information
    """
    try:
        # Validate UUID format
        try:
            vehicle_uuid = uuid.UUID(vehicle_id)
            vehicle_id = str(vehicle_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Vehicle ID format - must be a valid UUID"}), 400
        
        # Get the existing vehicle
        existing_vehicle = get_vehicle_by_id(vehicle_id)
        if not existing_vehicle:
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        # Get update data from request body
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No update data provided"}), 400
        
        # Prepare update data for Supabase
        update_data = {}
        
        if 'plateNumber' in data:
            update_data['plate_number'] = data['plateNumber']
        if 'carMake' in data:
            update_data['car_make'] = data['carMake']
        if 'carModel' in data:
            update_data['car_model'] = data['carModel']
        if 'carYear' in data:
            update_data['car_year'] = data['carYear']
        if 'status' in data:
            update_data['status'] = data['status']
        
        # Update in Supabase
        updated_vehicle = update_vehicle(vehicle_id, update_data)
        
        if updated_vehicle:
            # Convert full URLs for images if needed
            car_image_url = get_file_url(updated_vehicle.get('car_image_url')) if updated_vehicle.get('car_image_url') else None
            plate_image_url = get_file_url(updated_vehicle.get('plate_image_url')) if updated_vehicle.get('plate_image_url') else None
            
            # Format response data
            formatted_vehicle = {
                "id": updated_vehicle['vehicle_id'],
                "plateNumber": updated_vehicle['plate_number'],
                "carMake": updated_vehicle['car_make'],
                "carModel": updated_vehicle['car_model'],
                "carYear": updated_vehicle['car_year'],
                "carImageUri": car_image_url,
                "plateImageUri": plate_image_url,
                "timestamp": updated_vehicle['created_at'],
                "updatedAt": updated_vehicle['updated_at'],
                "status": updated_vehicle['status']
            }
            
            return jsonify({"success": True, "vehicle": formatted_vehicle})
        else:
            return jsonify({"success": False, "error": "Failed to update vehicle"}), 500
        
    except Exception as e:
        logger.exception(f"Error updating vehicle {vehicle_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/<vehicle_id>/images', methods=['PUT'])
def update_vehicle_images(vehicle_id):
    """
    Update a vehicle's images
    """
    try:
        # Validate UUID format
        try:
            vehicle_uuid = uuid.UUID(vehicle_id)
            vehicle_id = str(vehicle_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Vehicle ID format - must be a valid UUID"}), 400
        
        # Get the existing vehicle
        existing_vehicle = get_vehicle_by_id(vehicle_id)
        if not existing_vehicle:
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        # Process car image if provided
        car_image_url = None
        if 'car_image' in request.files:
            car_file = request.files['car_image']
            if car_file.filename:
                # Delete existing car image if any
                if existing_vehicle.get('car_image_url'):
                    delete_file(existing_vehicle['car_image_url'])
                
                car_image_url = save_vehicle_image(car_file, vehicle_id, 'car')
        
        # Process plate image if provided
        plate_image_url = None
        if 'plate_image' in request.files:
            plate_file = request.files['plate_image']
            if plate_file.filename:
                # Delete existing plate image if any
                if existing_vehicle.get('plate_image_url'):
                    delete_file(existing_vehicle['plate_image_url'])
                
                plate_image_url = save_vehicle_image(plate_file, vehicle_id, 'plate')
        
        # Prepare update data for Supabase
        update_data = {
            'updated_at': datetime.now().isoformat()
        }
        
        if car_image_url:
            update_data['car_image_url'] = car_image_url
        
        if plate_image_url:
            update_data['plate_image_url'] = plate_image_url
        
        # Update in Supabase
        updated_vehicle = update_vehicle(vehicle_id, update_data)
        
        if updated_vehicle:
            # Convert full URLs for images if needed
            car_image_url = get_file_url(updated_vehicle.get('car_image_url')) if updated_vehicle.get('car_image_url') else None
            plate_image_url = get_file_url(updated_vehicle.get('plate_image_url')) if updated_vehicle.get('plate_image_url') else None
            
            # Format response data
            formatted_vehicle = {
                "id": updated_vehicle['vehicle_id'],
                "plateNumber": updated_vehicle['plate_number'],
                "carMake": updated_vehicle['car_make'],
                "carModel": updated_vehicle['car_model'],
                "carYear": updated_vehicle['car_year'],
                "carImageUri": car_image_url,
                "plateImageUri": plate_image_url,
                "timestamp": updated_vehicle['created_at'],
                "updatedAt": updated_vehicle['updated_at'],
                "status": updated_vehicle['status']
            }
            
            return jsonify({"success": True, "vehicle": formatted_vehicle})
        else:
            return jsonify({"success": False, "error": "Failed to update vehicle images"}), 500
        
    except Exception as e:
        logger.exception(f"Error updating vehicle images {vehicle_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@vehicle_bp.route('/<vehicle_id>', methods=['DELETE'])
def delete_vehicle_record(vehicle_id):
    """
    Delete a vehicle record
    """
    try:
        # Validate UUID format
        try:
            vehicle_uuid = uuid.UUID(vehicle_id)
            vehicle_id = str(vehicle_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Vehicle ID format - must be a valid UUID"}), 400
        
        # Get the existing vehicle
        existing_vehicle = get_vehicle_by_id(vehicle_id)
        if not existing_vehicle:
            return jsonify({"success": False, "error": "Vehicle not found"}), 404
        
        # Delete associated images
        if existing_vehicle.get('car_image_url'):
            delete_file(existing_vehicle['car_image_url'])
        
        if existing_vehicle.get('plate_image_url'):
            delete_file(existing_vehicle['plate_image_url'])
        
        # Delete from Supabase
        result = delete_vehicle(vehicle_id)
        
        if result:
            return jsonify({"success": True, "message": "Vehicle deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Failed to delete vehicle"}), 500
        
    except Exception as e:
        logger.exception(f"Error deleting vehicle {vehicle_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# Serve uploaded files
@vehicle_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    """
    Serve uploaded files
    """
    try:
        # Determine the upload folder based on the file path
        if filename.startswith('vehicles/'):
            return send_from_directory(os.path.dirname(VEHICLE_UPLOAD_FOLDER), filename)
        elif filename.startswith('claims/'):
            return send_from_directory(os.path.dirname(CLAIM_UPLOAD_FOLDER), filename)
        elif filename.startswith('profiles/'):
            return send_from_directory(os.path.dirname(PROFILE_UPLOAD_FOLDER), filename)
        else:
            return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        logger.exception(f"Error serving file {filename}: {str(e)}")
        return jsonify({"success": False, "error": "File not found"}), 404