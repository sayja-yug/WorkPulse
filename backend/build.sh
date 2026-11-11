#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing production python dependencies..."
pip install --upgrade pip
pip install -r requirements/production.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Applying PostgreSQL database migrations..."
python manage.py migrate

echo "Initializing system roles and permission contracts..."
python manage.py init_system

echo "Seeding verified role accounts..."
python manage.py seed_role_accounts

echo "Backend build completed successfully!"
