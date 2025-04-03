import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def store_user_data(user_data):
    try:
        response = supabase.table("policyholder").insert(user_data).execute()
        return response.data[0]['policyholder_id'] if response.data else None
    except Exception as e:
        print(f"Supabase Error: {str(e)}")
        return None

def validate_date_of_birth(dob):
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
                return True, parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        return False, "Invalid date format"
    except Exception:
        return False, "Invalid date format"