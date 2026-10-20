"""Sample development data for NestNear with real Sri Lankan coordinates.

The data is inserted automatically the first time the backend starts (when
the users table is empty and SEED_SAMPLE_DATA=true). Existing databases are
also backfilled with coordinates if any sample listing has NULL coordinates.

To delete the database and start fresh, run:
    python seed.py --reset
"""
import os
import shutil
import sys
from datetime import date, timedelta

from werkzeug.security import generate_password_hash

from validators import compute_approx_coordinates

SAMPLE_IMAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_images")

DEMO_PASSWORD_STUDENT = "Student123"
DEMO_PASSWORD_OWNER = "Owner1234"

USERS = [
    # (full_name, email, phone, password, role)
    ("Nimal Perera", "owner@nestnear.lk", "0771234567", DEMO_PASSWORD_OWNER, "owner"),
    ("Fathima Rizwan", "owner2@nestnear.lk", "0712345678", DEMO_PASSWORD_OWNER, "owner"),
    ("Kavindi Silva", "student@nestnear.lk", "0761122334", DEMO_PASSWORD_STUDENT, "student"),
]

# owner index refers to USERS above
LISTINGS = [
    {
        "owner": 0, "image": "room1", "type": "Room",
        "title": "Quiet single room near University of Moratuwa",
        "description": "A peaceful single room in a family home, a 7-minute walk to the University of Moratuwa main gate. Ideal for engineering students who need a calm place to study. Shared bathroom with one other student.",
        "district": "Colombo", "town": "Katubedda", "university": "University of Moratuwa",
        "rent": 18000, "deposit": 36000, "rooms": 1, "gender": "Male",
        "facilities": "Wi-Fi,Furniture,Study Table,Fan,Water Included",
        "address": "42/3 Station Road, Katubedda, Moratuwa", "phone": "0771234567",
        "latitude": 6.7982, "longitude": 79.8986,
    },
    {
        "owner": 0, "image": "boarding1", "type": "Boarding House",
        "title": "Girls' boarding house - Nugegoda, close to USJ",
        "description": "Safe two-storey boarding house for female students of the University of Sri Jayewardenepura. CCTV at the entrance, a resident caretaker and meals available on request. Bus stop to Gangodawila is just outside.",
        "district": "Colombo", "town": "Nugegoda", "university": "University of Sri Jayewardenepura",
        "rent": 22000, "deposit": 44000, "rooms": 4, "gender": "Female",
        "facilities": "Wi-Fi,Furniture,Kitchen Access,Meals Provided,CCTV,Laundry,Water Included",
        "address": "15 Pagoda Road, Nugegoda", "phone": "0771234567",
        "latitude": 6.8614, "longitude": 79.8992,
    },
    {
        "owner": 0, "image": "annex2", "type": "Annex",
        "title": "Furnished annex in Colombo 07 for two students",
        "description": "Fully furnished annex with a small kitchenette, attached bathroom and separate entrance. A 10-minute walk to the University of Colombo faculties. Suitable for two friends sharing.",
        "district": "Colombo", "town": "Colombo 07", "university": "University of Colombo",
        "rent": 55000, "deposit": 110000, "rooms": 1, "gender": "Any",
        "facilities": "Wi-Fi,Attached Bathroom,Furniture,Kitchen Access,Air Conditioning,Hot Water,Parking",
        "address": "8A Rosmead Place, Colombo 07", "phone": "0771234567",
        "latitude": 6.9083, "longitude": 79.8654,
    },
    {
        "owner": 0, "image": "room2", "type": "Room",
        "title": "Shared twin room - Dalugama, University of Kelaniya",
        "description": "Spacious twin room shared by two students, with mosquito nets, a wardrobe and two study tables. Five minutes from the University of Kelaniya back gate. Electricity and water bills are included.",
        "district": "Gampaha", "town": "Dalugama", "university": "University of Kelaniya",
        "rent": 12000, "deposit": 24000, "rooms": 2, "gender": "Male",
        "facilities": "Furniture,Study Table,Fan,Water Included,Electricity Included",
        "address": "120 Temple Road, Dalugama, Kelaniya", "phone": "0771234567",
        "latitude": 6.9765, "longitude": 79.9188,
    },
    {
        "owner": 0, "image": "boarding2", "type": "Boarding House",
        "title": "Student boarding with meals - Malabe, near SLIIT",
        "description": "Popular boarding house for SLIIT students with breakfast and dinner included. Common kitchen, fast Wi-Fi and a laundry area. Walking distance to the SLIIT Malabe campus.",
        "district": "Colombo", "town": "Malabe", "university": "SLIIT",
        "rent": 28000, "deposit": 28000, "rooms": 3, "gender": "Any",
        "facilities": "Wi-Fi,Meals Provided,Kitchen Access,Laundry,CCTV,Furniture",
        "address": "33 New Kandy Road, Malabe", "phone": "0771234567",
        "latitude": 6.9118, "longitude": 79.9695,
    },
    {
        "owner": 1, "image": "annex1", "type": "Annex",
        "title": "Garden annex in Peradeniya with mountain views",
        "description": "Cosy annex surrounded by a tropical garden, 15 minutes by bus from the University of Peradeniya. Separate entrance, attached bathroom with hot water and a small pantry area.",
        "district": "Kandy", "town": "Peradeniya", "university": "University of Peradeniya",
        "rent": 25000, "deposit": 50000, "rooms": 1, "gender": "Female",
        "facilities": "Wi-Fi,Attached Bathroom,Hot Water,Furniture,Kitchen Access",
        "address": "56 Galaha Road, Peradeniya", "phone": "0712345678",
        "latitude": 7.2612, "longitude": 80.5948,
    },
    {
        "owner": 1, "image": "room1", "type": "Room",
        "title": "Budget room for Peradeniya undergraduates",
        "description": "Simple and affordable room close to the Peradeniya town bus stand. Shared kitchen and bathroom. Great for first-year students looking for a low-cost option.",
        "district": "Kandy", "town": "Peradeniya", "university": "University of Peradeniya",
        "rent": 9500, "deposit": 19000, "rooms": 2, "gender": "Male",
        "facilities": "Fan,Kitchen Access,Water Included,Study Table",
        "address": "21 Esplanade Road, Peradeniya", "phone": "0712345678",
        "latitude": 7.2665, "longitude": 80.5921,
    },
    {
        "owner": 1, "image": "boarding1", "type": "Boarding House",
        "title": "Boarding house near University of Ruhuna, Wellamadama",
        "description": "Clean boarding house 5 minutes from the Wellamadama premises of the University of Ruhuna. Sea breeze, shared kitchen and plenty of study space in each room.",
        "district": "Matara", "town": "Wellamadama", "university": "University of Ruhuna",
        "rent": 11000, "deposit": 22000, "rooms": 5, "gender": "Any",
        "facilities": "Wi-Fi,Furniture,Kitchen Access,Study Table,Fan",
        "address": "7 Beach Road, Wellamadama, Matara", "phone": "0712345678",
        "latitude": 5.9415, "longitude": 80.5732,
    },
    {
        "owner": 1, "image": "room2", "type": "Room",
        "title": "Room in Thirunelvely, walk to University of Jaffna",
        "description": "Well-ventilated room in a quiet lane in Thirunelvely, a short walk to the University of Jaffna. Home-cooked meals can be arranged with the family.",
        "district": "Jaffna", "town": "Thirunelvely", "university": "University of Jaffna",
        "rent": 10000, "deposit": 20000, "rooms": 1, "gender": "Female",
        "facilities": "Fan,Furniture,Meals Provided,Water Included",
        "address": "14 Palaly Road, Thirunelvely, Jaffna", "phone": "0712345678",
        "latitude": 9.6882, "longitude": 80.0249,
    },
    {
        "owner": 0, "image": "annex2", "type": "Annex",
        "title": "Modern annex in Belihuloya for Sabaragamuwa students",
        "description": "Newly built annex with attached bathroom, kitchenette and parking for a motorbike. Close to Sabaragamuwa University of Sri Lanka and surrounded by greenery.",
        "district": "Ratnapura", "town": "Belihuloya", "university": "Sabaragamuwa University of Sri Lanka",
        "rent": 16000, "deposit": 32000, "rooms": 1, "gender": "Any",
        "facilities": "Attached Bathroom,Kitchen Access,Parking,Furniture,Fan",
        "address": "3 Pambahinna Road, Belihuloya", "phone": "0771234567",
        "latitude": 6.7118, "longitude": 80.7845,
    },
    {
        "owner": 1, "image": "boarding2", "type": "Boarding House",
        "title": "Mihintale boarding for Rajarata University students",
        "description": "Friendly boarding house near the Rajarata University Mihintale premises. Common kitchen and dining area, fans in every room and water included in the rent.",
        "district": "Anuradhapura", "town": "Mihintale", "university": "Rajarata University of Sri Lanka",
        "rent": 8500, "deposit": 17000, "rooms": 0, "gender": "Male",
        "facilities": "Kitchen Access,Fan,Water Included,Furniture",
        "address": "88 Jaffna Road, Mihintale", "phone": "0712345678", "available": False,
        "latitude": 8.3534, "longitude": 80.5068,
    },
    {
        "owner": 0, "image": "room1", "type": "Room",
        "title": "Single room in Badulla near Uva Wellassa University",
        "description": "Comfortable single room with a study desk and Wi-Fi, a 10-minute ride to Uva Wellassa University. Cool climate and a quiet neighbourhood.",
        "district": "Badulla", "town": "Badulla", "university": "Uva Wellassa University",
        "rent": 13000, "deposit": 26000, "rooms": 1, "gender": "Any",
        "facilities": "Wi-Fi,Study Table,Furniture,Hot Water",
        "address": "19 Passara Road, Badulla", "phone": "0771234567",
        "latitude": 6.9852, "longitude": 81.0725,
    },
]


