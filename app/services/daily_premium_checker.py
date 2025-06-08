import logging
import threading
import time
from datetime import datetime, date
import calendar
import uuid
from zoneinfo import ZoneInfo  # Ensure timezone handling

logger = logging.getLogger(__name__)

class PremiumChecker:
    def __init__(self):
        self.processed_policies = set()

    def check_and_process_daily_premiums(self):
        """
        Check for and process daily premiums for all active policies
        """
        # Get the current date with timezone (UTC+2)
        current_datetime = datetime.now(ZoneInfo('Africa/Johannesburg'))  # Standard UTC+2 timezone
        today_start = current_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = current_datetime.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Convert to UTC for database storage
        today_start_utc = today_start.astimezone(ZoneInfo('UTC'))
        today_end_utc = today_end.astimezone(ZoneInfo('UTC'))
        
        logger.info(f"Checking for daily premium payments for {today_start.date()}")
        
        try:
            # Get all active policies
            from app.services.supabase_service import get_supabase_client
            supabase = get_supabase_client()
            
            if not supabase:
                logger.error("Supabase client not available")
                return
            
            # Get active policies
            response = supabase.table("policy").select("*").eq("status", "active").execute()

            logger.info(f"Found {len(response.data or [])} active policies")
            
            if not response.data:
                logger.info("No active policies found")
                return
            
            # Process each policy
            for policy in response.data:
                policy_id = policy.get('policy_id')
                
                # Skip if this specific policy has already been processed today
                if policy_id in self.processed_policies:
                    logger.info(f"Policy {policy_id} already processed today")
                    continue
                
                policyholder_id = policy.get('policyholder_id')
                
                # Check if this policy has been paid today
                existing_payments = supabase.table("policy_payments") \
                    .select("policy_id") \
                    .eq("policy_id", policy_id) \
                    .gte("payment_date", today_start_utc.isoformat()) \
                    .lte("payment_date", today_end_utc.isoformat()) \
                    .execute()
                
                # If payment exists for this policy today, mark as processed and continue
                if existing_payments.data:
                    self.processed_policies.add(policy_id)
                    logger.info(f"Payment already exists for policy {policy_id}")
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
                
                # Calculate daily premium
                days_in_month = calendar.monthrange(current_datetime.year, current_datetime.month)[1]
                monthly_premium = policy.get('premium_amount', 0)
                daily_premium = round(monthly_premium / days_in_month, 2)
                
                # Process the payment
                from app.services.paynow_service import process_mobile_payment
                
                payment_result = process_mobile_payment(
                    phone_number=phone_number,
                    amount=daily_premium,
                    payment_method='ecocash',
                    payment_reason=f"TakaInsure Daily Premium - {user.get('full_name', 'Customer')}",
                    email="silverrakinzi@gmail.com"
                )
                
                if payment_result.get('success', False):
                    logger.info(f"Daily premium payment successful for policy {policy_id}")
                    
                    # Record the payment
                    payment_record = {
                        "policy_id": policy_id,
                        "amount": daily_premium,
                        "payment_date": current_datetime.astimezone(ZoneInfo('UTC')).isoformat(),
                        "payment_method": "ecocash",
                        "transaction_reference": f"{uuid.uuid4()}",
                        "status": "completed"
                    }
                    
                    try:
                        payment_response = supabase.table("policy_payments").insert(payment_record).execute()
                        
                        if payment_response.data:
                            logger.info(f"Successfully recorded payment for policy {policy_id}")
                            # Mark this policy as processed for today
                            self.processed_policies.add(policy_id)
                        else:
                            logger.warning(f"No data returned when inserting payment for policy {policy_id}")
                    except Exception as insert_error:
                        logger.error(f"Error inserting payment for policy {policy_id}: {insert_error}")
                else:
                    logger.warning(f"Daily premium payment failed for policy {policy_id}: {payment_result.get('error', 'Unknown error')}")
            
            logger.info(f"Completed daily premium payments check for {today_start.date()}")
            
        except Exception as e:
            logger.exception(f"Error processing daily premium payments: {str(e)}")

def start_premium_checker_thread():
    """
    Start a background thread to periodically check for and process daily premiums
    """
    premium_checker = PremiumChecker()
    
    def run_daily_check():
        while True:
            try:
                # Reset processed policies each day
                if datetime.now(ZoneInfo('Africa/Johannesburg')).hour == 0:
                    premium_checker.processed_policies.clear()
                
                premium_checker.check_and_process_daily_premiums()
            except Exception as e:
                logger.exception(f"Error in premium checker thread: {str(e)}")
            
            # Sleep for 1 hour between checks
            time.sleep(1000)
    
    # Start the thread
    thread = threading.Thread(target=run_daily_check, daemon=True)
    thread.start()
    
    logger.info("Started daily premium checker thread")