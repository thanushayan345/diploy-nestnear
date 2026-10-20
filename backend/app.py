"""NestNear backend - Flask REST API.

Run with:  python app.py
"""
import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import database
from routes.accommodations import bp as accommodations_bp
from routes.auth import bp as auth_bp
from routes.bookings import bp as bookings_bp
from security import ApiError, csrf_protect, error_response, load_current_user

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def env_bool(name, default):
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def resolve_path(path):
    """Relative paths in .env are relative to the backend folder."""
    return path if os.path.isabs(path) else os.path.join(BASE_DIR, path)


def create_app(test_config=None):
    app = Flask(__name__, instance_path=os.path.join(BASE_DIR, "instance"))

    secret_key = os.environ.get("SECRET_KEY")
    if not secret_key or secret_key == "change-me-to-a-long-random-string":
        # A random key works for development, but everyone is logged out
        # whenever the server restarts. Set SECRET_KEY in .env to avoid this.
        secret_key = secrets.token_hex(32)
        print("WARNING: SECRET_KEY is not set in backend/.env - using a temporary key.")

    app.config.update(
        SECRET_KEY=secret_key,
        DATABASE=resolve_path(os.environ.get("DATABASE_PATH", "instance/nestnear.sqlite3")),
        UPLOAD_FOLDER=resolve_path(os.environ.get("UPLOAD_FOLDER", "uploads")),
        MAX_CONTENT_LENGTH=int(os.environ.get("MAX_UPLOAD_MB", "5")) * 1024 * 1024,
        SEED_SAMPLE_DATA=env_bool("SEED_SAMPLE_DATA", True),
        FRONTEND_ORIGIN=os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
        # Secure session cookie settings
        SESSION_COOKIE_HTTPONLY=True,  # JavaScript cannot read the cookie
        SESSION_COOKIE_SAMESITE="Lax",  # not sent on cross-site POST requests
        SESSION_COOKIE_SECURE=env_bool("SESSION_COOKIE_SECURE", False),  # HTTPS only
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    )
    if test_config:
        app.config.update(test_config)

    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    origins = [o.strip() for o in app.config["FRONTEND_ORIGIN"].split(",") if o.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )

    database.init_app(app)

    # Run before every request: CSRF check first, then load the user.
    app.before_request(csrf_protect)
    app.before_request(load_current_user)

    app.register_blueprint(auth_bp)
    app.register_blueprint(accommodations_bp)
    app.register_blueprint(bookings_bp)

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        # send_from_directory refuses paths outside the uploads folder.
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename, max_age=3600)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    # Serve the built React frontend (frontend/dist) in production (e.g. Render)
    frontend_dist = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/") or path.startswith("uploads/"):
            return error_response("The requested resource was not found.", 404)
        if os.path.isdir(frontend_dist):
            candidate = os.path.join(frontend_dist, path)
            if path and os.path.isfile(candidate):
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, "index.html")
        return {
            "service": "NestNear API",
            "status": "running",
            "hint": "Run 'npm run build' in frontend/ to serve the UI from Flask.",
        }

    register_error_handlers(app)
    return app


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        return error_response(err.message, err.status, err.errors, err.code)

    @app.errorhandler(413)
    def handle_too_large(_err):
        return error_response("The upload is too large. Photos must be smaller than 3 MB.", 413)

    @app.errorhandler(HTTPException)
    def handle_http_error(err):
        if request.path.startswith("/api/"):
            messages = {
                404: "The requested resource was not found.",
                405: "This action is not allowed on this address.",
            }
            return error_response(messages.get(err.code, err.description), err.code)
        return err

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        app.logger.exception("Unexpected error: %s", err)
        return error_response("Something went wrong on the server. Please try again.", 500)


app = create_app()

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.environ.get("PORT", "5000")),
        debug=env_bool("FLASK_DEBUG", False),
    )
