from flask import Blueprint, request, jsonify
import logging
import os
from paynow import Paynow
from datetime import datetime

logger = logging.getLogger(__name__)

payment_bp = Blueprint('payment', __name__)

# Initialize Paynow with credentials from environment variables
# Using the credentials from test.py
PAYNOW_INTEGRATION_ID = os.getenv('PAYNOW_INTEGRATION_ID', '20555')
PAYNOW_INTEGRATION_KEY = os.getenv('PAYNOW_INTEGRATION_KEY', '79df01b8-3975-4726-a2bf-e4a55e9c6bc8')
RETURN_URL = os.getenv('PAYNOW_RETURN_URL', 'http://google.com')
RESULT_URL = os.getenv('PAYNOW_RESULT_URL', 'http://google.com')

# Initialize Paynow client
paynow = Paynow(
    PAYNOW_INTEGRATION_ID,
    PAYNOW_INTEGRATION_KEY,
    RETURN_URL,
    RESULT_URL
)

@payment_bp.route('/process', methods=['POST'])
def process_payment():
    """
    Process a payment using Paynow
    
    Request body:
    {
        "amount": "10.00",
        "phoneNumber": "0771111111",  # This should be kept the same as in test.py
        "description": "Premium Payment",
        "reference": "policy_123"  # Optional
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Extract parameters
        amount = data.get('amount')
        phone_number = data.get('phoneNumber', '0771111111')  # Default to the working number
        description = data.get('description', 'TakaInsure Payment')
        reference = data.get('reference', f'payment_{datetime.now().strftime("%Y%m%d%H%M%S")}')
        
        # Validate required parameters
        if not amount:
            return jsonify({"success": False, "error": "Amount is required"}), 400
        
        try:
            # Ensure amount is a valid number
            amount = float(amount)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid amount format"}), 400
        
        # Log payment attempt
        logger.info(f"Processing payment: {amount} from {phone_number} for {description} (ref: {reference})")
        
        # Create payment with Paynow
        payment = paynow.create_payment(reference, 'silverrakinzi@gmail.com')
        
        # Add payment details
        payment.add(description, amount)
        
        # Initiate mobile payment (EcoCash is the default mobile money service in Zimbabwe)
        response = paynow.send_mobile(payment, phone_number, 'ecocash')
        
        # Log the raw response for debugging
        logger.debug(f"Paynow response: {response.data}")
        
        # Check if payment initiation was successful
        if response.success:
            # In a real implementation, you would store the transaction details 
            # and poll for status updates using response.poll_url
            
            return jsonify({
                "success": True,
                "message": "Payment initiated successfully",
                "transactionReference": response.data.get('reference', reference),
                "instructions": response.data.get('instructions', 'Check your phone to complete the payment'),
                "pollUrl": response.poll_url
            })
        else:
            logger.error(f"Payment initiation failed: {response.error}")
            return jsonify({
                "success": False,
                "error": response.error or "Failed to initiate payment"
            }), 400
            
    except Exception as e:
        logger.exception(f"Error processing payment: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@payment_bp.route('/check-status', methods=['GET'])
def check_payment_status():
    """
    Check the status of a payment
    
    Query parameters:
    - pollUrl: The URL to poll for status updates
    - reference: The payment reference
    """
    try:
        poll_url = request.args.get('pollUrl')
        reference = request.args.get('reference')
        
        if not (poll_url or reference):
            return jsonify({"success": False, "error": "Either pollUrl or reference is required"}), 400
        
        if poll_url:
            # In a real implementation, you would poll the URL for status updates
            # status = paynow.check_transaction_status(poll_url)
            
            # For now, simulate success
            return jsonify({
                "success": True,
                "status": "paid",
                "amount": "unknown",  # Would come from the real response
                "reference": reference or "unknown"
            })
        else:
            # In a real implementation, you would query your database for the transaction
            # and then check its status with Paynow if necessary
            
            # For now, simulate success
            return jsonify({
                "success": True,
                "status": "paid",
                "amount": "unknown",  # Would come from your database
                "reference": reference
            })
            
    except Exception as e:
        logger.exception(f"Error checking payment status: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@payment_bp.route('/daily-premium', methods=['POST'])
def process_daily_premium():
    """
    Process a daily premium payment
    
    Request body:
    {
        "amount": "10.00",
        "phoneNumber": "0771111111",  # This should be kept the same as in test.py
        "policyHolderId": "user_123",
        "policyIds": ["policy_123", "policy_456"]  # Optional
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Extract parameters
        amount = data.get('amount')
        phone_number = data.get('phoneNumber', '0771111111')  # Default to the working number
        policyholder_id = data.get('policyHolderId')
        policy_ids = data.get('policyIds', [])
        
        # Validate required parameters
        if not amount:
            return jsonify({"success": False, "error": "Amount is required"}), 400
        
        if not policyholder_id:
            return jsonify({"success": False, "error": "Policy holder ID is required"}), 400
        
        try:
            # Ensure amount is a valid number
            amount = float(amount)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid amount format"}), 400
        
        # Generate a reference for the payment
        reference = f"premium_{policyholder_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create payment with Paynow
        payment = paynow.create_payment(reference, 'silverrakinzi@gmail.com')
        
        # Add payment details
        payment.add("Daily Premium Payment", amount)
        
        # Initiate mobile payment
        response = paynow.send_mobile(payment, phone_number, 'ecocash')
        
        # Check if payment initiation was successful
        if response.success:
            # In a real implementation, store the transaction in the database
            # and associate it with the policies
            
            return jsonify({
                "success": True,
                "message": "Premium payment initiated successfully",
                "transactionReference": response.data.get('reference', reference),
                "instructions": response.data.get('instructions', 'Check your phone to complete the payment'),
                "pollUrl": response.poll_url,
                "timestamp": datetime.now().isoformat()
            })
        else:
            logger.error(f"Premium payment initiation failed: {response.error}")
            return jsonify({
                "success": False,
                "error": response.error or "Failed to initiate premium payment"
            }), 400
            
    except Exception as e:
        logger.exception(f"Error processing premium payment: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@payment_bp.route('/status', methods=['GET'])
def payment_status():
    """
    Check if the payment service is available
    """
    try:
        return jsonify({
            "status": "available",
            "provider": "Paynow",
            "methods": ["ecocash"],
            "version": "1.0"
        })
    except Exception as e:
        logger.exception(f"Error checking payment service status: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500