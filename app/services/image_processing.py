import cv2
import numpy as np
import logging
import os
import io
from PIL import Image
import tensorflow.compat.v1 as tf

logger = logging.getLogger(__name__)

# Initialize car make classifier if available
try:
    # Get the base directory - this is the key fix
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Set path to model files using the same pattern as the car_recognition blueprint
    YOLO_PATH = os.path.join(BASE_DIR, 'car_make', 'yolo-coco')
    model_file = os.path.join(YOLO_PATH, "model-weights-spectrico-mmr-mobilenet-128x128-344FF72B.pb")
    label_file = os.path.join(BASE_DIR, 'car_make', "labels.txt")
    
    # Check if files exist
    if not os.path.exists(model_file):
        logger.warning(f"Car classifier model not found at: {model_file}")
        car_classifier = None
        CAR_CLASSIFIER_AVAILABLE = False
    elif not os.path.exists(label_file):
        logger.warning(f"Car classifier labels not found at: {label_file}")
        car_classifier = None
        CAR_CLASSIFIER_AVAILABLE = False
    else:
        # Import the classifier directly
        # Network configuration
        input_layer = "input_1"
        output_layer = "softmax/Softmax"
        classifier_input_size = (128, 128)

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

        # Initialize the classifier
        car_classifier = Classifier()
        CAR_CLASSIFIER_AVAILABLE = True
        logger.info("Car make classifier initialized successfully")
except ImportError as e:
    logger.warning(f"Could not import car classifier: {str(e)}")
    car_classifier = None
    CAR_CLASSIFIER_AVAILABLE = False
except Exception as e:
    logger.error(f"Failed to initialize car make classifier: {str(e)}")
    car_classifier = None
    CAR_CLASSIFIER_AVAILABLE = False

# Initialize YOLO model for license plate detection
def initialize_yolo():
    try:
        # Get base directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        yolo_dir = os.path.join(base_dir, 'car_make', 'yolo-coco')
        
        # Check if files exist
        weights_path = os.path.join(yolo_dir, "yolov3.weights")
        config_path = os.path.join(yolo_dir, "yolov3.cfg")
        labels_path = os.path.join(yolo_dir, "coco.names")
        
        if not os.path.exists(weights_path):
            logger.warning(f"YOLO weights not found at: {weights_path}")
            return None, None, None
            
        if not os.path.exists(config_path):
            logger.warning(f"YOLO config not found at: {config_path}")
            return None, None, None
            
        if not os.path.exists(labels_path):
            logger.warning(f"YOLO labels not found at: {labels_path}")
            return None, None, None
        
        # Load COCO class labels
        LABELS = open(labels_path).read().strip().split("\n")
        
        # Load the YOLO network
        net = cv2.dnn.readNetFromDarknet(config_path, weights_path)
        
        # Determine only the output layer names
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
                
        logger.info("YOLO model initialized successfully")
        return net, output_layers, LABELS
    except Exception as e:
        logger.error(f"Failed to initialize YOLO model: {str(e)}")
        return None, None, None

# Try to initialize YOLO
yolo_net, yolo_output_layers, yolo_labels = initialize_yolo()

def process_car_image(image_path):
    """
    Process a car image to detect make and model
    Returns dict with detected make and model
    """
    logger.info(f"Processing car image: {image_path}")
    
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        return {"error": "Image not found"}
    
    # If we don't have the car classifier, return empty result
    if not CAR_CLASSIFIER_AVAILABLE or not car_classifier:
        logger.warning("Car classifier not available, skipping make/model detection")
        return {"make": "Unknown", "model": "Unknown", "confidence": 0}
    
    try:
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            logger.error("Failed to read image")
            return {"error": "Failed to read image"}
        
        # Use car classifier to detect make and model
        predictions = car_classifier.predict(image)
        
        if predictions and len(predictions) > 0:
            # Return the top prediction
            top_prediction = predictions[0]
            return {
                "make": top_prediction['make'],
                "model": top_prediction['model'],
                "confidence": float(top_prediction['prob'])
            }
        else:
            logger.warning("No make/model detected")
            return {"make": "Unknown", "model": "Unknown", "confidence": 0}
    
    except Exception as e:
        logger.exception(f"Error processing car image: {str(e)}")
        return {"error": str(e)}

