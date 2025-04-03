from flask import Blueprint, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import os

from app.models.user_state import UserState
from app.services.ocr_service import extract_text_from_image, process_id_text
from app.services.supabase_service import store_user_data, validate_date_of_birth

whatsapp_bp = Blueprint('whatsapp', __name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

user_states = {}

def handle_welcome(user_state, message_body):
    reply = "Welcome to our insurance service! I'll help you get started with your application. First, please tell me your full name."
    user_state.current_step = "collect_name"
    return reply

def handle_collect_name(user_state, message_body):
    user_state.user_data["full_name"] = message_body
    reply = f"Thank you, {message_body}. Now, please enter your date of birth (YYYY-MM-DD)."
    user_state.current_step = "collect_dob"
    return reply

def handle_collect_dob(user_state, message_body):
    is_valid, formatted_dob = validate_date_of_birth(message_body)
    if not is_valid:
        return "Please enter a valid date format (YYYY-MM-DD)."
    
    user_state.user_data["date_of_birth"] = formatted_dob
    reply = "Great! Now, please enter your national ID number."
    user_state.current_step = "collect_id_number"
    return reply

def handle_collect_id_number(user_state, message_body):
    user_state.user_data["national_id"] = message_body
    reply = "Thank you. Now, please enter your address."
    user_state.current_step = "collect_address"
    return reply

def handle_collect_address(user_state, message_body):
    user_state.user_data["address"] = message_body
    reply = "Almost done! Please send a clear photo of your ID document."
    user_state.current_step = "collect_id_image"
    return reply

def handle_collect_id_image(user_state, media_url):
    if not media_url:
        return "Please send a clear photo of your ID document."
    
    user_state.user_data["id_image_url"] = media_url
    
    extracted_text = extract_text_from_image(media_url)
    extracted_data = process_id_text(extracted_text)
    
    confirmation_message = "Please confirm your details:\n\n"
    
    for field, auto_value in extracted_data.items():
        existing_value = user_state.user_data.get(field)
        
        if auto_value and not existing_value:
            user_state.user_data[field] = auto_value
            confirmation_message += f"{field.replace('_', ' ').title()}: {auto_value} (extracted from ID)\n"
        elif auto_value and existing_value and auto_value != existing_value:
            confirmation_message += f"{field.replace('_', ' ').title()}: {existing_value} (you provided) / {auto_value} (from ID)\n"
        else:
            confirmation_message += f"{field.replace('_', ' ').title()}: {existing_value}\n"
    
    confirmation_message += "\nIs this information correct? Reply YES to confirm or NO to restart."
    user_state.current_step = "confirm_details"
    return confirmation_message

def handle_confirm_details(user_state, message_body):
    if message_body.lower() == "yes":
        user_state.user_data["contact_details"] = user_state.phone_number
        policyholder_id = store_user_data(user_state.user_data)
        
        if policyholder_id:
            reply = f"Thank you! Your application has been submitted successfully. Your reference number is {policyholder_id}. We'll get back to you shortly."
        else:
            reply = "Sorry, there was an error processing your application. Please try again later."
            
        user_state.current_step = "complete"
    else:
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
    
    if phone_number not in user_states:
        user_states[phone_number] = UserState(phone_number)
    
    user_state = user_states[phone_number]
    
    if message_body.lower() == "start" or message_body.lower() == "register":
        user_state.current_step = "welcome"
        user_state.user_data = {
            "full_name": None,
            "date_of_birth": None,
            "national_id": None,
            "address": None,
            "id_image_url": None,
        }
    
    media_url = None
    if num_media > 0 and user_state.current_step == "collect_id_image":
        media_url = request.values.get('MediaUrl0')
        response = handle_collect_id_image(user_state, media_url)
    else:
        handler = state_handlers.get(user_state.current_step)
        if handler:
            response = handler(user_state, message_body)
        else:
            response = "Welcome to our insurance service! To register, please type 'register' or 'start'."
    
    twilio_response = MessagingResponse()
    twilio_response.message(response)
    
    return str(twilio_response)