def copy_sample_image(name, index, upload_folder):
    """Copy a sample photo into the uploads folder and return its new name."""
    for ext in ("jpg", "jpeg", "png", "webp"):
        source = os.path.join(SAMPLE_IMAGE_DIR, f"{name}.{ext}")
        if os.path.isfile(source):
            filename = f"sample-{index:02d}-{name}.{ext}"
            os.makedirs(upload_folder, exist_ok=True)
            shutil.copyfile(source, os.path.join(upload_folder, filename))
            return filename
    return None  # the frontend shows a placeholder when there is no photo


def backfill_sample_coordinates(conn):
    """Backfill coordinates on existing sample listings after a schema migration."""
    by_title = {item["title"]: item for item in LISTINGS}
    rows = conn.execute(
        "SELECT id, title, latitude, longitude FROM accommodations WHERE latitude IS NULL"
    ).fetchall()
    updated = 0
    for row in rows:
        sample = by_title.get(row["title"])
        if sample:
            lat = sample["latitude"]
            lng = sample["longitude"]
            approx_lat, approx_lng = compute_approx_coordinates(lat, lng)
            conn.execute(
                """UPDATE accommodations
                   SET latitude = ?, longitude = ?, approx_latitude = ?, approx_longitude = ?
                   WHERE id = ?""",
                (lat, lng, approx_lat, approx_lng, row["id"]),
            )
            updated += 1
    if updated:
        conn.commit()


