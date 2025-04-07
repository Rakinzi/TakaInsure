from ultralytics import YOLO
import cv2

model = YOLO('yasirfaizahmed/license-plate-object-detection')

results = model('Car.jpg')
print(results.show())
