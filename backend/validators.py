"""Backend validation and geographic helpers for all incoming data.

Each validate_* function returns (cleaned_data, errors). `errors` is a
dictionary of field name -> message which the frontend shows under each field.
"""
import math
import re
from datetime import date, timedelta

from constants import (
    ACCOMMODATION_TYPES,
    DISTRICTS,
    FACILITIES,
    GENDER_PREFERENCES,
    ROLES,
    UNIVERSITIES,
)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
# Sri Lankan numbers: 0771234567 or +94771234567
PHONE_RE = re.compile(r"^(?:\+94|0)\d{9}$")

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_IMAGE_BYTES = 3 * 1024 * 1024  # 3 MB

# Sri Lanka geographic bounding box (with small coastal buffer)
SL_MIN_LAT, SL_MAX_LAT = 5.80, 10.00
SL_MIN_LNG, SL_MAX_LNG = 79.40, 82.00

# Grid size (~450m) used to round public coordinates so exact homes stay private
APPROX_GRID_DEG = 0.004


def clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def normalize_phone(value):
    return re.sub(r"[\s\-()]", "", clean_text(value))


def check_length(value, field, label, errors, min_len, max_len):
    if len(value) < min_len:
        errors[field] = f"{label} must be at least {min_len} characters."
    elif len(value) > max_len:
        errors[field] = f"{label} must be at most {max_len} characters."


def parse_int(value, field, label, errors, min_value, max_value):
    text = clean_text(value).replace(",", "")
    try:
        number = int(text)
    except ValueError:
        errors[field] = f"{label} must be a whole number."
        return None
    if number < min_value or number > max_value:
        errors[field] = f"{label} must be between {min_value:,} and {max_value:,}."
        return None
    return number


def parse_bool(value):
    return clean_text(value).lower() in ("1", "true", "yes", "on")


def compute_approx_coordinates(latitude, longitude):
    """Snap exact coordinates to a ~450m neighborhood grid for public display.

    This protects the owner's exact house location before a booking is accepted
    while still allowing students to browse nearby areas and approximate distance.
    """
    if latitude is None or longitude is None:
        return None, None
    approx_lat = round(round(float(latitude) / APPROX_GRID_DEG) * APPROX_GRID_DEG, 4)
    approx_lng = round(round(float(longitude) / APPROX_GRID_DEG) * APPROX_GRID_DEG, 4)
    return approx_lat, approx_lng


def haversine_km(lat1, lon1, lat2, lon2):
    """Return great-circle distance in kilometers between two (lat, lng) points."""
    if None in (lat1, lon1, lat2, lon2):
        return None
    radius_earth_km = 6371.0
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    d_phi = math.radians(float(lat2) - float(lat1))
    d_lambda = math.radians(float(lon2) - float(lon1))

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(radius_earth_km * c, 2)


def parse_coordinates(raw_lat, raw_lng, errors):
    """Validate optional or provided latitude and longitude values."""
    lat_str = clean_text(raw_lat)
    lng_str = clean_text(raw_lng)

    if not lat_str and not lng_str:
        return None, None

    if not lat_str or not lng_str:
        errors["location"] = "Please provide both latitude and longitude, or pin the location on the map."
        return None, None

    try:
        lat = round(float(lat_str), 6)
        lng = round(float(lng_str), 6)
    except ValueError:
        errors["location"] = "Latitude and longitude must be valid decimal coordinates."
        return None, None

    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        errors["location"] = "Coordinates are outside valid latitude/longitude ranges."
        return None, None

    if not (SL_MIN_LAT <= lat <= SL_MAX_LAT and SL_MIN_LNG <= lng <= SL_MAX_LNG):
        errors["location"] = (
            "Selected map pin must be located within Sri Lanka "
            f"(latitude {SL_MIN_LAT}–{SL_MAX_LAT}, longitude {SL_MIN_LNG}–{SL_MAX_LNG})."
        )
        return None, None

    return lat, lng


# ------------------------------------------------------------- Users ------
def validate_registration(data):
    errors = {}
    full_name = clean_text(data.get("full_name"))
    email = clean_text(data.get("email")).lower()
    phone = normalize_phone(data.get("phone"))
    password = data.get("password")
    role = clean_text(data.get("role")).lower()

    check_length(full_name, "full_name", "Full name", errors, 2, 100)

    if not EMAIL_RE.match(email) or len(email) > 254:
        errors["email"] = "Enter a valid email address."

    if not PHONE_RE.match(phone):
        errors["phone"] = "Enter a valid Sri Lankan phone number, e.g. 0771234567."

    if not isinstance(password, str):
        password = ""
    if len(password) < 8:
        errors["password"] = "Password must be at least 8 characters."
    elif len(password) > 128:
        errors["password"] = "Password must be at most 128 characters."
    elif not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        errors["password"] = "Password must contain at least one letter and one number."

    if role not in ROLES:
        errors["role"] = "Choose either Student or Owner."

    cleaned = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "password": password,
        "role": role,
    }
    return cleaned, errors


