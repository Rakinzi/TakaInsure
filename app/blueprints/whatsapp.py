from flask import Blueprint, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import os
import logging

from app.models.user_state import UserState
from app.services.ocr_service import extract_text_from_image, process_id_text
from app.services.supabase_service import store_user_data, validate_date_of_birth

logger = logging.getLogger(__name__)

whatsapp_bp = Blueprint('whatsapp', __name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

user_states = {}

def handle_welcome(user_state, message_body):
    logger.info(f"Starting registration for user {user_state.phone_number}")
    reply = "Welcome to our insurance service! I'll help you get started with your application. First, please tell me your full name."
    user_state.current_step = "collect_name"
    return reply

def handle_collect_name(user_state, message_body):
    logger.info(f"Collected name for user {user_state.phone_number}: {message_body}")
    user_state.user_data["full_name"] = message_body
    reply = f"Thank you, {message_body}. Now, please enter your date of birth (YYYY-MM-DD)."
    user_state.current_step = "collect_dob"
    return reply

def handle_collect_dob(user_state, message_body):
    logger.info(f"Attempting to validate DOB for user {user_state.phone_number}: {message_body}")
    is_valid, formatted_dob = validate_date_of_birth(message_body)
    if not is_valid:
        logger.warning(f"Invalid DOB format provided by user {user_state.phone_number}: {message_body}")
        return "Please enter a valid date format (YYYY-MM-DD)."
    
    logger.info(f"Valid DOB collected for user {user_state.phone_number}: {formatted_dob}")
    user_state.user_data["date_of_birth"] = formatted_dob
    reply = "Great! Now, please enter your national ID number."
    user_state.current_step = "collect_id_number"
    return reply

def handle_collect_id_number(user_state, message_body):
    logger.info(f"Collected ID number for user {user_state.phone_number}")
    user_state.user_data["national_id"] = message_body
    reply = "Thank you. Now, please enter your address."
    user_state.current_step = "collect_address"
    return reply

def handle_collect_address(user_state, message_body):
    logger.info(f"Collected address for user {user_state.phone_number}")
    user_state.user_data["address"] = message_body
    reply = "Almost done! Please send a clear photo of your ID document."
    user_state.current_step = "collect_id_image"
    return reply

def handle_collect_id_image(user_state, media_url):
    if not media_url:
        logger.warning(f"No media URL provided for user {user_state.phone_number} ID image")
        return "Please send a clear photo of your ID document."
    
    logger.info(f"Received ID image from user {user_state.phone_number}")
    user_state.user_data["id_image_url"] = media_url
    
    logger.info(f"Attempting OCR on ID image for user {user_state.phone_number}")
    extracted_text = extract_text_from_image(media_url)
    
    if extracted_text:
        logger.info(f"OCR successful for user {user_state.phone_number}, processing text")
        extracted_data = process_id_text(extracted_text)
        logger.info(f"Extracted data fields: {list(extracted_data.keys())}")
    else:
        logger.warning(f"OCR failed or returned no text for user {user_state.phone_number}")
        extracted_data = {}
    
    confirmation_message = "Please confirm your details:\n\n"
    
    for field, auto_value in extracted_data.items():
        existing_value = user_state.user_data.get(field)
        
        if auto_value and not existing_value:
            logger.info(f"Using OCR data for field {field} for user {user_state.phone_number}")
            user_state.user_data[field] = auto_value
            confirmation_message += f"{field.replace('_', ' ').title()}: {auto_value} (extracted from ID)\n"
        elif auto_value and existing_value and auto_value != existing_value:
            logger.info(f"Discrepancy in {field} for user {user_state.phone_number}: User input vs OCR")
            confirmation_message += f"{field.replace('_', ' ').title()}: {existing_value} (you provided) / {auto_value} (from ID)\n"
        else:
            confirmation_message += f"{field.replace('_', ' ').title()}: {existing_value}\n"
    
    confirmation_message += "\nIs this information correct? Reply YES to confirm or NO to restart."
    user_state.current_step = "confirm_details"
    return confirmation_message

def handle_confirm_details(user_state, message_body):
    if message_body.lower() == "yes":
        logger.info(f"User {user_state.phone_number} confirmed details, storing in database")
        user_state.user_data["contact_details"] = user_state.phone_number
        
        try:
            policyholder_id = store_user_data(user_state.user_data)
            
            if policyholder_id:
                logger.info(f"Successfully stored user data for {user_state.phone_number}, ID: {policyholder_id}")
                reply = f"Thank you! Your application has been submitted successfully. Your reference number is {policyholder_id}. We'll get back to you shortly."
            else:
                logger.error(f"Failed to store user data for {user_state.phone_number} in Supabase")
                reply = "Sorry, there was an error processing your application. Please try again later."
        except Exception as e:
            logger.exception(f"Exception while storing user data for {user_state.phone_number}: {str(e)}")
            reply = "Sorry, there was an error processing your application. Please try again later."
            
        user_state.current_step = "complete"
    else:
        logger.info(f"User {user_state.phone_number} chose to restart the registration process")
        reply = "Let's start over. Please tell me your full name."
        user_state.current_step = "collect_name"
        user_state.user_data = {
            "full_name": None,
            "date_of_birth": None,
            "national_id": None,
            "address": None,
            "id_image_url": None,
        }
    
    return reply

state_handlers = {
    "welcome": handle_welcome,
    "collect_name": handle_collect_name,
    "collect_dob": handle_collect_dob,
    "collect_id_number": handle_collect_id_number,
    "collect_address": handle_collect_address,
    "collect_id_image": handle_collect_id_image,
    "confirm_details": handle_confirm_details,
}

@whatsapp_bp.route("/webhook", methods=["POST"])
def webhook():
    phone_number = request.values.get('From', '').replace('whatsapp:', '')
    message_body = request.values.get('Body', '')
    num_media = int(request.values.get('NumMedia', 0))
    
    # Log masked phone number for privacy
    masked_number = '****' + phone_number[-4:] if phone_number and len(phone_number) > 4 else phone_number
    logger.info(f"Webhook received from {masked_number}")
    
    if phone_number not in user_states:
        logger.info(f"Creating new user state for {masked_number}")
        user_states[phone_number] = UserState(phone_number)
    
    user_state = user_states[phone_number]
    logger.info(f"Current step for user {masked_number}: {user_state.current_step}")
    
    if message_body.lower() == "start" or message_body.lower() == "register":
        logger.info(f"User {masked_number} is starting/restarting registration")
        user_state.current_step = "welcome"
        user_state.user_data = {
            "full_name": None,
            "date_of_birth": None,
            "national_id": None,
            "address": None,
            "id_image_url": None,
        }
    
    response = None
    try:
        media_url = None
        if num_media > 0 and user_state.current_step == "collect_id_image":
            media_url = request.values.get('MediaUrl0')
            logger.info(f"Media received from {masked_number}, URL available")
            response = handle_collect_id_image(user_state, media_url)
        else:
            handler = state_handlers.get(user_state.current_step)
            if handler:
                logger.debug(f"Calling handler for step: {user_state.current_step}")
                response = handler(user_state, message_body)
            else:
                logger.warning(f"No handler found for step: {user_state.current_step}")
                response = "Welcome to our insurance service! To register, please type 'register' or 'start'."
    except Exception as e:
        logger.exception(f"Error handling message from {masked_number}: {str(e)}")
        response = "Sorry, something went wrong. Please type 'register' or 'start' to try again."
    
    twilio_response = MessagingResponse()
    twilio_response.message(response)
    
    logger.info(f"Sending response to {masked_number}, next step: {user_state.current_step}")
    return str(twilio_response)