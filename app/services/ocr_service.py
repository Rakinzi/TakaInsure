import requests
import base64
from PIL import Image
from io import BytesIO
import os
import re
import logging

logger = logging.getLogger(__name__)

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY")

def extract_text_from_image(image_url):
    try:
        logger.info("Downloading image from URL")
        response = requests.get(image_url)
        
        if response.status_code != 200:
            logger.error(f"Failed to download image: Status code {response.status_code}")
            return None
        
        logger.info("Opening image with PIL")
        image = Image.open(BytesIO(response.content))
        image_format = image.format
        width, height = image.size
        logger.info(f"Image details: Format={image_format}, Size={width}x{height}")
        
        logger.info("Preparing OCR payload")
        payload = {
            'apikey': OCR_SPACE_API_KEY,
            'base64Image': base64.b64encode(response.content).decode(),
            'language': 'eng',
            'isCreateSearchablePdf': False,
            'isSearchablePdfHideTextLayer': False,
        }
        
        logger.info("Sending request to OCR.space API")
        ocr_response = requests.post(
            'https://api.ocr.space/parse/image',
            data=payload
        )
        
        if ocr_response.status_code != 200:
            logger.error(f"OCR.space API returned status code {ocr_response.status_code}")
            return None
        
        result = ocr_response.json()
        logger.debug(f"OCR response status: {result.get('OCRExitCode')}")
        
        if result.get('OCRExitCode') == 1:
            extracted_text = result['ParsedResults'][0]['ParsedText']
            text_length = len(extracted_text)
            logger.info(f"OCR successful, extracted {text_length} characters")
            return extracted_text
        else:
            error_message = result.get('ErrorMessage', 'No error message provided')
            logger.error(f"OCR failed with exit code {result.get('OCRExitCode')}: {error_message}")
            return None
    except requests.exceptions.RequestException as e:
        logger.exception(f"Request error during OCR: {str(e)}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error during OCR: {str(e)}")
        return None

def process_id_text(text):
    if not text:
        logger.warning("No text provided for ID processing")
        return {}
    
    logger.info("Processing extracted text from ID")
    extracted_data = {}
    
    # Log a truncated version of the text for debugging
    max_log_length = 500
    truncated_text = text[:max_log_length] + "..." if len(text) > max_log_length else text
    logger.debug(f"Processing ID text: {truncated_text}")
    
    try:
        id_match = re.search(r"ID\s*(?:Number|No|#)?[:.\s]*([A-Z0-9-]+)", text, re.IGNORECASE)
        if id_match:
            extracted_data["national_id"] = id_match.group(1).strip()
            logger.info(f"Extracted ID number: Found")
        else:
            logger.info("ID number pattern not found in text")
        
        name_match = re.search(r"Name[:.\s]*([A-Za-z\s]+)", text, re.IGNORECASE)
        if name_match:
            extracted_data["full_name"] = name_match.group(1).strip()
            logger.info(f"Extracted name: Found")
        else:
            logger.info("Name pattern not found in text")
        
        dob_match = re.search(r"(?:DOB|Date\s+of\s+Birth)[:.\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})", text, re.IGNORECASE)
        if dob_match:
            extracted_data["date_of_birth"] = dob_match.group(1).strip()
            logger.info(f"Extracted DOB: Found")
        else:
            logger.info("DOB pattern not found in text")
        
        address_match = re.search(r"(?:Address|Residence)[:.\s]*([A-Za-z0-9\s,.-]+)", text, re.IGNORECASE)
        if address_match:
            extracted_data["address"] = address_match.group(1).strip()
            logger.info(f"Extracted address: Found")
        else:
            logger.info("Address pattern not found in text")
        
        logger.info(f"Successfully extracted {len(extracted_data)} fields from ID")
        return extracted_data
    except Exception as e:
        logger.exception(f"Error processing ID text: {str(e)}")
        return {}