"""SQLite database helpers with backward-compatible schema migrations.

All SQL connection handling lives in this file so that another SQL database
could be introduced later by changing only this module (and the SQL syntax).
"""
import os
import sqlite3
from contextlib import contextmanager

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('student', 'owner')),
    created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accommodations (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id           INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title              TEXT    NOT NULL,
    description        TEXT    NOT NULL,
    accommodation_type TEXT    NOT NULL
                       CHECK (accommodation_type IN ('Room', 'Boarding House', 'Annex')),
    district           TEXT    NOT NULL,
    town               TEXT    NOT NULL,
    nearby_university  TEXT    NOT NULL,
    monthly_rent       INTEGER NOT NULL CHECK (monthly_rent > 0),
    deposit            INTEGER NOT NULL DEFAULT 0 CHECK (deposit >= 0),
    facilities         TEXT    NOT NULL DEFAULT '',
    available_rooms    INTEGER NOT NULL DEFAULT 1 CHECK (available_rooms >= 0),
    gender_preference  TEXT    NOT NULL DEFAULT 'Any'
                       CHECK (gender_preference IN ('Any', 'Male', 'Female')),
    address            TEXT    NOT NULL,
    contact_phone      TEXT    NOT NULL,
    latitude           REAL,
    longitude          REAL,
    approx_latitude    REAL,
    approx_longitude   REAL,
    image_filename     TEXT,
    is_available       INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
    created_at         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_requests (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    accommodation_id INTEGER NOT NULL REFERENCES accommodations (id) ON DELETE CASCADE,
    student_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    move_in_date     TEXT    NOT NULL,
    message          TEXT    NOT NULL DEFAULT '',
    status           TEXT    NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled')),
    created_at       TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accommodations_owner ON accommodations (owner_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_search
    ON accommodations (district, nearby_university, monthly_rent);
CREATE INDEX IF NOT EXISTS idx_bookings_accommodation ON booking_requests (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON booking_requests (student_id);
"""


def connect(path):
    """Open a new SQLite connection with foreign keys turned on."""
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row  # rows behave like dictionaries
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    """Return the database connection for the current request."""
    if "db" not in g:
        g.db = connect(current_app.config["DATABASE"])
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


@contextmanager
def transaction(db):
    """Run several statements as one all-or-nothing transaction.

    BEGIN IMMEDIATE locks the database for writing, so two owners cannot
    accept the last room at the same moment.
    """
    if db.in_transaction:
        db.commit()
    db.execute("BEGIN IMMEDIATE")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise


def run_migrations(conn):
    """Safely add new columns to existing SQLite databases without losing data."""
    columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(accommodations)").fetchall()
    }
    new_columns = [
        ("latitude", "REAL"),
        ("longitude", "REAL"),
        ("approx_latitude", "REAL"),
        ("approx_longitude", "REAL"),
    ]
    for col_name, col_type in new_columns:
        if col_name not in columns:
            conn.execute(
                f"ALTER TABLE accommodations ADD COLUMN {col_name} {col_type}"
            )
    conn.commit()


def init_db(app):
    """Create the database file and tables if they do not exist yet."""
    db_path = app.config["DATABASE"]
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA)
        run_migrations(conn)
        conn.commit()
        if app.config.get("SEED_SAMPLE_DATA"):
            from seed import seed_sample_data  # imported here to avoid a circular import

            seed_sample_data(conn, app.config["UPLOAD_FOLDER"])
    finally:
        conn.close()


def init_app(app):
    """Register database helpers with the Flask app."""
    app.teardown_appcontext(close_db)
    init_db(app)
