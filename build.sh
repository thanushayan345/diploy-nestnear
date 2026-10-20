#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Installing Python backend dependencies ---"
pip install -r backend/requirements.txt

echo "--- Installing Node packages and building React frontend ---"
npm --prefix frontend install
npm --prefix frontend run build
