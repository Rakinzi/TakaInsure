import requests
import base64
from PIL import Image
from io import BytesIO
import os
import re

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY")

def extract_text_from_image(image_url):
    try:
        response = requests.get(image_url)
        image = Image.open(BytesIO(response.content))
        
        payload = {
            'apikey': OCR_SPACE_API_KEY,
            'base64Image': base64.b64encode(response.content).decode(),
            'language': 'eng',
            'isCreateSearchablePdf': False,
            'isSearchablePdfHideTextLayer': False,
        }
        
        ocr_response = requests.post(
            'https://api.ocr.space/parse/image',
            data=payload
        )
        
        result = ocr_response.json()
        
        if result['OCRExitCode'] == 1:
            extracted_text = result['ParsedResults'][0]['ParsedText']
            return extracted_text
        else:
            return None
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        return None

def process_id_text(text):
    if not text:
        return {}
    
    extracted_data = {}
    
    id_match = re.search(r"ID\s*(?:Number|No|#)?[:.\s]*([A-Z0-9-]+)", text, re.IGNORECASE)
    if id_match:
        extracted_data["national_id"] = id_match.group(1).strip()
    
    name_match = re.search(r"Name[:.\s]*([A-Za-z\s]+)", text, re.IGNORECASE)
    if name_match:
        extracted_data["full_name"] = name_match.group(1).strip()
    
    dob_match = re.search(r"(?:DOB|Date\s+of\s+Birth)[:.\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})", text, re.IGNORECASE)
    if dob_match:
        extracted_data["date_of_birth"] = dob_match.group(1).strip()
    
    address_match = re.search(r"(?:Address|Residence)[:.\s]*([A-Za-z0-9\s,.-]+)", text, re.IGNORECASE)
    if address_match:
        extracted_data["address"] = address_match.group(1).strip()
    
    return extracted_data