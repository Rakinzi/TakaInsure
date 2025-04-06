from flask import Blueprint, request, jsonify
import numpy as np
import cv2
import os
import time
import logging

# Import the classifier code directly
import numpy as np
import json
import tensorflow.compat.v1 as tf
from PIL import Image, ImageOps
import cv2
import io

logger = logging.getLogger(__name__)

car_recognition_bp = Blueprint('car_recognition', __name__)

# Get the base directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Set path to model files
YOLO_PATH = os.path.join(BASE_DIR, 'car_make', 'yolo-coco')
model_file = os.path.join(YOLO_PATH, "model-weights-spectrico-mmr-mobilenet-128x128-344FF72B.pb")
label_file = os.path.join(BASE_DIR, 'car_make', "labels.txt")

# Network configuration
input_layer = "input_1"
output_layer = "softmax/Softmax"
classifier_input_size = (128, 128)

# Initialize YOLO settings
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.3

def load_graph(model_file):
    graph = tf.Graph()
    graph_def = tf.GraphDef()

    with open(model_file, "rb") as f:
        graph_def.ParseFromString(f.read())
    with graph.as_default():
        tf.import_graph_def(graph_def)

    return graph

def load_labels(label_file):
    label = []
    with open(label_file, "r", encoding='cp1251') as ins:
        for line in ins:
            label.append(line.rstrip())

    return label

def resizeAndPad(img, size, padColor=0):
    h, w = img.shape[:2]
    sh, sw = size

    # interpolation method
    if h > sh or w > sw: # shrinking image
        interp = cv2.INTER_AREA
    else: # stretching image
        interp = cv2.INTER_CUBIC

    # aspect ratio of image
    aspect = w/h  # if on Python 2, you might need to cast as a float: float(w)/h

    # compute scaling and pad sizing
    if aspect > 1: # horizontal image
        new_w = sw
        new_h = np.round(new_w/aspect).astype(int)
        pad_vert = (sh-new_h)/2
        pad_top, pad_bot = np.floor(pad_vert).astype(int), np.ceil(pad_vert).astype(int)
        pad_left, pad_right = 0, 0
    elif aspect < 1: # vertical image
        new_h = sh
        new_w = np.round(new_h*aspect).astype(int)
        pad_horz = (sw-new_w)/2
        pad_left, pad_right = np.floor(pad_horz).astype(int), np.ceil(pad_horz).astype(int)
        pad_top, pad_bot = 0, 0
    else: # square image
        new_h, new_w = sh, sw
        pad_left, pad_right, pad_top, pad_bot = 0, 0, 0, 0

    # set pad color
    if len(img.shape) is 3 and not isinstance(padColor, (list, tuple, np.ndarray)): # color image but only one color provided
        padColor = [padColor]*3

    # scale and pad
    scaled_img = cv2.resize(img, (new_w, new_h), interpolation=interp)
    scaled_img = cv2.copyMakeBorder(scaled_img, pad_top, pad_bot, pad_left, pad_right, borderType=cv2.BORDER_CONSTANT, value=padColor)

    return scaled_img

class Classifier():
    def __init__(self):
        # uncomment the next 3 lines if you want to use CPU instead of GPU
        #import os
        #os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
        #os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

        self.graph = load_graph(model_file)
        self.labels = load_labels(label_file)

        input_name = "import/" + input_layer
        output_name = "import/" + output_layer
        self.input_operation = self.graph.get_operation_by_name(input_name)
        self.output_operation = self.graph.get_operation_by_name(output_name)

        self.sess = tf.Session(graph=self.graph)
        self.sess.graph.finalize()  # Graph is read-only after this statement.

    def predict(self, img):
        img = img[:, :, ::-1]
        img = resizeAndPad(img, classifier_input_size)

        # Add a forth dimension since Tensorflow expects a list of images
        img = np.expand_dims(img, axis=0)

        # Scale the input image to the range used in the trained network
        img = img.astype(np.float32)
        img /= 127.5
        img -= 1.

        results = self.sess.run(self.output_operation.outputs[0], {
            self.input_operation.outputs[0]: img
        })
        results = np.squeeze(results)

        top = 3
        top_indices = results.argsort()[-top:][::-1]
        classes = []
        for ix in top_indices:
            make_model = self.labels[ix].split('\t')
            classes.append({"make": make_model[0], "model": make_model[1], "prob": str(results[ix])})
        return(classes)

# Initialize the car classifier
try:
    car_classifier = Classifier()
    logger.info("Car make/model classifier initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize car make/model classifier: {str(e)}")
    car_classifier = None

# Load COCO class labels
try:
    labels_path = os.path.join(YOLO_PATH, "coco.names")
    LABELS = open(labels_path).read().strip().split("\n")
    logger.info("COCO labels loaded successfully")
except Exception as e:
    logger.error(f"Failed to load COCO labels: {str(e)}")
    LABELS = []

# Initialize YOLO model
try:
    weights_path = os.path.join(YOLO_PATH, "yolov3.weights")
    config_path = os.path.join(YOLO_PATH, "yolov3.cfg")
    
    logger.info("Loading YOLO model from disk...")
    net = cv2.dnn.readNetFromDarknet(config_path, weights_path)
    
    # Attempt to use GPU if available
    try:
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
        logger.info("YOLO model loaded with CUDA support")
    except:
        # Fallback to CPU
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        logger.info("YOLO model loaded with CPU support")
except Exception as e:
    logger.error(f"Failed to load YOLO model: {str(e)}")
    net = None

