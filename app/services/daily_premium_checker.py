import logging
import threading
import time
from datetime import datetime, date
import calendar

logger = logging.getLogger(__name__)

processed_dates = set()

def check_and_process_daily_premiums():
    """
    Check for and process daily premiums for all active policies
    """
    global processed_dates
    
    # Get the current date
    today = date.today().isoformat()
    
    # Skip if we've already processed payments for today
    if today in processed_dates:
        logger.info(f"Daily premium payments for {today} already processed")
        return
    
    logger.info(f"Checking for daily premium payments for {today}")
    
    try:
        # Get all active policies
        from app.services.supabase_service import get_supabase_client
        supabase = get_supabase_client()
        
        if not supabase:
            logger.error("Supabase client not available")
            return
        
        # Get active policies
        response = supabase.table("policy").select("*").eq("status", "active").execute()
        
        if not response.data:
            logger.info("No active policies found")
            return
        
        # Group policies by policyholder for efficient processing
        policyholders = {}
        for policy in response.data:
            policyholder_id = policy.get('policyholder_id')
            if policyholder_id not in policyholders:
                policyholders[policyholder_id] = []
            
            policyholders[policyholder_id].append(policy)
        
        logger.info(f"Found {len(policyholders)} policyholders with active policies")
        
        # Process each policyholder's policies
        for policyholder_id, policies in policyholders.items():
            # Calculate the total daily premium for this policyholder
            current_date = datetime.now()
            days_in_month = calendar.monthrange(current_date.year, current_date.month)[1]
            
            total_premium = 0
            for policy in policies:
                monthly_premium = policy.get('premium_amount', 0)
                daily_premium = monthly_premium / days_in_month
                total_premium += daily_premium
            
            # Round to 2 decimal places
            total_premium = round(total_premium, 2)
            
            if total_premium <= 0:
                logger.info(f"No premium due for policyholder {policyholder_id}")
                continue
            
            # Get the policyholder's details
            user_response = supabase.table("policyholder").select("*").eq("policyholder_id", policyholder_id).execute()
            
            if not user_response.data or not user_response.data[0]:
                logger.warning(f"Policyholder {policyholder_id} not found")
                continue
            
            user = user_response.data[0]
            phone_number = user.get('contact_details')
            
            if not phone_number:
                logger.warning(f"Phone number not found for policyholder {policyholder_id}")
                continue
            
            # Process the payment
            from app.services.paynow_service import process_mobile_payment
            
            payment_result = process_mobile_payment(
                phone_number=phone_number,
                amount=total_premium,
                payment_method='ecocash',
                payment_reason=f"TakaInsure Daily Premium - {user.get('full_name', 'Customer')}",
                email="silverrakinzi@gmail.com"
            )
            
            if payment_result.get('success', False):
                logger.info(f"Daily premium payment successful for policyholder {policyholder_id}")
                
                # Record the payment for each policy
                for policy in policies:
                    policy_id = policy.get('policy_id')
                    monthly_premium = policy.get('premium_amount', 0)
                    daily_premium = monthly_premium / days_in_month
                    daily_premium = round(daily_premium, 2)
                    
                    payment_record = {
                        "policy_id": policy_id,
                        "amount": daily_premium,
                        "payment_date": datetime.now().isoformat(),
                        "payment_method": "ecocash",
                        "transaction_reference": payment_result.get('reference', f"daily_premium_{datetime.now().strftime('%Y%m%d%H%M%S')}"),
                        "status": "completed"
                    }
                    
                    payment_response = supabase.table("policy_payments").insert(payment_record).execute()
                    
                    if not payment_response.data:
                        logger.warning(f"Failed to record payment for policy {policy_id}")
            else:
                logger.warning(f"Daily premium payment failed for policyholder {policyholder_id}: {payment_result.get('error', 'Unknown error')}")
        
        # Mark today as processed
        processed_dates.add(today)
        logger.info(f"Completed daily premium payments for {today}")
        
    except Exception as e:
        logger.exception(f"Error processing daily premium payments: {str(e)}")


def start_premium_checker_thread():
    """
    Start a background thread to periodically check for and process daily premiums
    """
    def run_daily_check():
        while True:
            try:
                check_and_process_daily_premiums()
            except Exception as e:
                logger.exception(f"Error in premium checker thread: {str(e)}")
            
            # Sleep for 12 hours before checking again
            time.sleep(12 * 60 * 60)
    
    # Start the thread
    thread = threading.Thread(target=run_daily_check, daemon=True)
    thread.start()
    
    logger.info("Started daily premium checker thread")