def seed_sample_data(conn, upload_folder):
    """Insert demo users, listings and one booking if the database is empty."""
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0:
        backfill_sample_coordinates(conn)
        return

    user_ids = []
    for full_name, email, phone, password, role in USERS:
        cur = conn.execute(
            "INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
            (full_name, email, phone, generate_password_hash(password), role),
        )
        user_ids.append(cur.lastrowid)

    listing_ids = []
    for index, item in enumerate(LISTINGS, start=1):
        lat = item["latitude"]
        lng = item["longitude"]
        approx_lat, approx_lng = compute_approx_coordinates(lat, lng)
        cur = conn.execute(
            """INSERT INTO accommodations
               (owner_id, title, description, accommodation_type, district, town,
                nearby_university, monthly_rent, deposit, facilities, available_rooms,
                gender_preference, address, contact_phone, latitude, longitude,
                approx_latitude, approx_longitude, image_filename, is_available,
                created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                       datetime('now', ?))""",
            (
                user_ids[item["owner"]], item["title"], item["description"], item["type"],
                item["district"], item["town"], item["university"], item["rent"],
                item["deposit"], item["facilities"], item["rooms"], item["gender"],
                item["address"], item["phone"], lat, lng, approx_lat, approx_lng,
                copy_sample_image(item["image"], index, upload_folder),
                1 if item.get("available", True) else 0,
                f"-{len(LISTINGS) - index} hours",  # newer listings appear first
            ),
        )
        listing_ids.append(cur.lastrowid)

    # One pending request so the owner dashboard has something to show.
    conn.execute(
        """INSERT INTO booking_requests (accommodation_id, student_id, move_in_date, message, status)
           VALUES (?, ?, ?, ?, 'Pending')""",
        (
            listing_ids[1],
            user_ids[2],
            (date.today() + timedelta(days=21)).isoformat(),
            "Hello! I am a second-year student at USJ and would like to move in next month.",
        ),
    )
    conn.commit()
    print("Sample data added: 3 demo users and", len(LISTINGS), "listings.")


if __name__ == "__main__":
    if "--reset" not in sys.argv:
        print("Usage: python seed.py --reset   (deletes the database and recreates it)")
        sys.exit(0)

    from app import resolve_path  # noqa: E402

    db_path = resolve_path(os.environ.get("DATABASE_PATH", "instance/nestnear.sqlite3"))
    upload_folder = resolve_path(os.environ.get("UPLOAD_FOLDER", "uploads"))
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Deleted", db_path)
    for name in os.listdir(upload_folder) if os.path.isdir(upload_folder) else []:
        if name.startswith("sample-"):
            os.remove(os.path.join(upload_folder, name))

    import database  # noqa: E402
    from flask import Flask  # noqa: E402

    temp_app = Flask(__name__)
    temp_app.config.update(DATABASE=db_path, UPLOAD_FOLDER=upload_folder, SEED_SAMPLE_DATA=True)
    database.init_db(temp_app)
    print("Database recreated at", db_path)
