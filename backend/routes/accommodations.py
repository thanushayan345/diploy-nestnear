"""Accommodation endpoints: search, details, create, update, delete."""
import os
import uuid

from flask import Blueprint, current_app, g, jsonify, request

from constants import (
    ACCOMMODATION_TYPES,
    DISTRICTS,
    FACILITIES,
    GENDER_PREFERENCES,
    UNIVERSITIES,
    UNIVERSITY_BY_NAME,
    UNIVERSITY_DATA,
)
from database import get_db
from security import ApiError, error_response, role_required
from validators import (
    clean_text,
    compute_approx_coordinates,
    haversine_km,
    validate_accommodation,
    validate_image,
)

bp = Blueprint("accommodations", __name__, url_prefix="/api")

# Columns that anyone may see. Exact address, contact_phone, latitude and
# longitude are NEVER selected in public queries.
PUBLIC_COLUMNS = """
    a.id, a.title, a.description, a.accommodation_type, a.district, a.town,
    a.nearby_university, a.monthly_rent, a.deposit, a.facilities,
    a.available_rooms, a.gender_preference, a.approx_latitude, a.approx_longitude,
    a.image_filename, a.is_available, a.created_at
"""

SORT_OPTIONS = {
    "newest": "a.created_at DESC, a.id DESC",
    "price_asc": "a.monthly_rent ASC, a.id DESC",
    "price_desc": "a.monthly_rent DESC, a.id DESC",
}


def accommodation_to_dict(row, include_private=False, reference_university=None):
    """Convert a database row to JSON. Private fields only when allowed."""
    row_keys = row.keys()
    approx_lat = row["approx_latitude"] if "approx_latitude" in row_keys else None
    approx_lng = row["approx_longitude"] if "approx_longitude" in row_keys else None

    target_uni_name = reference_university or row["nearby_university"]
    uni_info = UNIVERSITY_BY_NAME.get(target_uni_name) or UNIVERSITY_BY_NAME.get(
        row["nearby_university"]
    )

    # Calculate distance using public approximate coordinates for browsing so
    # exact hidden coordinates cannot be trilaterated by public users.
    distance_km = None
    if uni_info and approx_lat is not None and approx_lng is not None:
        distance_km = haversine_km(
            approx_lat, approx_lng, uni_info["latitude"], uni_info["longitude"]
        )

    nearby_uni_meta = UNIVERSITY_BY_NAME.get(row["nearby_university"])

    data = {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "accommodation_type": row["accommodation_type"],
        "district": row["district"],
        "town": row["town"],
        "nearby_university": row["nearby_university"],
        "university_coordinates": (
            {
                "latitude": nearby_uni_meta["latitude"],
                "longitude": nearby_uni_meta["longitude"],
            }
            if nearby_uni_meta
            else None
        ),
        "monthly_rent": row["monthly_rent"],
        "deposit": row["deposit"],
        "facilities": [f for f in (row["facilities"] or "").split(",") if f],
        "available_rooms": row["available_rooms"],
        "gender_preference": row["gender_preference"],
        "approx_latitude": approx_lat,
        "approx_longitude": approx_lng,
        "distance_km": distance_km,
        "image_url": f"/uploads/{row['image_filename']}" if row["image_filename"] else None,
        "is_available": bool(row["is_available"]),
        "created_at": row["created_at"],
    }
    if include_private:
        data["address"] = row["address"]
        data["contact_phone"] = row["contact_phone"]
        data["latitude"] = row["latitude"] if "latitude" in row_keys else None
        data["longitude"] = row["longitude"] if "longitude" in row_keys else None
    return data


def get_owned_accommodation(accommodation_id):
    """Fetch a listing and make sure the logged-in owner owns it."""
    row = get_db().execute("SELECT * FROM accommodations WHERE id = ?", (accommodation_id,)).fetchone()
    if row is None:
        raise ApiError("Accommodation not found.", 404)
    if row["owner_id"] != g.user["id"]:
        raise ApiError("You can only manage your own listings.", 403, code="forbidden")
    return row