# ------------------------------------------------------ Accommodations ----
def validate_accommodation(form):
    """Validate the accommodation form (sent as multipart/form-data)."""
    errors = {}

    title = clean_text(form.get("title"))
    description = clean_text(form.get("description"))
    accommodation_type = clean_text(form.get("accommodation_type"))
    district = clean_text(form.get("district"))
    town = clean_text(form.get("town"))
    nearby_university = clean_text(form.get("nearby_university"))
    gender_preference = clean_text(form.get("gender_preference")) or "Any"
    address = clean_text(form.get("address"))
    contact_phone = normalize_phone(form.get("contact_phone"))
    is_available = parse_bool(form.get("is_available", "true"))

    check_length(title, "title", "Title", errors, 5, 120)
    check_length(description, "description", "Description", errors, 20, 3000)
    check_length(town, "town", "Town", errors, 2, 80)
    check_length(address, "address", "Address", errors, 5, 255)

    if accommodation_type not in ACCOMMODATION_TYPES:
        errors["accommodation_type"] = "Choose Room, Boarding House or Annex."
    if district not in DISTRICTS:
        errors["district"] = "Choose a valid district."
    if nearby_university not in UNIVERSITIES:
        errors["nearby_university"] = "Choose a university from the list."
    if gender_preference not in GENDER_PREFERENCES:
        errors["gender_preference"] = "Choose Any, Male or Female."
    if not PHONE_RE.match(contact_phone):
        errors["contact_phone"] = "Enter a valid Sri Lankan phone number, e.g. 0771234567."

    monthly_rent = parse_int(form.get("monthly_rent"), "monthly_rent", "Monthly rent", errors, 1000, 500000)
    deposit = parse_int(form.get("deposit", "0"), "deposit", "Deposit", errors, 0, 2000000)
    available_rooms = parse_int(form.get("available_rooms"), "available_rooms", "Available rooms", errors, 0, 100)

    latitude, longitude = parse_coordinates(
        form.get("latitude"), form.get("longitude"), errors
    )
    approx_latitude, approx_longitude = compute_approx_coordinates(latitude, longitude)

    # Facilities may arrive as several "facilities" fields or one comma list.
    raw_facilities = form.getlist("facilities") if hasattr(form, "getlist") else form.get("facilities", [])
    if isinstance(raw_facilities, str):
        raw_facilities = [raw_facilities]
    facilities = []
    for item in raw_facilities:
        for part in str(item).split(","):
            part = part.strip()
            if part and part not in facilities:
                facilities.append(part)
    invalid = [f for f in facilities if f not in FACILITIES]
    if invalid:
        errors["facilities"] = "Unknown facility: " + ", ".join(invalid[:3])

    if is_available and available_rooms == 0:
        errors["available_rooms"] = "Add at least 1 available room, or mark the listing as not available."

    cleaned = {
        "title": title,
        "description": description,
        "accommodation_type": accommodation_type,
        "district": district,
        "town": town,
        "nearby_university": nearby_university,
        "monthly_rent": monthly_rent,
        "deposit": deposit,
        "facilities": ",".join(facilities),
        "available_rooms": available_rooms,
        "gender_preference": gender_preference,
        "address": address,
        "contact_phone": contact_phone,
        "latitude": latitude,
        "longitude": longitude,
        "approx_latitude": approx_latitude,
        "approx_longitude": approx_longitude,
        "is_available": 1 if is_available else 0,
    }
    return cleaned, errors


def validate_image(file_storage, required):
    """Check an uploaded photo. Returns (extension, error_message)."""
    if file_storage is None or not file_storage.filename:
        return None, ("Please upload a photo." if required else None)

    filename = file_storage.filename
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return None, "Photo must be a JPG, PNG or WEBP image."

    stream = file_storage.stream
    stream.seek(0, 2)
    size = stream.tell()
    stream.seek(0)
    if size == 0:
        return None, "The photo file is empty."
    if size > MAX_IMAGE_BYTES:
        return None, "Photo must be smaller than 3 MB."

    # Check the real file content ("magic bytes"), not only the file name.
    header = stream.read(12)
    stream.seek(0)
    is_jpeg = header[:3] == b"\xff\xd8\xff"
    is_png = header[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    if ext in ("jpg", "jpeg") and is_jpeg:
        return "jpg", None
    if ext == "png" and is_png:
        return "png", None
    if ext == "webp" and is_webp:
        return "webp", None
    return None, "The file content is not a valid JPG, PNG or WEBP image."


# ------------------------------------------------------------ Bookings ----
def validate_booking(data):
    errors = {}
    try:
        accommodation_id = int(data.get("accommodation_id"))
    except (TypeError, ValueError):
        accommodation_id = None
        errors["accommodation_id"] = "Invalid accommodation."

    move_in_text = clean_text(data.get("move_in_date"))
    move_in_date = None
    try:
        move_in_date = date.fromisoformat(move_in_text)
    except ValueError:
        errors["move_in_date"] = "Choose a valid move-in date."
    if move_in_date:
        today = date.today()
        if move_in_date < today:
            errors["move_in_date"] = "Move-in date cannot be in the past."
        elif move_in_date > today + timedelta(days=365):
            errors["move_in_date"] = "Move-in date must be within the next 12 months."

    message = clean_text(data.get("message"))
    if len(message) > 1000:
        errors["message"] = "Message must be at most 1000 characters."

    cleaned = {
        "accommodation_id": accommodation_id,
        "move_in_date": move_in_date.isoformat() if move_in_date else None,
        "message": message,
    }
    return cleaned, errors
