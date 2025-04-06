from flask import Blueprint, request, jsonify
import cv2
import numpy as np
from PIL import Image
import io
import tensorflow as tf
import logging

logger = logging.getLogger(__name__)

car_damage_bp = Blueprint('car_damage', __name__)

# Define the labels for the objects that can be detected
LABELS = ['damaged door', 'damaged window', 'damaged headlight', 'damaged mirror', 'dent', 'damaged hood', 'damaged bumper', 'damaged wind shield']

# Define the confidence threshold and non-maximum suppression threshold
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.3

class Detection:
    def __init__(self, model_path, classes):
        self.model_path = model_path
        self.classes = classes
        self.model = self.__load_model()
        logger.info(f"Loaded car damage detection model from {model_path}")

    def __load_model(self):
        try:
            net = cv2.dnn.readNet(self.model_path)
            # Try to use GPU if available
            net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA_FP16)
            # Fall back to CPU
            net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            return net
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise

    def __extract_ouput(self, preds, image_shape, input_shape, score=0.1, nms=0.0, confidence=0.0):
        class_ids, confs, boxes = list(), list(), list()

        image_height, image_width = image_shape
        input_height, input_width = input_shape
        x_factor = image_width / input_width
        y_factor = image_height / input_height
        
        rows = preds[0].shape[0]
        for i in range(rows):
            row = preds[0][i]
            conf = row[4]
            
            classes_score = row[4:]
            _,_,_, max_idx = cv2.minMaxLoc(classes_score)
            class_id = max_idx[1]
            
            if (classes_score[class_id] > score):
                confs.append(conf)
                label = self.classes[int(class_id)]
                class_ids.append(label)
                
                # Extract boxes
                x, y, w, h = row[0].item(), row[1].item(), row[2].item(), row[3].item() 
                left = int((x - 0.5 * w) * x_factor)
                top = int((y - 0.5 * h) * y_factor)
                width = int(w * x_factor)
                height = int(h * y_factor)
                box = np.array([left, top, width, height])
                boxes.append(box)

        r_class_ids, r_confs, r_boxes = list(), list(), list()
        indexes = cv2.dnn.NMSBoxes(boxes, confs, confidence, nms) 
        for i in indexes:
            if isinstance(i, list):  # Handle older versions of OpenCV
                i = i[0]
            r_class_ids.append(class_ids[i])
            r_confs.append(float(confs[i]*100))  # Convert to float for JSON serialization
            r_boxes.append(boxes[i].tolist())

        return {
            'boxes': r_boxes, 
            'confidences': r_confs, 
            'classes': r_class_ids
        }

    def __call__(self, image, width=640, height=640, score=0.1, nms=0.0, confidence=0.0):
        blob = cv2.dnn.blobFromImage(
            image, 1/255.0, (width, height), 
            swapRB=True, crop=False
        )
        self.model.setInput(blob)
        preds = self.model.forward()
        preds = preds.transpose((0, 2, 1))

        # Extract output
        results = self.__extract_ouput(
            preds=preds,
            image_shape=image.shape[:2],
            input_shape=(height, width),
            score=score,
            nms=nms,
            confidence=confidence
        )
        return results

# Initialize detection model
try:
    detection = Detection(
        model_path='best.onnx',  # Path to ONNX model
        classes=LABELS
    )
    logger.info("Car damage detection model initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize car damage detection model: {str(e)}")
    detection = None

@car_damage_bp.route('/detection', methods=['POST'])
def detect_damage():
    if not detection:
        logger.error("Detection model not available")
        return jsonify({"error": "Detection model not available"}), 500
        
    if 'file' not in request.files:
        logger.warning("No file part in the request")
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        logger.warning("No selected file")
        return jsonify({"error": "No selected file"}), 400
        
    try:
        # Read the image
        in_memory_file = io.BytesIO()
        file.save(in_memory_file)
        in_memory_file.seek(0)
        
        # Open and convert image
        image = Image.open(in_memory_file).convert("RGB")
        image = np.array(image)
        image = image[:,:,::-1].copy()  # RGB to BGR for OpenCV
        
        # Process the image
        logger.info(f"Processing image of shape {image.shape}")
        results = detection(image)
        
        # Log results summary
        logger.info(f"Detected {len(results['classes'])} damaged parts")
        
        return jsonify(results)
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Additional utility endpoint to check model status
@car_damage_bp.route('/status', methods=['GET'])
def model_status():
    if detection:
        return jsonify({"status": "ready", "model": "best.onnx", "classes": LABELS})
    else:
        return jsonify({"status": "not_ready", "error": "Model not loaded"}), 503