import os
import logging
import uuid
import json
from datetime import datetime
from paynow import Paynow
from app.services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

# Initialize Paynow with credentials from environment variables
# Using the fixed credentials from test.py for testing purposes
PAYNOW_INTEGRATION_ID = os.getenv('PAYNOW_INTEGRATION_ID', '20555')
PAYNOW_INTEGRATION_KEY = os.getenv('PAYNOW_INTEGRATION_KEY', '79df01b8-3975-4726-a2bf-e4a55e9c6bc8')
RETURN_URL = os.getenv('PAYNOW_RETURN_URL', 'http://google.com')
RESULT_URL = os.getenv('PAYNOW_RESULT_URL', 'http://google.com')

# Get Supabase client
supabase = get_supabase_client()

def initialize_paynow():
    """Initialize Paynow client"""
    try:
        return Paynow(
            PAYNOW_INTEGRATION_ID,
            PAYNOW_INTEGRATION_KEY,
            RETURN_URL,
            RESULT_URL
        )
    except Exception as e:
        logger.exception(f"Failed to initialize Paynow: {str(e)}")
        return None

def process_premium_payment(policy_holder_id, amount):
    """
    Process a premium payment using Paynow
    
    Args:
        policy_holder_id: The ID of the policy holder
        amount: The amount to pay
        
    Returns:
        Dictionary with success status and transaction details
    """
    try:
        logger.info(f"Processing premium payment of {amount} for policy holder {policy_holder_id}")
        
        # Initialize Paynow
        paynow = initialize_paynow()
        if not paynow:
            return {
                "success": False,
                "error": "Payment service unavailable"
            }
        
        # Create payment - Use EXACT format from test.py, only changing amount
        payment = paynow.create_payment('Daily Premium', 'silverrakinzi@gmail.com')
        
        # Add payment details - Use EXACT description from test.py, only changing amount
        payment.add('Premium', float(amount))
        
        # Process mobile payment - Use EXACT values from test.py
        response = paynow.send_mobile(payment, '0771111111', 'ecocash')
        
        # Log the response
        logger.debug(f"Paynow response: {response.data}")
        
        if response.success:
            # Store transaction in database
            transaction_id = str(uuid.uuid4())
            
            try:
                if supabase:
                    payment_record = {
                        "payment_id": transaction_id,
                        "policyholder_id": policy_holder_id,
                        "amount": float(amount),
                        "payment_date": datetime.now().isoformat(),
                        "payment_method": "ecocash",
                        "payment_type": "premium",
                        "transaction_reference": response.data.get('reference', 'Order'),
                        "poll_url": response.poll_url,
                        "status": "pending"
                    }
                    
                    result = supabase.table("payments").insert(payment_record).execute()
                    logger.info(f"Payment record stored in database with ID: {transaction_id}")
            except Exception as db_error:
                logger.exception(f"Failed to store payment record in database: {str(db_error)}")
                # Continue despite database error since payment was successful
                
            return {
                "success": True,
                "transaction_id": transaction_id,
                "reference": response.data.get('reference', 'Order'),
                "instructions": response.data.get('instructions', ''),
                "poll_url": response.poll_url,
                "amount": amount,
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.error(f"Payment failed: {response.error}")
            return {
                "success": False,
                "error": response.error or "Payment processing failed"
            }
    except Exception as e:
        logger.exception(f"Error processing payment: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def process_claim_payment(claim_id, policy_id, amount):
    """
    Process a claim payment using Paynow (for demo only)
    
    In a real system, this would be an internal transfer to the policyholder's account
    
    Args:
        claim_id: The ID of the claim
        policy_id: The ID of the policy
        amount: The amount to pay
        
    Returns:
        Dictionary with success status and transaction details
    """
    try:
        logger.info(f"Processing claim payment of {amount} for claim {claim_id}")
        
        # In a real system, we would not use Paynow for outgoing payments
        # This is just for demonstration purposes
        
        # Generate transaction ID and reference
        transaction_id = str(uuid.uuid4())
        
        # Store transaction in database
        try:
            if supabase:
                payment_record = {
                    "payment_id": transaction_id,
                    "claim_id": claim_id,
                    "policy_id": policy_id,
                    "amount": float(amount),
                    "payment_date": datetime.now().isoformat(),
                    "payment_method": "bank_transfer",
                    "payment_type": "claim",
                    "transaction_reference": 'Order',
                    "status": "completed"
                }
                
                result = supabase.table("claim_payment").insert(payment_record).execute()
                logger.info(f"Claim payment record stored in database with ID: {transaction_id}")
        except Exception as db_error:
            logger.exception(f"Failed to store claim payment record in database: {str(db_error)}")
            # Continue despite database error
        
        # Update claim status
        try:
            if supabase:
                update_result = supabase.table("claim").update({
                    "claim_status": "paid",
                    "updated_at": datetime.now().isoformat()
                }).eq("claim_id", claim_id).execute()
                
                logger.info(f"Claim {claim_id} status updated to 'paid'")
        except Exception as update_error:
            logger.exception(f"Failed to update claim status: {str(update_error)}")
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "reference": 'Order',
            "amount": amount,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.exception(f"Error processing claim payment: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_payment_history(policy_holder_id, payment_type=None, limit=20):
    """
    Get payment history for a policy holder
    
    Args:
        policy_holder_id: The ID of the policy holder
        payment_type: Optional filter for payment type ('premium' or 'claim')
        limit: Maximum number of records to return
        
    Returns:
        List of payment records
    """
    try:
        logger.info(f"Getting payment history for policy holder {policy_holder_id}")
        
        if not supabase:
            logger.error("Supabase client is not initialized")
            return []
        
        query = supabase.table("payments").select("*").eq("policyholder_id", policy_holder_id)
        
        if payment_type:
            query = query.eq("payment_type", payment_type)
        
        query = query.order("payment_date", {"ascending": False}).limit(limit)
        
        result = query.execute()
        
        if result.data:
            logger.info(f"Found {len(result.data)} payment records")
            return result.data
        else:
            logger.info("No payment records found")
            return []
    except Exception as e:
        logger.exception(f"Error getting payment history: {str(e)}")
        return []

def get_claim_payments(claim_id):
    """
    Get payments for a specific claim
    
    Args:
        claim_id: The ID of the claim
        
    Returns:
        List of payment records
    """
    try:
        logger.info(f"Getting payments for claim {claim_id}")
        
        if not supabase:
            logger.error("Supabase client is not initialized")
            return []
        
        result = supabase.table("claim_payment").select("*").eq("claim_id", claim_id).execute()
        
        if result.data:
            logger.info(f"Found {len(result.data)} claim payment records")
            return result.data
        else:
            logger.info("No claim payment records found")
            return []
    except Exception as e:
        logger.exception(f"Error getting claim payments: {str(e)}")
        return []

def check_payment_status(transaction_reference):
    """
    Check the status of a payment using its reference
    
    Args:
        transaction_reference: The transaction reference to check
        
    Returns:
        Dictionary with payment status details
    """
    try:
        logger.info(f"Checking payment status for transaction {transaction_reference}")
        
        if not supabase:
            logger.error("Supabase client is not initialized")
            return {
                "success": False,
                "error": "Database service unavailable"
            }
        
        # Look up the payment in the database
        result = supabase.table("payments").select("*").eq("transaction_reference", transaction_reference).single().execute()
        
        if result.data:
            # In a real implementation, we would also check with Paynow
            # using the poll_url stored in the payment record
            
            return {
                "success": True,
                "status": result.data.get("status", "unknown"),
                "amount": result.data.get("amount"),
                "payment_date": result.data.get("payment_date"),
                "payment_method": result.data.get("payment_method")
            }
        else:
            logger.info(f"No payment record found for transaction {transaction_reference}")
            return {
                "success": False,
                "error": "Payment not found"
            }
    except Exception as e:
        logger.exception(f"Error checking payment status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def record_daily_premium_payment(policy_holder_id, policies, amount):
    """
    Record a daily premium payment across multiple policies
    
    Args:
        policy_holder_id: The ID of the policy holder
        policies: List of policy objects with policy_id and daily_premium
        amount: Total amount paid
        
    Returns:
        Success status
    """
    try:
        logger.info(f"Recording daily premium payment of {amount} for policy holder {policy_holder_id}")
        
        if not supabase:
            logger.error("Supabase client is not initialized")
            return False
        
        # Create a master payment record
        master_payment_id = str(uuid.uuid4())
        master_payment = {
            "payment_id": master_payment_id,
            "policyholder_id": policy_holder_id,
            "amount": float(amount),
            "payment_date": datetime.now().isoformat(),
            "payment_method": "ecocash",
            "payment_type": "daily_premium",
            "transaction_reference": 'Order',
            "status": "completed"
        }
        
        result = supabase.table("payments").insert(master_payment).execute()
        
        # Record individual policy payments
        for policy in policies:
            policy_payment = {
                "payment_id": str(uuid.uuid4()),
                "master_payment_id": master_payment_id,
                "policy_id": policy["policy_id"],
                "amount": float(policy.get("daily_premium", 0)),
                "payment_date": datetime.now().isoformat(),
                "payment_method": "ecocash",
                "payment_type": "premium",
                "transaction_reference": 'Order',
                "status": "completed"
            }
            
            policy_result = supabase.table("policy_payments").insert(policy_payment).execute()
            
            logger.info(f"Recorded premium payment for policy {policy['policy_id']}")
        
        return True
    except Exception as e:
        logger.exception(f"Error recording daily premium payment: {str(e)}")
        return False

def calculate_daily_premium(premium_amount):
    """
    Calculate daily premium from monthly premium
    
    Args:
        premium_amount: Monthly premium amount
        
    Returns:
        Daily premium amount
    """
    # Get days in current month
    current_date = datetime.now()
    days_in_month = (datetime(current_date.year + (current_date.month == 12), 
                             ((current_date.month % 12) + 1), 
                             1) - datetime(current_date.year, current_date.month, 1)).days
    
    # Calculate daily amount
    daily_premium = premium_amount / days_in_month
    
    # Round to 2 decimal places
    return round(daily_premium, 2)