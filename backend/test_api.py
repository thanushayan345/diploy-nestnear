"""Automated tests for the NestNear Flask API, including coordinates, privacy, and radius search."""
import io
import os
import sqlite3
import tempfile
import unittest
from datetime import date, timedelta

from app import create_app

# Minimal valid PNG header + 1x1 pixel bytes
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
    b"\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


class NestNearApiTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.sqlite3")
        self.uploads = os.path.join(self.tmpdir.name, "uploads")
        self.app = create_app(
            {
                "TESTING": True,
                "DATABASE": self.db_path,
                "UPLOAD_FOLDER": self.uploads,
                "SEED_SAMPLE_DATA": True,
                "SECRET_KEY": "test-secret-key",
            }
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    def client_with_csrf(self):
        client = self.app.test_client()
        res = client.get("/api/csrf-token")
        token = res.get_json()["csrf_token"]
        return client, {"X-CSRF-Token": token}

    def login(self, email, password):
        client, headers = self.client_with_csrf()
        res = client.post("/api/login", json={"email": email, "password": password}, headers=headers)
        self.assertEqual(res.status_code, 200, res.get_json())
        token = res.get_json()["csrf_token"]
        return client, {"X-CSRF-Token": token}

    def test_seed_and_public_listing_privacy(self):
        client = self.app.test_client()
        res = client.get("/api/accommodations")
        self.assertEqual(res.status_code, 200)
        items = res.get_json()["accommodations"]
        self.assertGreaterEqual(len(items), 10)
        # Public listing responses must NEVER expose address, contact_phone, or exact latitude/longitude
        for item in items:
            self.assertNotIn("address", item)
            self.assertNotIn("contact_phone", item)
            self.assertNotIn("latitude", item)
            self.assertNotIn("longitude", item)
            self.assertIsNotNone(item["approx_latitude"])
            self.assertIsNotNone(item["approx_longitude"])
            self.assertIsNotNone(item["distance_km"])

        # Public detail endpoint must also hide address, contact_phone, and exact coordinates
        detail = client.get(f"/api/accommodations/{items[0]['id']}").get_json()["accommodation"]
        self.assertNotIn("address", detail)
        self.assertNotIn("contact_phone", detail)
        self.assertNotIn("latitude", detail)
        self.assertNotIn("longitude", detail)
        self.assertIsNotNone(detail["approx_latitude"])

    def test_register_login_and_role_checks(self):
        client, headers = self.client_with_csrf()
        # Missing CSRF token is rejected
        no_csrf = client.post("/api/login", json={"email": "student@nestnear.lk", "password": "Student123"})
        self.assertEqual(no_csrf.status_code, 403)

        # Register a new student
        reg = client.post(
            "/api/register",
            json={
                "full_name": "Kasun Jayawardena",
                "email": "kasun@student.lk",
                "phone": "0779876543",
                "password": "Password123",
                "role": "student",
            },
            headers=headers,
        )
        self.assertEqual(reg.status_code, 201, reg.get_json())
        data = reg.get_json()
        self.assertEqual(data["user"]["role"], "student")
        self.assertNotIn("password_hash", data["user"])
        headers = {"X-CSRF-Token": data["csrf_token"]}

        # Student cannot access owner endpoints
        owner_only = client.get("/api/owner/accommodations")
        self.assertEqual(owner_only.status_code, 403)
        post_acc = client.post("/api/accommodations", data={"title": "Test"}, headers=headers)
        self.assertEqual(post_acc.status_code, 403)

    def test_owner_crud_coordinates_and_ownership_protection(self):
        owner1, h1 = self.login("owner@nestnear.lk", "Owner1234")
        owner2, h2 = self.login("owner2@nestnear.lk", "Owner1234")

        # Create listing with valid PNG upload and coordinates
        form_data = {
            "title": "Bright single room near University of Colombo",
            "description": "Clean and quiet single room on Reid Avenue with fast Wi-Fi and study desk.",
            "accommodation_type": "Room",
            "district": "Colombo",
            "town": "Colombo 03",
            "nearby_university": "University of Colombo",
            "monthly_rent": "20000",
            "deposit": "40000",
            "facilities": "Wi-Fi,Study Table,Fan",
            "available_rooms": "1",
            "gender_preference": "Any",
            "address": "99 Reid Avenue, Colombo 03",
            "contact_phone": "0771234567",
            "latitude": "6.902456",
            "longitude": "79.861234",
            "is_available": "true",
            "image": (io.BytesIO(VALID_PNG_BYTES), "room.png"),
        }
        create_res = owner1.post(
            "/api/accommodations",
            data=form_data,
            headers=h1,
            content_type="multipart/form-data",
        )
        self.assertEqual(create_res.status_code, 201, create_res.get_json())
        acc = create_res.get_json()["accommodation"]
        acc_id = acc["id"]
        # Owner sees exact coordinates and rounded approx coordinates
        self.assertAlmostEqual(acc["latitude"], 6.902456, places=5)
        self.assertAlmostEqual(acc["longitude"], 79.861234, places=5)
        self.assertNotEqual(acc["approx_latitude"], acc["latitude"])

        # Out-of-Sri-Lanka coordinates are rejected with 400
        invalid_coords = dict(form_data)
        invalid_coords["latitude"] = "51.5074"
        invalid_coords["longitude"] = "-0.1278"
        invalid_coords["image"] = (io.BytesIO(VALID_PNG_BYTES), "room.png")
        bad_coord_res = owner1.post(
            "/api/accommodations",
            data=invalid_coords,
            headers=h1,
            content_type="multipart/form-data",
        )
        self.assertEqual(bad_coord_res.status_code, 400)
        self.assertIn("location", bad_coord_res.get_json()["errors"])

        # Owner 2 cannot edit or delete Owner 1's listing
        del_res = owner2.delete(f"/api/accommodations/{acc_id}", headers=h2)
        self.assertEqual(del_res.status_code, 403)

        # Fake image (text file renamed to .png) is rejected
        bad_form = dict(form_data)
        bad_form["image"] = (io.BytesIO(b"not a real png"), "fake.png")
        bad_res = owner1.put(
            f"/api/accommodations/{acc_id}",
            data=bad_form,
            headers=h1,
            content_type="multipart/form-data",
        )
        self.assertEqual(bad_res.status_code, 400)

        # Owner 1 can delete their own listing
        ok_del = owner1.delete(f"/api/accommodations/{acc_id}", headers=h1)
        self.assertEqual(ok_del.status_code, 200)

    def test_university_radius_search_and_nearest_sort(self):
        client = self.app.test_client()
        res = client.get(
            "/api/accommodations?university=University+of+Peradeniya&radius_km=5&sort=nearest"
        )
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["selected_university"]["name"], "University of Peradeniya")
        items = body["accommodations"]
        self.assertGreaterEqual(len(items), 2)
        distances = [item["distance_km"] for item in items]
        self.assertEqual(distances, sorted(distances))
        for d in distances:
            self.assertLessEqual(d, 5.0)

    def test_backward_compatible_migration(self):
        # Create an old-schema database without coordinate columns and verify
        # create_app() migrates it and backfills sample coordinates cleanly.
        legacy_db = os.path.join(self.tmpdir.name, "legacy.sqlite3")
        conn = sqlite3.connect(legacy_db)
        conn.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE accommodations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                accommodation_type TEXT NOT NULL,
                district TEXT NOT NULL,
                town TEXT NOT NULL,
                nearby_university TEXT NOT NULL,
                monthly_rent INTEGER NOT NULL,
                deposit INTEGER NOT NULL DEFAULT 0,
                facilities TEXT NOT NULL DEFAULT '',
                available_rooms INTEGER NOT NULL DEFAULT 1,
                gender_preference TEXT NOT NULL DEFAULT 'Any',
                address TEXT NOT NULL,
                contact_phone TEXT NOT NULL,
                image_filename TEXT,
                is_available INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.close()

        migrated_app = create_app(
            {
                "TESTING": True,
                "DATABASE": legacy_db,
                "UPLOAD_FOLDER": self.uploads,
                "SEED_SAMPLE_DATA": True,
                "SECRET_KEY": "test-secret",
            }
        )
        res = migrated_app.test_client().get("/api/accommodations")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.get_json()["accommodations"]), 10)

    def test_booking_workflow_and_privacy_unlock(self):
        student, hs = self.login("student@nestnear.lk", "Student123")
        owner1, ho = self.login("owner@nestnear.lk", "Owner1234")

        # Find an available 1-room listing owned by owner1 (listing #1)
        detail_before = student.get("/api/accommodations/1").get_json()["accommodation"]
        self.assertNotIn("address", detail_before)
        self.assertNotIn("contact_phone", detail_before)
        self.assertNotIn("latitude", detail_before)

        move_in = (date.today() + timedelta(days=15)).isoformat()
        book_res = student.post(
            "/api/bookings",
            json={
                "accommodation_id": 1,
                "move_in_date": move_in,
                "message": "I am a final-year engineering student looking for a quiet room.",
            },
            headers=hs,
        )
        self.assertEqual(book_res.status_code, 201, book_res.get_json())
        booking_id = book_res.get_json()["booking"]["id"]

        # While Pending, student still cannot see address/phone
        pending_list = student.get("/api/student/bookings").get_json()["bookings"]
        this_booking = [b for b in pending_list if b["id"] == booking_id][0]
        self.assertNotIn("address", this_booking["accommodation"])

        # Owner accepts the booking
        accept_res = owner1.patch(
            f"/api/bookings/{booking_id}/status",
            json={"status": "Accepted"},
            headers=ho,
        )
        self.assertEqual(accept_res.status_code, 200, accept_res.get_json())

        # Now student CAN see exact address, contact phone, and exact coordinates!
        detail_after = student.get("/api/accommodations/1").get_json()["accommodation"]
        self.assertIn("address", detail_after)
        self.assertIn("contact_phone", detail_after)
        self.assertIn("latitude", detail_after)
        self.assertIn("longitude", detail_after)

        # And listing #1 (which had 1 room) now has 0 available rooms and is_available=False
        self.assertEqual(detail_after["available_rooms"], 0)
        self.assertFalse(detail_after["is_available"])

        # Accepting another overlapping booking for the same student is blocked
        overlap_res = owner1.patch(
            "/api/bookings/1/status",
            json={"status": "Accepted"},
            headers=ho,
        )
        self.assertEqual(overlap_res.status_code, 409)


if __name__ == "__main__":
    unittest.main()