@car_recognition_bp.route('/detect', methods=['POST'])
def detect_car():
    """
    API endpoint to detect and recognize car makes/models from uploaded images
    Returns JSON with detection and classification results
    """
    if not car_classifier or not net:
        logger.error("Car detection models not properly initialized")
        return jsonify({"error": "Car detection service not available"}), 500
        
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
        
        # Get image dimensions
        (H, W) = image.shape[:2]
        logger.info(f"Processing image of size {W}x{H}")
        
        # Determine only the output layer names that we need from YOLO
        layer_names = net.getLayerNames()
        try:
            # Handle different OpenCV versions
            output_layers = []
            for i in net.getUnconnectedOutLayers():
                if isinstance(i, (list, np.ndarray)):
                    output_layers.append(layer_names[i[0] - 1])
                else:
                    output_layers.append(layer_names[i - 1])
        except:
            # Alternative approach for older OpenCV versions
            try:
                output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
            except:
                output_layers = [layer_names[i[0] - 1] for i in net.getUnconnectedOutLayers()]
        
        # Construct a blob from the input image and perform a forward pass
        blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416),
            swapRB=True, crop=False)
        net.setInput(blob)
        
        start = time.time()
        outputs = net.forward(output_layers)
        end = time.time()
        
        logger.info(f"YOLO detection took {end - start:.4f} seconds")
        
        # Initialize lists of detected boxes, confidences, and class IDs
        boxes = []
        confidences = []
        classIDs = []
        
        # Process the output layers
        for output in outputs:
            for detection in output:
                scores = detection[5:]
                classID = np.argmax(scores)
                confidence = scores[classID]
                
                # Filter out weak predictions
                if confidence > CONFIDENCE_THRESHOLD:
                    # Scale the bounding box
                    box = detection[0:4] * np.array([W, H, W, H])
                    (centerX, centerY, width, height) = box.astype("int")
                    
                    # Calculate top-left coordinates
                    x = int(centerX - (width / 2))
                    y = int(centerY - (height / 2))
                    
                    boxes.append([x, y, int(width), int(height)])
                    confidences.append(float(confidence))
                    classIDs.append(classID)
        
        # Apply non-maxima suppression
        idxs = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
        
        # Initialize result array
        results = []
        
        # Process detections
        if len(idxs) > 0:
            # Handle different return formats from NMSBoxes
            if isinstance(idxs, tuple):
                idxs = idxs[0]  # For some OpenCV versions
                
            # Process the indices
            for i in (idxs.flatten() if hasattr(idxs, 'flatten') else idxs):
                # Extract the bounding box coordinates
                (x, y) = (boxes[i][0], boxes[i][1])
                (w, h) = (boxes[i][2], boxes[i][3])
                
                # Only process car detections (class ID 2 in COCO)
                if classIDs[i] == 2:  # Car class in COCO
                    # Ensure we don't exceed image boundaries
                    y1 = max(y, 0)
                    y2 = min(y + h, H)
                    x1 = max(x, 0)
                    x2 = min(x + w, W)
                    
                    # Skip if we have a degenerate box
                    if y2 <= y1 or x2 <= x1:
                        continue
                    
                    # Crop the car image
                    car_image = image[y1:y2, x1:x2]
                    
                    if car_image.size == 0:
                        continue
                    
                    # Classify the car make and model
                    start_time = time.time()
                    car_predictions = car_classifier.predict(car_image)
                    end_time = time.time()
                    
                    logger.info(f"Car classification took {end_time - start_time:.4f} seconds")
                    
                    # Add results to the list
                    result = {
                        "bbox": [x, y, w, h],
                        "confidence": float(confidences[i]),
                        "class": LABELS[classIDs[i]],
                        "predictions": car_predictions
                    }
                    
                    results.append(result)
                else:
                    # For non-car objects, just return the class
                    if len(LABELS) > classIDs[i]:
                        class_name = LABELS[classIDs[i]]
                    else:
                        class_name = f"Unknown class {classIDs[i]}"
                        
                    result = {
                        "bbox": [x, y, w, h],
                        "confidence": float(confidences[i]),
                        "class": class_name,
                        "predictions": []
                    }
                    
                    results.append(result)
        
        # Return the results
        return jsonify({
            "results": results,
            "detected_count": len(results),
            "processing_time": end - start
        })
        
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

@car_recognition_bp.route('/status', methods=['GET'])
def model_status():
    """
    API endpoint to check if the car recognition service is ready
    """
    if car_classifier and net:
        return jsonify({
            "status": "ready", 
            "yolo_model": "yolov3",
            "car_classifier": "mobilenet-128x128",
            "car_labels_count": len(car_classifier.labels) if hasattr(car_classifier, 'labels') else 0
        })
    else:
        errors = []
        if not car_classifier:
            errors.append("Car classifier not loaded")
        if not net:
            errors.append("YOLO detector not loaded")
            
        return jsonify({
            "status": "not_ready", 
            "errors": errors
        }), 503