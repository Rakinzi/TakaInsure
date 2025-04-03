from flask import Flask

def create_app():
    app = Flask(__name__)
    
    from app.blueprints.whatsapp import whatsapp_bp
    
    app.register_blueprint(whatsapp_bp, url_prefix='/api/whatsapp')
    
    @app.route('/')
    def index():
        return "Insurance WhatsApp API is running!"
    
    return app