def save_image(file_storage, ext):
    """Save the photo with a random, safe filename and return that name."""
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_storage.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
    return filename


def remove_image(filename):
    if not filename:
        return
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], os.path.basename(filename))
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError:
        current_app.logger.warning("Could not delete image %s", filename)


def like_pattern(text):
    """Build a safe LIKE pattern (escape % and _ typed by the user)."""
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def parse_optional_int(name):
    value = clean_text(request.args.get(name))
    if not value:
        return None
    try:
        return max(0, int(value))
    except ValueError:
        raise ApiError(f"'{name}' must be a whole number.", 400)


def parse_optional_float(name):
    value = clean_text(request.args.get(name))
    if not value:
        return None
    try:
        num = float(value)
        if num <= 0:
            raise ValueError
        return num
    except ValueError:
        raise ApiError(f"'{name}' must be a positive number.", 400)


# ------------------------------------------------------------- Options ----
@bp.get("/options")
def options():
    """Dropdown values and verified university coordinates for the frontend."""
    return jsonify(
        {
            "districts": DISTRICTS,
            "universities": UNIVERSITIES,
            "university_details": UNIVERSITY_DATA,
            "accommodation_types": ACCOMMODATION_TYPES,
            "gender_preferences": GENDER_PREFERENCES,
            "facilities": FACILITIES,
        }
    )


# -------------------------------------------------------------- Search ----
@bp.get("/accommodations")
def list_accommodations():
    args = request.args
    where = []
    params = []

    q = clean_text(args.get("q"))[:100]
    if q:
        where.append(
            "(a.title LIKE ? ESCAPE '\\' OR a.town LIKE ? ESCAPE '\\' "
            "OR a.district LIKE ? ESCAPE '\\' OR a.nearby_university LIKE ? ESCAPE '\\')"
        )
        params += [like_pattern(q)] * 4

    district = clean_text(args.get("district"))
    if district:
        where.append("a.district = ? COLLATE NOCASE")
        params.append(district)

    town = clean_text(args.get("town"))[:80]
    if town:
        where.append("a.town LIKE ? ESCAPE '\\'")
        params.append(like_pattern(town))

    university = clean_text(args.get("university"))
    radius_km = parse_optional_float("radius_km")
    selected_uni_meta = UNIVERSITY_BY_NAME.get(university) if university else None

    # When a university is selected without a radius filter, filter directly by
    # nearby_university. When a radius filter IS provided, we evaluate Haversine
    # distance from the selected university across all candidate listings so
    # nearby listings in adjacent towns within that radius are also discovered.
    if university and not (selected_uni_meta and radius_km is not None):
        where.append("a.nearby_university = ?")
        params.append(university)

    acc_type = clean_text(args.get("type"))
    if acc_type:
        where.append("a.accommodation_type = ?")
        params.append(acc_type)

    gender = clean_text(args.get("gender"))
    if gender in ("Male", "Female"):
        where.append("a.gender_preference IN (?, 'Any')")
        params.append(gender)

    min_rent = parse_optional_int("min_rent")
    if min_rent is not None:
        where.append("a.monthly_rent >= ?")
        params.append(min_rent)

    max_rent = parse_optional_int("max_rent")
    if max_rent is not None:
        where.append("a.monthly_rent <= ?")
        params.append(max_rent)

    if args.get("available_only", "").lower() in ("1", "true", "yes"):
        where.append("a.is_available = 1 AND a.available_rooms > 0")

    sort_key = clean_text(args.get("sort")) or "newest"
    order_by = SORT_OPTIONS.get(sort_key, SORT_OPTIONS["newest"])
    limit = min(parse_optional_int("limit") or 60, 100)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    sql = f"SELECT {PUBLIC_COLUMNS} FROM accommodations a {where_sql} ORDER BY {order_by} LIMIT ?"
    rows = get_db().execute(sql, params + [limit]).fetchall()

    results = []
    for row in rows:
        item = accommodation_to_dict(
            row,
            include_private=False,
            reference_university=university if selected_uni_meta else None,
        )
        if selected_uni_meta and radius_km is not None:
            dist = item.get("distance_km")
            if dist is not None:
                if dist > radius_km:
                    continue
            elif item["nearby_university"] != university:
                continue
        results.append(item)

    if sort_key == "nearest":
        results.sort(
            key=lambda x: (
                x["distance_km"] is None,
                x["distance_km"] if x["distance_km"] is not None else 999999,
                -x["id"],
            )
        )

    return jsonify(
        {
            "accommodations": results,
            "selected_university": selected_uni_meta,
        }
    )


