from flask import Blueprint, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import os
import logging

from app.models.user_state import UserState
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
    
    # Handle empty input
    if not message_body or message_body.strip() == "":
        logger.warning(f"Empty DOB provided by user {user_state.phone_number}")
        return "Please enter a valid date format (YYYY-MM-DD)."
    
    is_valid, formatted_dob = validate_date_of_birth(message_body)
    if not is_valid:
        logger.warning(f"Invalid DOB format provided by user {user_state.phone_number}: {message_body}")
        return "Please enter a valid date format (YYYY-MM-DD)."
    
    logger.info(f"Valid DOB collected for user {user_state.phone_number}: {formatted_dob}")
    user_state.user_data["date_of_birth"] = formatted_dob
    reply = "Great! Now, please enter your address."
    user_state.current_step = "collect_address"
    return reply

def handle_collect_address(user_state, message_body):
    logger.info(f"Collected address for user {user_state.phone_number}")
    user_state.user_data["address"] = message_body
    
    # Skip ID collection and image processing
    confirmation_message = "Please confirm your details:\n\n"
    confirmation_message += f"Full Name: {user_state.user_data['full_name']}\n"
    confirmation_message += f"Date of Birth: {user_state.user_data['date_of_birth']}\n"
    confirmation_message += f"Address: {user_state.user_data['address']}\n"
    
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
            "address": None,
        }
    
    return reply

state_handlers = {
    "welcome": handle_welcome,
    "collect_name": handle_collect_name,
    "collect_dob": handle_collect_dob,
    "collect_address": handle_collect_address,
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
            "address": None,
        }
    
    response = None
    try:
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