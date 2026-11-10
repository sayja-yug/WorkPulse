# WorkPulse - Workforce Management SaaS Platform

A comprehensive, production-grade workforce management, attendance, payroll, and business management SaaS application.

## Features

- 🏢 **Multi-Tenant Business Management** - Multiple businesses with branches, departments, and designations
- 👥 **Employee Management** - Complete employee lifecycle management with documents and history
- 📋 **Attendance Management** - Manual, GPS, and selfie-based attendance with geofencing
- 🔄 **Shift Management** - Fixed, rotational, night, and flexible shifts with roster management
- 🏖️ **Leave Management** - Configurable leave types, policies, balances, and approval workflows
- 💰 **Payroll Management** - Salary structures, payroll runs, approvals, and payslip generation
- 💵 **Advances & Loans** - Salary advances, employee loans, and repayment tracking
- 📊 **Expense & Cashbook** - Business expenses, cash transactions, and financial tracking
- 📈 **Reports & Analytics** - Comprehensive reports with PDF and Excel export
- 🔔 **Notifications** - In-app, email notifications for all business events
- 🔐 **RBAC** - 11 predefined roles with dynamic permissions and custom roles
- 📱 **Responsive Design** - Desktop, tablet, and mobile optimized

## Technology Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- TanStack Query
- React Hook Form + Zod
- Recharts
- Lucide React Icons

### Backend
- Python 3.11+
- Django 5.x
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- JWT Authentication
- drf-spectacular (OpenAPI)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements/development.txt
cp .env.example .env      # Configure your environment
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure API URL
npm run dev
```

### Demo Accounts
After running `seed_demo_data`, see `docs/DEMO_ACCOUNTS.md` for login credentials.

## Project Structure
```
pagarbook/
├── frontend/          # React/TypeScript application
├── backend/           # Django REST API
├── docs/              # Project documentation
├── docker-compose.yml # Local development setup
└── README.md
```

## Documentation
- [System Requirements (SRS)](docs/SRS.md)
- [System Design](docs/SYSTEM_DESIGN.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Database ERD](docs/DATABASE_ERD.md)
- [RBAC Matrix](docs/RBAC_MATRIX.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Security Design](docs/SECURITY_DESIGN.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License
Proprietary - All rights reserved.

