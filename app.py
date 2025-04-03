from app import create_app
from dotenv import load_dotenv
import os
import logging

load_dotenv()

# Set LOG_LEVEL environment variable if not set
if "LOG_LEVEL" not in os.environ:
    os.environ["LOG_LEVEL"] = "DEBUG"

# Create the Flask application
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    
    logging.info(f"Starting application on port {port} with debug={debug}")
    app.run(host="0.0.0.0", port=port, debug=debug)