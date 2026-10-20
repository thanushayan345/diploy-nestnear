"""Booking request endpoints for students and owners."""
from flask import Blueprint, g, jsonify, request

from database import get_db, transaction
from security import ApiError, error_response, role_required
from validators import clean_text, validate_booking

bp = Blueprint("bookings", __name__, url_prefix="/api")


def image_url(filename):
    return f"/uploads/{filename}" if filename else None


# ------------------------------------------------------------- Student ----
@bp.post("/bookings")
@role_required("student")
def create_booking():
    data = request.get_json(silent=True) or {}
    cleaned, errors = validate_booking(data)
    if errors:
        return error_response("Please fix the highlighted fields.", 400, errors)

    db = get_db()
    acc = db.execute(
        "SELECT id, is_available, available_rooms FROM accommodations WHERE id = ?",
        (cleaned["accommodation_id"],),
    ).fetchone()
    if acc is None:
        return error_response("Accommodation not found.", 404)
    if not acc["is_available"] or acc["available_rooms"] <= 0:
        return error_response("This accommodation is not accepting bookings right now.", 409)

    duplicate = db.execute(
        """SELECT 1 FROM booking_requests
           WHERE accommodation_id = ? AND student_id = ? AND status IN ('Pending', 'Accepted')""",
        (acc["id"], g.user["id"]),
    ).fetchone()
    if duplicate:
        return error_response(
            "You already have a pending or accepted request for this accommodation.", 409
        )

    cursor = db.execute(
        """INSERT INTO booking_requests (accommodation_id, student_id, move_in_date, message, status)
           VALUES (?, ?, ?, ?, 'Pending')""",
        (acc["id"], g.user["id"], cleaned["move_in_date"], cleaned["message"]),
    )
    db.commit()
    booking = db.execute("SELECT * FROM booking_requests WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify({"booking": dict(booking), "message": "Booking request sent."}), 201


@bp.get("/student/bookings")
@role_required("student")
def student_bookings():
    rows = get_db().execute(
        """SELECT b.id, b.accommodation_id, b.move_in_date, b.message, b.status, b.created_at,
                  a.title, a.town, a.district, a.nearby_university, a.monthly_rent, a.deposit,
                  a.image_filename, a.address, a.contact_phone, a.latitude, a.longitude,
                  a.approx_latitude, a.approx_longitude, u.full_name AS owner_name
           FROM booking_requests b
           JOIN accommodations a ON a.id = b.accommodation_id
           JOIN users u ON u.id = a.owner_id
           WHERE b.student_id = ?
           ORDER BY b.created_at DESC, b.id DESC""",
        (g.user["id"],),
    ).fetchall()

    bookings = []
    for r in rows:
        item = {
            "id": r["id"],
            "accommodation_id": r["accommodation_id"],
            "move_in_date": r["move_in_date"],
            "message": r["message"],
            "status": r["status"],
            "created_at": r["created_at"],
            "accommodation": {
                "title": r["title"],
                "town": r["town"],
                "district": r["district"],
                "nearby_university": r["nearby_university"],
                "monthly_rent": r["monthly_rent"],
                "deposit": r["deposit"],
                "approx_latitude": r["approx_latitude"],
                "approx_longitude": r["approx_longitude"],
                "image_url": image_url(r["image_filename"]),
            },
        }
        # Private contact details and exact coordinates only after the owner accepts.
        if r["status"] == "Accepted":
            item["accommodation"]["address"] = r["address"]
            item["accommodation"]["contact_phone"] = r["contact_phone"]
            item["accommodation"]["owner_name"] = r["owner_name"]
            item["accommodation"]["latitude"] = r["latitude"]
            item["accommodation"]["longitude"] = r["longitude"]
        bookings.append(item)
    return jsonify({"bookings": bookings})


@bp.patch("/bookings/<int:booking_id>/cancel")
@role_required("student")
def cancel_booking(booking_id):
    db = get_db()
    booking = db.execute(
        "SELECT id, student_id, status FROM booking_requests WHERE id = ?", (booking_id,)
    ).fetchone()
    if booking is None or booking["student_id"] != g.user["id"]:
        return error_response("Booking request not found.", 404)
    if booking["status"] != "Pending":
        return error_response("Only pending requests can be cancelled.", 409)

    db.execute(
        "UPDATE booking_requests SET status = 'Cancelled' WHERE id = ? AND status = 'Pending'",
        (booking_id,),
    )
    db.commit()
    return jsonify({"message": "Booking request cancelled.", "status": "Cancelled"})


# --------------------------------------------------------------- Owner ----
@bp.get("/owner/bookings")
@role_required("owner")
def owner_bookings():
    status = clean_text(request.args.get("status"))
    params = [g.user["id"]]
    status_sql = ""
    if status:
        if status not in ("Pending", "Accepted", "Rejected", "Cancelled"):
            return error_response("Unknown status filter.", 400)
        status_sql = "AND b.status = ?"
        params.append(status)

    rows = get_db().execute(
        f"""SELECT b.id, b.accommodation_id, b.move_in_date, b.message, b.status, b.created_at,
                   a.title, a.town, a.available_rooms, a.is_available, a.image_filename,
                   s.full_name AS student_name, s.email AS student_email, s.phone AS student_phone
            FROM booking_requests b
            JOIN accommodations a ON a.id = b.accommodation_id
            JOIN users s ON s.id = b.student_id
            WHERE a.owner_id = ? {status_sql}
            ORDER BY CASE b.status WHEN 'Pending' THEN 0 ELSE 1 END,
                     b.created_at DESC, b.id DESC""",
        params,
    ).fetchall()

    bookings = []
    for r in rows:
        item = {
            "id": r["id"],
            "accommodation_id": r["accommodation_id"],
            "move_in_date": r["move_in_date"],
            "message": r["message"],
            "status": r["status"],
            "created_at": r["created_at"],
            "student": {"full_name": r["student_name"]},
            "accommodation": {
                "title": r["title"],
                "town": r["town"],
                "available_rooms": r["available_rooms"],
                "is_available": bool(r["is_available"]),
                "image_url": image_url(r["image_filename"]),
            },
        }
        # The student's contact details are shared once the owner accepts.
        if r["status"] == "Accepted":
            item["student"]["email"] = r["student_email"]
            item["student"]["phone"] = r["student_phone"]
        bookings.append(item)
    return jsonify({"bookings": bookings})


@bp.patch("/bookings/<int:booking_id>/status")
@role_required("owner")
def update_booking_status(booking_id):
    data = request.get_json(silent=True) or {}
    new_status = clean_text(data.get("status"))
    if new_status not in ("Accepted", "Rejected"):
        return error_response("Status must be 'Accepted' or 'Rejected'.", 400)

    db = get_db()
    with transaction(db):
        booking = db.execute(
            """SELECT b.id, b.status, b.student_id, b.accommodation_id, b.move_in_date,
                      a.owner_id, a.available_rooms, a.is_available
               FROM booking_requests b
               JOIN accommodations a ON a.id = b.accommodation_id
               WHERE b.id = ?""",
            (booking_id,),
        ).fetchone()

        if booking is None or booking["owner_id"] != g.user["id"]:
            raise ApiError("Booking request not found.", 404)
        if booking["status"] != "Pending":
            raise ApiError(f"This request is already {booking['status'].lower()}.", 409)

        if new_status == "Accepted":
            if not booking["is_available"] or booking["available_rooms"] <= 0:
                raise ApiError(
                    "No rooms are available for this listing. Update availability before accepting.",
                    409,
                )
            # Prevent conflicting confirmed bookings where move-in dates overlap
            # (within a 30-day monthly rental period for the same student).
            conflict = db.execute(
                """SELECT 1 FROM booking_requests
                   WHERE student_id = ?
                     AND status = 'Accepted'
                     AND id != ?
                     AND ABS(julianday(move_in_date) - julianday(?)) < 30""",
                (booking["student_id"], booking_id, booking["move_in_date"]),
            ).fetchone()
            if conflict:
                raise ApiError(
                    "This student already has a confirmed booking with overlapping dates.",
                    409,
                )
            # Reserve one room. Mark the listing unavailable when it is full.
            db.execute(
                """UPDATE accommodations
                   SET available_rooms = available_rooms - 1,
                       is_available = CASE WHEN available_rooms - 1 <= 0 THEN 0 ELSE is_available END
                   WHERE id = ?""",
                (booking["accommodation_id"],),
            )

        db.execute(
            "UPDATE booking_requests SET status = ? WHERE id = ? AND status = 'Pending'",
            (new_status, booking_id),
        )

    return jsonify({"message": f"Booking request {new_status.lower()}.", "status": new_status})