# ------------------------------------------------------------- Details ----
@bp.get("/accommodations/<int:accommodation_id>")
def get_accommodation(accommodation_id):
    db = get_db()
    row = db.execute("SELECT * FROM accommodations WHERE id = ?", (accommodation_id,)).fetchone()
    if row is None:
        return error_response("Accommodation not found.", 404)

    user = g.user
    is_owner = bool(user and user["role"] == "owner" and row["owner_id"] == user["id"])
    my_booking = None
    has_accepted_booking = False

    if user and user["role"] == "student":
        booking = db.execute(
            """SELECT id, status, move_in_date, created_at FROM booking_requests
               WHERE accommodation_id = ? AND student_id = ?
               ORDER BY id DESC LIMIT 1""",
            (accommodation_id, user["id"]),
        ).fetchone()
        if booking:
            my_booking = dict(booking)
        has_accepted_booking = (
            db.execute(
                """SELECT 1 FROM booking_requests
                   WHERE accommodation_id = ? AND student_id = ? AND status = 'Accepted'""",
                (accommodation_id, user["id"]),
            ).fetchone()
            is not None
        )

    # Exact address, phone, and exact coordinates: only the owner, or a student
    # whose booking was accepted.
    data = accommodation_to_dict(row, include_private=is_owner or has_accepted_booking)
    if has_accepted_booking:
        owner = db.execute("SELECT full_name FROM users WHERE id = ?", (row["owner_id"],)).fetchone()
        data["owner_name"] = owner["full_name"] if owner else None

    data["is_owner"] = is_owner
    data["my_booking"] = my_booking
    return jsonify({"accommodation": data})


# ------------------------------------------------------- Owner listings ---
@bp.get("/owner/accommodations")
@role_required("owner")
def owner_accommodations():
    rows = get_db().execute(
        """SELECT a.*,
                  (SELECT COUNT(*) FROM booking_requests b
                    WHERE b.accommodation_id = a.id AND b.status = 'Pending') AS pending_requests
           FROM accommodations a
           WHERE a.owner_id = ?
           ORDER BY a.created_at DESC, a.id DESC""",
        (g.user["id"],),
    ).fetchall()
    result = []
    for row in rows:
        item = accommodation_to_dict(row, include_private=True)
        item["pending_requests"] = row["pending_requests"]
        result.append(item)
    return jsonify({"accommodations": result})


