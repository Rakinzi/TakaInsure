import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional

# Import the paynow module
try:
    from paynow import Paynow
    PAYNOW_AVAILABLE = True
except ImportError:
    PAYNOW_AVAILABLE = False
    logging.warning("Paynow module not available. Payment integration will be simulated.")

logger = logging.getLogger(__name__)

# Paynow credentials from environment variables
PAYNOW_INTEGRATION_ID = os.getenv("PAYNOW_INTEGRATION_ID", "20555")
PAYNOW_INTEGRATION_KEY = os.getenv("PAYNOW_INTEGRATION_KEY", "79df01b8-3975-4726-a2bf-e4a55e9c6bc8")
PAYNOW_RETURN_URL = os.getenv("PAYNOW_RETURN_URL", "http://google.com")
PAYNOW_RESULT_URL = os.getenv("PAYNOW_RESULT_URL", "http://google.com")

# Initialize the Paynow client if available
if PAYNOW_AVAILABLE:
    try:
        paynow_client = Paynow(
            PAYNOW_INTEGRATION_ID,
            PAYNOW_INTEGRATION_KEY,
            PAYNOW_RETURN_URL,
            PAYNOW_RESULT_URL
        )
        logger.info("Paynow client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Paynow client: {str(e)}")
        paynow_client = None
        PAYNOW_AVAILABLE = False
else:
    paynow_client = None


def process_mobile_payment(
    phone_number: str,
    amount: float,
    payment_method: str = "ecocash",
    payment_reason: str = "TakaInsure Premium",
    email: str = "silverrakinzi@gmail.com"
) -> Dict[str, Any]:
    """
    Process a mobile payment using Paynow
    
    Args:
        phone_number: Customer's phone number
        amount: Amount to charge
        payment_method: Payment method (ecocash, onemoney, telecash)
        payment_reason: Reason for payment
        email: Customer's email
        
    Returns:
        Dictionary with payment result
    """
    if not PAYNOW_AVAILABLE or not paynow_client:
        # Simulate a payment if Paynow is not available
        logger.info(f"Simulating payment of ${amount} to {phone_number} via {payment_method}")
        
        # Generate a mock transaction ID
        transaction_id = f"simulated_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            "success": True,
            "reference": transaction_id,
            "amount": amount,
            "phone": phone_number,
            "method": payment_method,
            "status": "paid",
            "poll_url": None,
            "instructions": f"This is a simulated payment. In a real environment, the customer would receive a prompt on their mobile phone to approve the payment via {payment_method}."
        }
    
    try:
        logger.info(f"Processing payment of ${amount} to {phone_number} via {payment_method}")
        
        # Create a payment
        payment = paynow_client.create_payment(payment_reason, email)
        
        # Add the payment details
        payment.add(payment_reason, amount)
        
        # Send the payment
        response = paynow_client.send_mobile(payment, phone_number, payment_method)
        
        # Check if payment was initiated successfully
        if response.success:
            logger.info(f"Payment initiated successfully: {response.data}")
            
            # Return the payment details
            return {
                "success": True,
                "reference": response.data.get("reference", ""),
                "amount": amount,
                "phone": phone_number,
                "method": payment_method,
                "status": "pending",
                "poll_url": response.data.get("pollurl", ""),
                "instructions": response.data.get("instructions", "")
            }
        else:
            logger.error(f"Failed to initiate payment: {response.error}")
            
            return {
                "success": False,
                "error": response.error or "Failed to initiate payment",
                "amount": amount,
                "phone": phone_number,
                "method": payment_method
            }
    except Exception as e:
        logger.exception(f"Error processing payment: {str(e)}")
        
        return {
            "success": False,
            "error": str(e),
            "amount": amount,
            "phone": phone_number,
            "method": payment_method
        }


def check_payment_status(poll_url: str) -> Dict[str, Any]:
    """
    Check the status of a payment
    
    Args:
        poll_url: URL to poll for payment status
        
    Returns:
        Dictionary with payment status
    """
    if not PAYNOW_AVAILABLE or not paynow_client:
        # Simulate a payment status check
        logger.info(f"Simulating payment status check for {poll_url}")
        
        # For simulation, always return paid
        return {
            "status": "paid",
            "paid": True,
            "amount": 0.0,
            "reference": "simulated_reference"
        }
    
    try:
        logger.info(f"Checking payment status: {poll_url}")
        
        # Check the status
        status = paynow_client.check_transaction_status(poll_url)
        
        if status.paid:
            logger.info(f"Payment successful: {status.data}")
            
            return {
                "status": "paid",
                "paid": True,
                "amount": float(status.data.get("amount", 0.0)),
                "reference": status.data.get("reference", "")
            }
        else:
            logger.info(f"Payment not yet complete: {status.data}")
            
            return {
                "status": "pending",
                "paid": False,
                "amount": float(status.data.get("amount", 0.0)),
                "reference": status.data.get("reference", "")
            }
    except Exception as e:
        logger.exception(f"Error checking payment status: {str(e)}")
        
        return {
            "status": "error",
            "paid": False,
            "error": str(e)
        }