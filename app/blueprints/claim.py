# app/blueprints/claim.py
from flask import Blueprint, request, jsonify
import uuid
import os
import logging
import json
from datetime import datetime

from app.services.supabase_service import (
    create_claim,
    get_claim_by_id,
    get_claims_by_policyholder,
    update_claim_status
)
from app.services.file_upload_service import (
    save_claim_image,
    get_file_url,
    delete_file
)
from app.services.image_processing import process_car_image, detect_objects_in_image

logger = logging.getLogger(__name__)

claim_bp = Blueprint('claim', __name__)

@claim_bp.route('/upload-image', methods=['POST'])
def upload_claim_image():
    """
    Upload a claim evidence image
    Returns the URL of the uploaded image
    """
    try:
        # Extract form data
        claim_id = request.form.get('claim_id')
        image_index = request.form.get('image_index', '0')
        
        # If claim_id is not provided, generate a temporary ID
        if not claim_id:
            claim_id = f"temp_{uuid.uuid4()}"
            
        # Validate that a file was uploaded
        if 'file' not in request.files:
            logger.warning("No file part in the request")
            return jsonify({"success": False, "error": "No file part"}), 400
            
        file = request.files['file']
        if file.filename == '':
            logger.warning("No selected file")
            return jsonify({"success": False, "error": "No selected file"}), 400
        
        # Process and save the file
        image_url = save_claim_image(file, claim_id, int(image_index))
        
        if not image_url:
            logger.error(f"Failed to save claim image for {claim_id}")
            return jsonify({"success": False, "error": "Failed to save image"}), 500
        
        # Return the URL path to the file
        return jsonify({
            "success": True,
            "imageUrl": image_url,
            "claimId": claim_id
        })
        
    except Exception as e:
        logger.exception(f"Error uploading claim image: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@claim_bp.route('/create', methods=['POST'])
def create_new_claim():
    """
    Create a new claim with evidence
    """
    try:
        # Extract JSON data
        data = request.get_json()
        
        if not data:
            logger.warning("No data provided for claim creation")
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Extract required fields
        policyholder_id = data.get('policyholderId')
        policy_id = data.get('policyId')
        incident_date = data.get('incidentDate')
        incident_location = data.get('incidentLocation')
        incident_description = data.get('incidentDescription')
        evidence_urls = data.get('evidenceUrls', [])
        claim_amount = data.get('claimAmount')
        vehicle_id = data.get('vehicleId')
        
        # Validate required fields
        if not policyholder_id or not incident_date:
            logger.warning("Missing required fields for claim creation")
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        # Create claim in Supabase
        claim_id = create_claim(
            policyholder_id=policyholder_id,
            policy_id=policy_id,
            incident_date=incident_date,
            incident_location=incident_location,
            incident_description=incident_description,
            claim_amount=claim_amount,
            vehicle_id=vehicle_id,
            evidence_urls=evidence_urls
        )
        
        if not claim_id:
            logger.error("Failed to create claim in Supabase")
            return jsonify({"success": False, "error": "Failed to create claim"}), 500
        
        # Return success response
        return jsonify({
            "success": True,
            "claimId": claim_id,
            "message": "Claim created successfully"
        })
        
    except Exception as e:
        logger.exception(f"Error creating claim: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@claim_bp.route('/<claim_id>', methods=['GET'])
def get_claim(claim_id):
    """
    Get a specific claim by ID
    """
    try:
        # Validate UUID format
        try:
            claim_uuid = uuid.UUID(claim_id)
            claim_id = str(claim_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Claim ID format - must be a valid UUID"}), 400
        
        # Get claim from Supabase
        claim = get_claim_by_id(claim_id)
        
        if not claim:
            return jsonify({"success": False, "error": "Claim not found"}), 404
        
        # Return success response
        return jsonify({
            "success": True,
            "claim": claim
        })
        
    except Exception as e:
        logger.exception(f"Error getting claim {claim_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@claim_bp.route('/list', methods=['GET'])
def list_claims():
    """
    Get a list of all claims for a user
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
        
        # Get claims from Supabase
        claims = get_claims_by_policyholder(policyholder_id)
        
        # Return success response
        return jsonify({
            "success": True,
            "claims": claims
        })
        
    except Exception as e:
        logger.exception(f"Error listing claims: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@claim_bp.route('/<claim_id>/status', methods=['PUT'])
def update_claim(claim_id):
    """
    Update a claim's status
    """
    try:
        # Extract JSON data
        data = request.get_json()
        
        if not data:
            logger.warning("No data provided for claim status update")
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Extract required fields
        new_status = data.get('status')
        notes = data.get('notes')
        
        # Validate required fields
        if not new_status:
            logger.warning("Missing status for claim update")
            return jsonify({"success": False, "error": "Missing status"}), 400
        
        # Validate UUID format
        try:
            claim_uuid = uuid.UUID(claim_id)
            claim_id = str(claim_uuid)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid Claim ID format - must be a valid UUID"}), 400
        
        # Update claim status in Supabase
        result = update_claim_status(claim_id, new_status, notes)
        
        if not result:
            logger.error(f"Failed to update claim {claim_id} status to {new_status}")
            return jsonify({"success": False, "error": "Failed to update claim status"}), 500
        
        # Return success response
        return jsonify({
            "success": True,
            "message": f"Claim status updated to {new_status}"
        })
        
    except Exception as e:
        logger.exception(f"Error updating claim {claim_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@claim_bp.route('/analyze-image', methods=['POST'])
def analyze_claim_image():
    """
    Analyze a claim image for damage assessment
    """
    try:
        # Validate that a file was uploaded
        if 'file' not in request.files:
            logger.warning("No file part in the request")
            return jsonify({"success": False, "error": "No file part"}), 400
            
        file = request.files['file']
        if file.filename == '':
            logger.warning("No selected file")
            return jsonify({"success": False, "error": "No selected file"}), 400
        
        # Generate a temporary file path
        temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'temp')
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        temp_file_path = os.path.join(temp_dir, f"temp_{uuid.uuid4()}.jpg")
        
        # Save the file temporarily
        file.save(temp_file_path)
        
        # First try to detect objects in the image
        objects_result = detect_objects_in_image(temp_file_path)
        
        # Check if any car was detected
        car_detected = False
        if "objects" in objects_result:
            for obj in objects_result["objects"]:
                if obj["class"] == "car":
                    car_detected = True
                    break
        
        # If car was detected, process the image for car damage
        damage_result = None
        if car_detected:
            # Get car damage API endpoint
            try:
                from app.blueprints.car_damage import detection
                
                # Reopen the file and pass it to the car damage API
                with open(temp_file_path, 'rb') as f:
                    damage_result = detection(f)
            except ImportError:
                logger.warning("Car damage module not available, using car_damage API endpoint")
                # This is a fallback if the car_damage blueprint is not directly importable
                try:
                    # Save file to memory for re-upload
                    from io import BytesIO
                    import requests
                    
                    memory_file = BytesIO()
                    with open(temp_file_path, 'rb') as f:
                        memory_file.write(f.read())
                    memory_file.seek(0)
                    
                    # Use requests to call the API endpoint
                    url = request.host_url.rstrip('/') + '/api/car-damage/detection'
                    files = {'file': (file.filename, memory_file, file.content_type)}
                    damage_response = requests.post(url, files=files)
                    
                    if damage_response.status_code == 200:
                        damage_result = damage_response.json()
                except Exception as e:
                    logger.exception(f"Error calling car damage API: {str(e)}")
        
        # Clean up the temporary file
        try:
            os.remove(temp_file_path)
        except Exception as e:
            logger.warning(f"Failed to clean up temporary file: {str(e)}")
        
        # Process results to determine severity and cost
        severity = "minor"
        estimated_cost = 500
        affected_areas = []
        
        if damage_result:
            # Extract detected damage classes
            if "classes" in damage_result and damage_result["classes"]:
                affected_areas = damage_result["classes"]
            
            # Determine severity based on number and type of damages
            if len(affected_areas) >= 3:
                severity = "severe"
            elif len(affected_areas) >= 1:
                severity = "moderate"
            
            # Estimate cost based on damage types
            cost_map = {
                'damaged door': 1200,
                'damaged window': 800,
                'damaged headlight': 600,
                'damaged mirror': 400,
                'dent': 700,
                'damaged hood': 1500,
                'damaged bumper': 1800,
                'damaged wind shield': 2000
            }
            
            base_cost = 500
            for area in affected_areas:
                base_cost += cost_map.get(area, 500)
            
            estimated_cost = base_cost
        
        # Return analysis results
        return jsonify({
            "success": True,
            "severity": severity,
            "estimatedCost": estimated_cost,
            "affectedAreas": affected_areas,
            "carDetected": car_detected,
            "rawDetection": damage_result
        })
        
    except Exception as e:
        logger.exception(f"Error analyzing claim image: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500