@bp.post("/accommodations")
@role_required("owner")
def create_accommodation():
    cleaned, errors = validate_accommodation(request.form)
    image = request.files.get("image")
    ext, image_error = validate_image(image, required=True)
    if image_error:
        errors["image"] = image_error
    if errors:
        return error_response("Please fix the highlighted fields.", 400, errors)

    filename = save_image(image, ext)
    db = get_db()
    try:
        cursor = db.execute(
            """INSERT INTO accommodations
               (owner_id, title, description, accommodation_type, district, town,
                nearby_university, monthly_rent, deposit, facilities, available_rooms,
                gender_preference, address, contact_phone, latitude, longitude,
                approx_latitude, approx_longitude, image_filename, is_available)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                g.user["id"], cleaned["title"], cleaned["description"],
                cleaned["accommodation_type"], cleaned["district"], cleaned["town"],
                cleaned["nearby_university"], cleaned["monthly_rent"], cleaned["deposit"],
                cleaned["facilities"], cleaned["available_rooms"], cleaned["gender_preference"],
                cleaned["address"], cleaned["contact_phone"],
                cleaned["latitude"], cleaned["longitude"],
                cleaned["approx_latitude"], cleaned["approx_longitude"],
                filename, cleaned["is_available"],
            ),
        )
        db.commit()
    except Exception:
        remove_image(filename)  # do not leave orphan files behind
        raise

    row = db.execute("SELECT * FROM accommodations WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify({"accommodation": accommodation_to_dict(row, include_private=True)}), 201


@bp.put("/accommodations/<int:accommodation_id>")
@role_required("owner")
def update_accommodation(accommodation_id):
    existing = get_owned_accommodation(accommodation_id)

    cleaned, errors = validate_accommodation(request.form)
    image = request.files.get("image")
    ext, image_error = validate_image(image, required=False)
    if image_error:
        errors["image"] = image_error
    if errors:
        return error_response("Please fix the highlighted fields.", 400, errors)

    # Preserve existing coordinates if none were sent in the update payload
    lat = cleaned["latitude"] if cleaned["latitude"] is not None else existing["latitude"]
    lng = cleaned["longitude"] if cleaned["longitude"] is not None else existing["longitude"]
    approx_lat, approx_lng = compute_approx_coordinates(lat, lng)

    new_filename = save_image(image, ext) if ext else None
    db = get_db()
    try:
        db.execute(
            """UPDATE accommodations SET
                 title = ?, description = ?, accommodation_type = ?, district = ?, town = ?,
                 nearby_university = ?, monthly_rent = ?, deposit = ?, facilities = ?,
                 available_rooms = ?, gender_preference = ?, address = ?, contact_phone = ?,
                 latitude = ?, longitude = ?, approx_latitude = ?, approx_longitude = ?,
                 image_filename = ?, is_available = ?
               WHERE id = ? AND owner_id = ?""",
            (
                cleaned["title"], cleaned["description"], cleaned["accommodation_type"],
                cleaned["district"], cleaned["town"], cleaned["nearby_university"],
                cleaned["monthly_rent"], cleaned["deposit"], cleaned["facilities"],
                cleaned["available_rooms"], cleaned["gender_preference"], cleaned["address"],
                cleaned["contact_phone"], lat, lng, approx_lat, approx_lng,
                new_filename or existing["image_filename"],
                cleaned["is_available"], accommodation_id, g.user["id"],
            ),
        )
        db.commit()
    except Exception:
        remove_image(new_filename)
        raise

    if new_filename:
        remove_image(existing["image_filename"])

    row = db.execute("SELECT * FROM accommodations WHERE id = ?", (accommodation_id,)).fetchone()
    return jsonify({"accommodation": accommodation_to_dict(row, include_private=True)})


@bp.patch("/accommodations/<int:accommodation_id>/availability")
@role_required("owner")
def update_availability(accommodation_id):
    existing = get_owned_accommodation(accommodation_id)
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get("is_available"), bool):
        return error_response("'is_available' must be true or false.", 400)
    new_available = 1 if data["is_available"] else 0
    new_rooms = existing["available_rooms"]
    if new_available == 1 and new_rooms <= 0:
        new_rooms = 1
    db = get_db()
    db.execute(
        "UPDATE accommodations SET is_available = ?, available_rooms = ? WHERE id = ? AND owner_id = ?",
        (new_available, new_rooms, accommodation_id, g.user["id"]),
    )
    db.commit()
    row = db.execute("SELECT * FROM accommodations WHERE id = ?", (accommodation_id,)).fetchone()
    return jsonify({"accommodation": accommodation_to_dict(row, include_private=True)})


@bp.delete("/accommodations/<int:accommodation_id>")
@role_required("owner")
def delete_accommodation(accommodation_id):
    existing = get_owned_accommodation(accommodation_id)
    db = get_db()
    # Booking requests for this listing are removed automatically (ON DELETE CASCADE).
    db.execute(
        "DELETE FROM accommodations WHERE id = ? AND owner_id = ?",
        (accommodation_id, g.user["id"]),
    )
    db.commit()
    remove_image(existing["image_filename"])
    return jsonify({"message": "Listing deleted."})
