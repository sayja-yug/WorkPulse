# WorkPulse Deployment Guide & Infrastructure Architecture

## 1. Production Architecture Overview
- **Frontend:** Vercel / Netlify / Cloudflare Pages (Static SPA with edge caching and HTML5 push-state rewrites)
- **Backend:** Render / Railway / AWS ECS (Gunicorn WSGI server running behind Nginx / Cloudflare reverse proxy)
- **Database:** Neon Serverless PostgreSQL / AWS RDS PostgreSQL 15+ with connection pooling (PgBouncer)
- **Cache & Async Queue:** Upstash Redis / Redis Cloud 7+
- **Object Storage:** AWS S3 / Cloudflare R2 / MinIO for KYC docs, selfie clock-ins, receipts, and generated PDF payslips.

---

## 2. Environment Configuration

### Backend Environment Variables (`.env.production`)
```ini
DEBUG=False
SECRET_KEY=production-crypto-strong-random-key-64-bytes
ALLOWED_HOSTS=api.workpulse.com,workpulse-api.onrender.com
DATABASE_URL=postgresql://user:pass@ep-cool-db.us-east-2.aws.neon.tech/workpulse?sslmode=require
REDIS_URL=rediss://default:token@cool-redis.upstash.io:6379
JWT_SIGNING_KEY=another-strong-crypto-key
CORS_ALLOWED_ORIGINS=https://app.workpulse.com,https://workpulse.vercel.app
CSRF_TRUSTED_ORIGINS=https://app.workpulse.com,https://workpulse.vercel.app
USE_S3=True
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
AWS_STORAGE_BUCKET_NAME=workpulse-production-assets
AWS_S3_REGION_NAME=ap-south-1
SENTRY_DSN=https://example@sentry.io/123456
DEFAULT_FROM_EMAIL=notifications@workpulse.com
```

### Frontend Environment Variables (`.env.production`)
```ini
VITE_API_BASE_URL=https://api.workpulse.com/api/v1
VITE_APP_TITLE=WorkPulse
```

---

## 3. Deployment Steps

### Backend on Render
1. Connect GitHub repository to Render Web Service.
2. Build command:
   ```bash
   pip install -r backend/requirements/production.txt && python backend/manage.py collectstatic --noinput
   ```
3. Start command:
   ```bash
   cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 120
   ```
4. Add Pre-Deploy Command:
   ```bash
   python backend/manage.py migrate
   ```

### Frontend on Vercel
1. Set Root Directory to `frontend`.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Configure `vercel.json` SPA rewrite:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Production Readiness Checklist
- [x] HTTPS enforced everywhere with HSTS enabled
- [x] Zero hardcoded secrets in repository
- [x] Database migrations verified against PostgreSQL
- [x] Multi-tenant isolation verified with automated test suites
- [x] Rate limiting active on authentication endpoints (30/min anon, 120/min auth)
- [x] Health check endpoint `/api/health/` returns database connectivity status
- [x] Dockerfile & docker-compose configurations ready for containerized execution

