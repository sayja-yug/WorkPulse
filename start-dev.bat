@echo off
title WorkPulse Development Server Launcher
echo ==========================================================
echo Starting WorkPulse Workforce SaaS Development Servers
echo ==========================================================

echo [1/2] Starting Django REST Backend on http://localhost:8000 ...
start "WorkPulse Backend (Django)" cmd /k "cd backend && call venv\Scripts\activate.bat && python manage.py runserver 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Vite Frontend on http://localhost:5173 ...
start "WorkPulse Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo ==========================================================
echo Both servers are launching!
echo Backend API Docs: http://localhost:8000/api/docs/
echo Frontend App:     http://localhost:5173/
echo ==========================================================
pause

