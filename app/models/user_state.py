class UserState:
    def __init__(self, phone_number):
        self.phone_number = phone_number
        self.current_step = "welcome"
        self.user_data = {
            "full_name": None,
            "date_of_birth": None,
            "address": None,
            "contact_details": None,
        }