def process_plate_image(image_path):
    """
    Process a license plate image to detect the plate number
    Returns dict with detected plate number
    """
    logger.info(f"Processing license plate image: {image_path}")
    
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        return {"error": "Image not found"}
    
    try:
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            logger.error("Failed to read image")
            return {"error": "Failed to read image"}
        
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
        
        # If we couldn't find a license plate contour
        if NumberPlateCnt is None:
            logger.info("No license plate found in the image")
            return {"plate_number": "", "confidence": 0, "message": "No license plate found"}
        
        # Mask the part other than the number plate
        mask = np.zeros(gray.shape, np.uint8)
        
        # Draw the license plate contour on the mask
        cv2.drawContours(mask, [NumberPlateCnt], 0, 255, -1)
        
        # Bitwise-AND with the original image to extract only the license plate
        new_image = cv2.bitwise_and(image, image, mask=mask)
        
        # Use Tesseract OCR to read the text
        try:
            import pytesseract
            
            # Try different Tesseract configurations for better results
            configs = [
                '--oem 1 --psm 7',  # Single line of text
                '--oem 1 --psm 8',  # Single word
                '--oem 1 --psm 10',  # Single character
                '--oem 1 --psm 11',  # Sparse text
                '--oem 1 --psm 6',   # Assume a single uniform block of text
            ]
            
            results = []
            
            # Try different image processing techniques and OCR configs
            for config in configs:
                text = pytesseract.image_to_string(new_image, config=config)
                text = text.replace('\n', '').replace('\f', '').strip()
                if text:
                    results.append(text)
            
            # For binary threshold version
            _, plate_binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
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
                return {"plate_number": result, "confidence": 0.8}
            else:
                logger.info("No text could be recognized from the license plate")
                return {"plate_number": "", "confidence": 0, "message": "Could not read text from plate"}
                
        except ImportError:
            logger.warning("Tesseract OCR not available")
            return {"error": "OCR software not available"}
    
    except Exception as e:
        logger.exception(f"Error processing license plate image: {str(e)}")
        return {"error": str(e)}

def detect_objects_in_image(image_path):
    """
    Detect objects in an image using YOLO
    Returns list of detected objects with bounding boxes
    """
    logger.info(f"Detecting objects in image: {image_path}")
    
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        return {"error": "Image not found"}
    
    if not yolo_net or not yolo_output_layers:
        logger.error("YOLO model not initialized")
        return {"error": "Object detection model not available"}
    
    try:
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            logger.error("Failed to read image")
            return {"error": "Failed to read image"}
        
        # Get image dimensions
        (H, W) = image.shape[:2]
        
        # Construct a blob from the input image
        blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416),
            swapRB=True, crop=False)
        yolo_net.setInput(blob)
        
        # Run forward pass
        outputs = yolo_net.forward(yolo_output_layers)
        
        # Initialize lists of detected bounding boxes, confidences, and class IDs
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
                if confidence > 0.5:
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
        idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.3)
        
        # Prepare result list
        results = []
        
        if len(idxs) > 0:
            # Handle different return formats from NMSBoxes
            if isinstance(idxs, tuple):
                idxs = idxs[0]  # For some OpenCV versions
                
            # Process the indices
            for i in (idxs.flatten() if hasattr(idxs, 'flatten') else idxs):
                # Get the bounding box coordinates
                [x, y, w, h] = boxes[i]
                
                # Ensure coordinates are within image bounds
                x = max(0, x)
                y = max(0, y)
                w = min(w, W - x)
                h = min(h, H - y)
                
                # Add to results
                if classIDs[i] < len(yolo_labels):
                    class_name = yolo_labels[classIDs[i]]
                else:
                    class_name = f"Unknown-{classIDs[i]}"
                    
                results.append({
                    "class": class_name,
                    "confidence": confidences[i],
                    "bbox": [x, y, w, h]
                })
        
        return {"objects": results}
    
    except Exception as e:
        logger.exception(f"Error detecting objects: {str(e)}")
        return {"error": str(e)}