from flask import Blueprint, request, jsonify
import numpy as np
import cv2
import imutils
import pytesseract
import logging
import os

logger = logging.getLogger(__name__)

license_plate_bp = Blueprint('license_plate', __name__)

# Set the path to Tesseract executable for Windows
# Adjust this path if your installation is different
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

@license_plate_bp.route('/detect', methods=['POST'])
def detect_license_plate():
    """
    API endpoint to detect license plate text from uploaded images
    """
    if 'file' not in request.files:
        logger.warning("No file part in the request")
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        logger.warning("No selected file")
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Read the image
        file_bytes = file.read()
        np_arr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if image is None:
            logger.error("Failed to decode image")
            return jsonify({"error": "Invalid image format"}), 400
        
        # Resize the image
        image = imutils.resize(image, width=500)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply bilateral filter to remove noise while keeping edges sharp
        gray = cv2.bilateralFilter(gray, 11, 17, 17)
        
        # Detect edges
        edged = cv2.Canny(gray, 170, 200)
        
        # Find contours based on edges
        contour_result = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        if len(contour_result) == 2:
            cnts = contour_result[0]  # OpenCV v4+
        else:
            cnts = contour_result[1]  # OpenCV v3 and earlier
        
        # Sort contours by area (largest to smallest) and keep only the largest 30
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:30]
        
        # Initialize license plate contour
        NumberPlateCnt = None
        
        # Loop over contours to find the license plate
        for c in cnts:
            # Calculate the perimeter of the contour
            peri = cv2.arcLength(c, True)
            # Approximate the contour
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            # If our approximated contour has four points, it's probably the license plate
            if len(approx) == 4:  
                NumberPlateCnt = approx
                break
        
        # Check if a license plate contour was found
        if NumberPlateCnt is None:
            logger.info("No license plate found in the image")
            return jsonify({"result": "", "message": "No license plate found in the image"}), 200
        
        # Mask the part other than the number plate
        mask = np.zeros(gray.shape, np.uint8)
        
        # Draw the license plate contour on the mask
        cv2.drawContours(mask, [NumberPlateCnt], 0, 255, -1)
        
        # Bitwise-AND with the original image to extract only the license plate
        new_image = cv2.bitwise_and(image, image, mask=mask)
        
        # Additional processing for better OCR results
        # Convert the license plate to grayscale
        plate_gray = cv2.cvtColor(new_image, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding to get a binary image
        _, plate_binary = cv2.threshold(plate_gray, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Try different Tesseract configurations for better results
        configs = [
            '--oem 1 --psm 7',  # Single line of text
            '--oem 1 --psm 8',  # Single word
            '--oem 1 --psm 10',  # Single character
            '--oem 1 --psm 11',  # Sparse text
            '--oem 1 --psm 6',   # Assume a single uniform block of text
        ]
        
        # Try different image processing techniques and OCR configs
        results = []
        
        # Try original cropped plate
        for config in configs:
            text = pytesseract.image_to_string(new_image, config=config)
            text = text.replace('\n', '').replace('\f', '').strip()
            if text:
                results.append(text)
        
        # Try binary threshold version
        for config in configs:
            text = pytesseract.image_to_string(plate_binary, config=config)
            text = text.replace('\n', '').replace('\f', '').strip()
            if text:
                results.append(text)
        
        # Choose the result with the most alphanumeric characters
        if results:
            def count_alnum(s):
                return sum(c.isalnum() for c in s)
            
            result = max(results, key=count_alnum)
            logger.info(f"License plate detected: {result}")
            return jsonify({"result": result})
        else:
            logger.info("No text could be recognized from the license plate")
            return jsonify({"result": "", "message": "Could not read text from license plate"})
        
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

@license_plate_bp.route('/status', methods=['GET'])
def model_status():
    """
    API endpoint to check if the license plate recognition service is ready
    """
    try:
        # Check if Tesseract is available
        if not os.path.exists(pytesseract.pytesseract.tesseract_cmd):
            return jsonify({
                "status": "not_ready",
                "error": "Tesseract OCR executable not found"
            }), 503
            
        return jsonify({
            "status": "ready",
            "tesseract_version": "Tesseract OCR",
            "message": "License plate recognition service is ready"
        })
    except Exception as e:
        logger.exception(f"Error checking service status: {str(e)}")
        return jsonify({
            "status": "not_ready",
            "error": str(e)
        }), 503