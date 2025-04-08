import os
import json
import logging
import uuid
from datetime import datetime
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Load Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_client() -> Client:
    """Get a Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase credentials not properly configured")
        return None
    
    try:
        logger.info("Creating Supabase client")
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return client
    except Exception as e:
        logger.exception(f"Failed to create Supabase client: {str(e)}")
        return None

# Initialize Supabase client
supabase = get_supabase_client()

# ================= VEHICLE RELATED FUNCTIONS =================

def register_vehicle_in_supabase(vehicle_data):
    """
    Register a vehicle in Supabase
    Returns the vehicle_id if successful
    """
    if not supabase:
        logger.error("Cannot register vehicle: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Registering vehicle in Supabase")
        
        # Prepare vehicle data - ensure policyholder_id is a UUID
        policyholder_id = vehicle_data.get("policyHolderId")
        if policyholder_id:
            if not isinstance(policyholder_id, uuid.UUID):
                try:
                    # Convert to UUID if string or similar
                    policyholder_id = str(uuid.UUID(str(policyholder_id)))
                except (ValueError, TypeError) as e:
                    logger.error(f"Invalid policyholder_id format: {policyholder_id}")
                    raise ValueError(f"Invalid policyholder_id format: {policyholder_id}")
        
        vehicle_record = {
            "policyholder_id": policyholder_id,
            "plate_number": vehicle_data["plateNumber"],
            "car_make": vehicle_data["carMake"],
            "car_model": vehicle_data["carModel"],
            "car_year": vehicle_data.get("carYear"),
            "car_image_url": vehicle_data.get("carImageUrl"),
            "plate_image_url": vehicle_data.get("plateImageUrl"),
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        # Insert into vehicles table
        response = supabase.table("vehicles").insert(vehicle_record).execute()
        
        # Check for successful insertion
        if response.data and len(response.data) > 0:
            vehicle_id = response.data[0].get('vehicle_id')
            logger.info(f"Successfully registered vehicle with ID: {vehicle_id}")
            return vehicle_id
        else:
            logger.error("Failed to register vehicle in Supabase")
            raise Exception("Failed to register vehicle in Supabase")
    except Exception as e:
        logger.exception(f"Error registering vehicle in Supabase: {str(e)}")
        raise

def get_vehicle_by_id(vehicle_id):
    """
    Get a vehicle by ID from Supabase
    """
    if not supabase:
        logger.error("Cannot get vehicle: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Getting vehicle with ID {vehicle_id} from Supabase")
        
        # Make sure vehicle_id is a valid UUID
        try:
            vehicle_id = str(uuid.UUID(str(vehicle_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid vehicle_id format: {vehicle_id}")
            raise ValueError(f"Invalid vehicle_id format: {vehicle_id}")
        
        response = supabase.table("vehicles").select("*").eq("vehicle_id", vehicle_id).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Successfully retrieved vehicle with ID: {vehicle_id}")
            return response.data[0]
        else:
            logger.warning(f"No vehicle found with ID: {vehicle_id}")
            return None
    except Exception as e:
        logger.exception(f"Error getting vehicle from Supabase: {str(e)}")
        raise

def get_vehicles_by_policyholder(policyholder_id):
    """
    Get all vehicles for a policyholder from Supabase
    """
    if not supabase:
        logger.error("Cannot get vehicles: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Getting vehicles for policyholder {policyholder_id} from Supabase")
        
        # Make sure policyholder_id is a valid UUID
        try:
            policyholder_id = str(uuid.UUID(str(policyholder_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid policyholder_id format: {policyholder_id}")
            raise ValueError(f"Invalid policyholder_id format: {policyholder_id}")
        
        response = supabase.table("vehicles").select("*").eq("policyholder_id", policyholder_id).execute()
        
        if response.data:
            logger.info(f"Retrieved {len(response.data)} vehicles for policyholder {policyholder_id}")
            return response.data
        else:
            logger.info(f"No vehicles found for policyholder {policyholder_id}")
            return []
    except Exception as e:
        logger.exception(f"Error getting vehicles from Supabase: {str(e)}")
        raise

def update_vehicle(vehicle_id, update_data):
    """
    Update a vehicle in Supabase
    """
    if not supabase:
        logger.error("Cannot update vehicle: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Updating vehicle {vehicle_id} in Supabase")
        
        # Make sure vehicle_id is a valid UUID
        try:
            vehicle_id = str(uuid.UUID(str(vehicle_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid vehicle_id format: {vehicle_id}")
            raise ValueError(f"Invalid vehicle_id format: {vehicle_id}")
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = supabase.table("vehicles").update(update_data).eq("vehicle_id", vehicle_id).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Successfully updated vehicle with ID: {vehicle_id}")
            return response.data[0]
        else:
            logger.error(f"Failed to update vehicle {vehicle_id} in Supabase")
            raise Exception(f"Failed to update vehicle {vehicle_id} in Supabase")
    except Exception as e:
        logger.exception(f"Error updating vehicle in Supabase: {str(e)}")
        raise

def delete_vehicle(vehicle_id):
    """
    Delete a vehicle from Supabase
    """
    if not supabase:
        logger.error("Cannot delete vehicle: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Deleting vehicle {vehicle_id} from Supabase")
        
        # Make sure vehicle_id is a valid UUID
        try:
            vehicle_id = str(uuid.UUID(str(vehicle_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid vehicle_id format: {vehicle_id}")
            raise ValueError(f"Invalid vehicle_id format: {vehicle_id}")
        
        response = supabase.table("vehicles").delete().eq("vehicle_id", vehicle_id).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Successfully deleted vehicle with ID: {vehicle_id}")
            return True
        else:
            logger.error(f"Failed to delete vehicle {vehicle_id} from Supabase")
            raise Exception(f"Failed to delete vehicle {vehicle_id} from Supabase")
    except Exception as e:
        logger.exception(f"Error deleting vehicle from Supabase: {str(e)}")
        raise

# ================= POLICY RELATED FUNCTIONS =================

def create_policy(policy_data):
    """
    Create a new insurance policy in Supabase
    Returns the policy_id if successful
    """
    if not supabase:
        logger.error("Cannot create policy: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Creating policy in Supabase")
        
        # Prepare policy data
        policy_record = {
            "policyholder_id": str(uuid.UUID(str(policy_data["policyholderId"]))),
            "product_id": str(uuid.UUID(str(policy_data["productId"]))),
            "coverage_amount": policy_data["coverageAmount"],
            "premium_amount": policy_data["premiumAmount"],
            "start_date": policy_data["startDate"],
            "end_date": policy_data["endDate"],
            "payment_frequency": policy_data.get("paymentFrequency", "monthly"),
            "status": policy_data.get("status", "active"),
            "metadata": json.dumps(policy_data.get("metadata", {})),
            "created_at": datetime.now().isoformat()
        }
        
        # Insert into policy table
        response = supabase.table("policy").insert(policy_record).execute()
        
        # Check for successful insertion
        if response.data and len(response.data) > 0:
            policy_id = response.data[0].get('policy_id')
            logger.info(f"Successfully created policy with ID: {policy_id}")
            
            # If this policy is for a vehicle, create the association
            vehicle_id = policy_data.get("vehicleId")
            if vehicle_id:
                create_vehicle_policy_association(str(uuid.UUID(str(vehicle_id))), policy_id)
            
            return policy_id
        else:
            logger.error("Failed to create policy in Supabase")
            raise Exception("Failed to create policy in Supabase")
    except Exception as e:
        logger.exception(f"Error creating policy in Supabase: {str(e)}")
        raise

def create_vehicle_policy_association(vehicle_id, policy_id):
    """
    Create an association between a vehicle and a policy
    """
    if not supabase:
        logger.error("Cannot create vehicle-policy association: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Creating vehicle-policy association for vehicle {vehicle_id} and policy {policy_id}")
        
        # Validate UUIDs
        vehicle_id = str(uuid.UUID(str(vehicle_id)))
        policy_id = str(uuid.UUID(str(policy_id)))
        
        # Create the association record
        association_record = {
            "vehicle_id": vehicle_id,
            "policy_id": policy_id,
            "created_at": datetime.now().isoformat()
        }
        
        # Insert into vehicle_policies table
        response = supabase.table("vehicle_policies").insert(association_record).execute()
        
        # Check for successful insertion
        if response.data and len(response.data) > 0:
            association_id = response.data[0].get('id')
            logger.info(f"Successfully created vehicle-policy association with ID: {association_id}")
            return association_id
        else:
            logger.error("Failed to create vehicle-policy association in Supabase")
            raise Exception("Failed to create vehicle-policy association in Supabase")
    except Exception as e:
        logger.exception(f"Error creating vehicle-policy association in Supabase: {str(e)}")
        raise

def get_policies_by_policyholder(policyholder_id):
    """
    Get all policies for a policyholder from Supabase
    """
    if not supabase:
        logger.error("Cannot get policies: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Getting policies for policyholder {policyholder_id} from Supabase")
        
        # Make sure policyholder_id is a valid UUID
        try:
            policyholder_id = str(uuid.UUID(str(policyholder_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid policyholder_id format: {policyholder_id}")
            raise ValueError(f"Invalid policyholder_id format: {policyholder_id}")
        
        response = supabase.table("policy").select("*").eq("policyholder_id", policyholder_id).execute()
        
        if response.data:
            logger.info(f"Retrieved {len(response.data)} policies for policyholder {policyholder_id}")
            return response.data
        else:
            logger.info(f"No policies found for policyholder {policyholder_id}")
            return []
    except Exception as e:
        logger.exception(f"Error getting policies from Supabase: {str(e)}")
        raise

def get_policies_by_vehicle(vehicle_id):
    """
    Get all policies associated with a vehicle
    """
    if not supabase:
        logger.error("Cannot get vehicle policies: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Getting policies for vehicle {vehicle_id} from Supabase")
        
        # Make sure vehicle_id is a valid UUID
        try:
            vehicle_id = str(uuid.UUID(str(vehicle_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid vehicle_id format: {vehicle_id}")
            raise ValueError(f"Invalid vehicle_id format: {vehicle_id}")
        
        # First get the policy IDs from the association table
        response = supabase.table("vehicle_policies").select("policy_id").eq("vehicle_id", vehicle_id).execute()
        
        if not response.data or len(response.data) == 0:
            logger.info(f"No policies found for vehicle {vehicle_id}")
            return []
        
        # Extract policy IDs
        policy_ids = [item['policy_id'] for item in response.data]
        
        # Then get the full policy details for those IDs
        policy_response = supabase.table("policy").select("*").in_("policy_id", policy_ids).execute()
        
        if policy_response.data:
            logger.info(f"Retrieved {len(policy_response.data)} policies for vehicle {vehicle_id}")
            return policy_response.data
        else:
            logger.info(f"No policy details found for the associated policy IDs")
            return []
    except Exception as e:
        logger.exception(f"Error getting vehicle policies from Supabase: {str(e)}")
        raise

# ================= USER/POLICYHOLDER RELATED FUNCTIONS =================

def get_user_by_phone(phone_number):
    """
    Look up a user by their phone number
    Returns the user data if found, None otherwise
    """
    if not supabase:
        logger.error("Cannot look up user: Supabase client is not initialized")
        return None
        
    try:
        logger.info(f"Looking up user by phone number")
        # Mask the phone number in logs
        masked_number = '****' + phone_number[-4:] if phone_number and len(phone_number) > 4 else phone_number
        logger.debug(f"Searching for user with phone: {masked_number}")
        
        response = supabase.table("policyholder").select("*").eq("contact_details", phone_number).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"User found with phone number {masked_number}")
            return response.data[0]
        else:
            logger.info(f"No user found with phone number {masked_number}")
            return None
    except Exception as e:
        logger.exception(f"Error looking up user by phone: {str(e)}")
        return None

def store_user_data(user_data):
    """
    Store user data in Supabase
    Returns the policyholder_id if successful
    """
    if not supabase:
        logger.error("Cannot store user data: Supabase client is not initialized")
        return None
    
    # Mask sensitive data in logs
    safe_data = user_data.copy()
    if 'contact_details' in safe_data:
        contact = safe_data['contact_details']
        if contact and len(str(contact)) > 4:
            safe_data['contact_details'] = '****' + str(contact)[-4:]
    
    logger.info("Attempting to store user data in Supabase")
    logger.debug(f"User data to store: {json.dumps(safe_data)}")
    
    try:
        logger.debug("Preparing to insert into policyholder table")
        response = supabase.table("policyholder").insert(user_data).execute()
        
        if not response.data:
            logger.error("Supabase returned no data after insert")
            return None
        
        policyholder_id = response.data[0].get('policyholder_id')
        if policyholder_id:
            logger.info(f"Successfully stored user with ID: {policyholder_id}")
            return policyholder_id
        else:
            logger.error("Policyholder ID not found in Supabase response")
            return None
    except Exception as e:
        logger.exception(f"Supabase Error: {str(e)}")
        
        # Log additional error details if available
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            try:
                error_details = json.loads(e.response.text)
                logger.error(f"Supabase error details: {json.dumps(error_details)}")
            except:
                logger.error(f"Supabase raw error response: {e.response.text}")
                
        return None

def validate_date_of_birth(dob):
    """
    Validate and format a date of birth
    Returns (is_valid, formatted_date)
    """
    logger.info(f"Validating date of birth: {dob}")
    
    # Handle empty input
    if not dob or dob.strip() == "":
        logger.warning("Empty date of birth provided")
        return False, "Please provide a date of birth"
        
    try:
        import datetime
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", 
            "%d-%m-%Y", "%m-%d-%Y", "%d %B %Y", 
            "%B %d %Y"
        ]
        
        for fmt in formats:
            try:
                parsed_date = datetime.datetime.strptime(dob, fmt)
                formatted_date = parsed_date.strftime("%Y-%m-%d")
                logger.info(f"Successfully validated date with format {fmt}: {formatted_date}")
                return True, formatted_date
            except ValueError:
                continue
        
        logger.warning(f"Could not validate date format: {dob}")
        return False, "Invalid date format"
    except Exception as e:
        logger.exception(f"Error validating date: {str(e)}")
        return False, "Invalid date format"

# ================= CLAIM RELATED FUNCTIONS =================

def create_claim(claim_data):
    """
    Create a new claim in Supabase
    Returns the claim_id if successful
    """
    if not supabase:
        logger.error("Cannot create claim: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Creating claim in Supabase")
        
        # Prepare claim data - ensure IDs are valid UUIDs
        try:
            policy_id = str(uuid.UUID(str(claim_data["policyId"])))
            policyholder_id = str(uuid.UUID(str(claim_data["policyholderId"])))
            vehicle_id = claim_data.get("vehicleId")
            if vehicle_id:
                vehicle_id = str(uuid.UUID(str(vehicle_id)))
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid ID format in claim data")
            raise ValueError(f"Invalid ID format in claim data: {str(e)}")
        
        # Prepare evidence URLs as JSON
        evidence_urls = claim_data.get("evidenceUrls", [])
        if not isinstance(evidence_urls, list):
            evidence_urls = []
        
        claim_record = {
            "policy_id": policy_id,
            "policyholder_id": policyholder_id,
            "vehicle_id": vehicle_id,
            "incident_date": claim_data["incidentDate"],
            "incident_location": claim_data.get("incidentLocation"),
            "incident_description": claim_data.get("incidentDescription"),
            "claim_amount": claim_data.get("claimAmount"),
            "claim_status": claim_data.get("claimStatus", "pending"),
            "evidence_urls": json.dumps(evidence_urls),
            "created_at": datetime.now().isoformat()
        }
        
        # Insert into claim table
        response = supabase.table("claim").insert(claim_record).execute()
        
        # Check for successful insertion
        if response.data and len(response.data) > 0:
            claim_id = response.data[0].get('claim_id')
            logger.info(f"Successfully created claim with ID: {claim_id}")
            return claim_id
        else:
            logger.error("Failed to create claim in Supabase")
            raise Exception("Failed to create claim in Supabase")
    except Exception as e:
        logger.exception(f"Error creating claim in Supabase: {str(e)}")
        raise

def get_claims_by_policyholder(policyholder_id):
    """
    Get all claims for a policyholder from Supabase
    """
    if not supabase:
        logger.error("Cannot get claims: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Getting claims for policyholder {policyholder_id} from Supabase")
        
        # Make sure policyholder_id is a valid UUID
        try:
            policyholder_id = str(uuid.UUID(str(policyholder_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid policyholder_id format: {policyholder_id}")
            raise ValueError(f"Invalid policyholder_id format: {policyholder_id}")
        
        response = supabase.table("claim").select("*").eq("policyholder_id", policyholder_id).execute()
        
        if response.data:
            logger.info(f"Retrieved {len(response.data)} claims for policyholder {policyholder_id}")
            return response.data
        else:
            logger.info(f"No claims found for policyholder {policyholder_id}")
            return []
    except Exception as e:
        logger.exception(f"Error getting claims from Supabase: {str(e)}")
        raise

def get_claims_by_vehicle(vehicle_id):
    """
    Get all claims related to a specific vehicle
    """
    if not supabase:
        logger.error("Cannot get vehicle claims: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Getting claims for vehicle {vehicle_id} from Supabase")
        
        # Make sure vehicle_id is a valid UUID
        try:
            vehicle_id = str(uuid.UUID(str(vehicle_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid vehicle_id format: {vehicle_id}")
            raise ValueError(f"Invalid vehicle_id format: {vehicle_id}")
        
        response = supabase.table("claim").select("*").eq("vehicle_id", vehicle_id).execute()
        
        if response.data:
            logger.info(f"Retrieved {len(response.data)} claims for vehicle {vehicle_id}")
            return response.data
        else:
            logger.info(f"No claims found for vehicle {vehicle_id}")
            return []
    except Exception as e:
        logger.exception(f"Error getting vehicle claims from Supabase: {str(e)}")
        raise

def update_claim_status(claim_id, new_status, notes=None):
    """
    Update a claim's status in Supabase
    """
    if not supabase:
        logger.error("Cannot update claim: Supabase client is not initialized")
        raise Exception("Supabase client not initialized")
    
    try:
        logger.info(f"Updating claim {claim_id} status to {new_status} in Supabase")
        
        # Make sure claim_id is a valid UUID
        try:
            claim_id = str(uuid.UUID(str(claim_id)))
        except (ValueError, TypeError):
            logger.error(f"Invalid claim_id format: {claim_id}")
            raise ValueError(f"Invalid claim_id format: {claim_id}")
        
        # Prepare update data
        update_data = {
            "claim_status": new_status,
            "updated_at": datetime.now().isoformat()
        }
        
        # If notes provided, update metadata
        if notes:
            # First get the current claim to access its metadata
            current_claim = supabase.table("claim").select("evidence_urls").eq("claim_id", claim_id).execute()
            
            if current_claim.data and len(current_claim.data) > 0:
                current_metadata = current_claim.data[0].get('evidence_urls', '{}')
                if isinstance(current_metadata, str):
                    try:
                        metadata_obj = json.loads(current_metadata)
                    except json.JSONDecodeError:
                        metadata_obj = {}
                else:
                    metadata_obj = current_metadata
                
                # Add notes to metadata
                if 'notes' not in metadata_obj:
                    metadata_obj['notes'] = []
                
                metadata_obj['notes'].append({
                    'timestamp': datetime.now().isoformat(),
                    'status': new_status,
                    'text': notes
                })
                
                update_data['evidence_urls'] = json.dumps(metadata_obj)
        
        # Update the claim
        response = supabase.table("claim").update(update_data).eq("claim_id", claim_id).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Successfully updated claim {claim_id} status to {new_status}")
            return True
        else:
            logger.error(f"Failed to update claim {claim_id} in Supabase")
            raise Exception(f"Failed to update claim {claim_id} in Supabase")
    except Exception as e:
        logger.exception(f"Error updating claim in Supabase: {str(e)}")
        raise