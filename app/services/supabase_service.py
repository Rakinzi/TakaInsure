import os
from supabase import create_client
import logging
import json

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_client():
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

supabase = get_supabase_client()

def store_user_data(user_data):
    if not supabase:
        logger.error("Cannot store user data: Supabase client is not initialized")
        return None
    
    # Mask sensitive data in logs
    safe_data = user_data.copy()
    if 'national_id' in safe_data:
        id_value = safe_data['national_id']
        if id_value and len(str(id_value)) > 4:
            safe_data['national_id'] = '****' + str(id_value)[-4:]
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
    logger.info(f"Validating date of birth: {dob}")
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