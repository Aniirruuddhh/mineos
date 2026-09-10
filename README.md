# MineOS

MineOS is a hackathon MVP for reporting, triaging, and auditing mine-compliance violations.

## Run the complete demo with Docker

Install and start Docker Desktop, then run this command from the repository root:

```sh
docker compose up --build
```

On the first run, Docker creates PostgreSQL, applies the schema migrations, seeds demo data, creates the three demo accounts, starts the API with PDF OCR support, and starts all four dashboards. The first build can take a few minutes.

Open the dashboards in a browser:

- Corporate: `http://localhost:3000`
- Field report: `http://localhost:3001`
- Violation detail: `http://localhost:3002/?id=1`
- Manager: `http://localhost:3003`

Sign in first at `http://localhost:5050/login`. Use `manager@mineos.local`, `corporate@mineos.local`, or `regulator@mineos.local`; the default password is `MineOSDemo2026!`.

To stop the demo, press `Ctrl+C`, then run:

```sh
docker compose down
```

This retains the database. To erase all Docker demo data and start with a new database, run `docker compose down -v`; this deletes the PostgreSQL and uploaded-evidence volumes.

You may override the local Docker defaults by copying `docker.env.example` to `.env.docker`, changing its values, and starting with:

```sh
docker compose --env-file .env.docker up --build
```

PostgreSQL is available on host port `5433` by default so it does not conflict with a local PostgreSQL installation. The app containers still use PostgreSQL's internal port `5432`.

## Local setup

1. Create a PostgreSQL database and copy `backend/.env.example` to `backend/.env` with its connection values.
2. Apply the database migrations in order:

   ```sh
   psql "$DATABASE_URL" -f db/migrations/000_initial_schema.sql
   psql "$DATABASE_URL" -f db/migrations/001_frontend_integration.sql
   psql "$DATABASE_URL" -f db/migrations/002_resolution_tracking.sql
   psql "$DATABASE_URL" -f db/migrations/004_audit_log_restrict.sql
   ```

3. Install the Python dependencies required by the demo-data script, then seed the database:

   ```sh
   python -m pip install -r scripts/requirements.txt
   set -a; source backend/.env; set +a
   python scripts/seed.py
   ```

4. Create the demo accounts after the seed data has created mines:

   ```sh
   psql "$DATABASE_URL" -f db/migrations/003_demo_accounts.sql
   ```

5. Start the API:

   ```sh
   npm --prefix backend install
   npm --prefix backend run dev
   ```

6. Each dashboard is a separate Next.js application. Copy `frontend/.env.example` into the app directory as `.env.local`, install its dependencies, then start it. For example:

   ```sh
   cp frontend/.env.example frontend/mine-os-field-report/.env.local
   pnpm --dir frontend/mine-os-field-report install --frozen-lockfile
   pnpm --dir frontend/mine-os-field-report dev
   ```

The API runs on `http://localhost:5050` by default. The apps use `NEXT_PUBLIC_API_URL` to reach it. For the linked manager flow, run the field-report app on port `3001` and the violation-detail app on port `3002`, or adjust their URLs in `mine-os-manager-dashboard/.env.local`.

PDF OCR renders the first page with Poppler's `pdftoppm`; install Poppler on the demo machine if that command is not already available.

## Sign in and roles

Set `AUTH_SESSION_SECRET` and `DEMO_LOGIN_PASSWORD` in `backend/.env`, then open `http://localhost:5050/login` before using a dashboard. The demo accounts created by migration `003` are:

- `manager@mineos.local` — may create and update records for its own mine, including audit verification.
- `corporate@mineos.local` — may view the corporate portfolio, file reports for any mine, update status and actions, and verify the audit log.
- `regulator@mineos.local` — may view the portfolio, file reports, inspect violations, and verify the audit log.

All accounts use the `DEMO_LOGIN_PASSWORD` value. For the demo configuration included in this workspace, that password is `MineOSDemo2026!`. Sign in before opening a dashboard:

- Manager: `http://localhost:5050/login?returnTo=http://localhost:3003`
- Corporate: `http://localhost:5050/login?returnTo=http://localhost:3000`
- Regulator: `http://localhost:5050/login?returnTo=http://localhost:3000`

CORS accepts configured origins plus local `localhost`/`127.0.0.1` origins for any port during development; set `CORS_ORIGINS` explicitly and remove the local fallback before any deployment.
