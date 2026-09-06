# MineOS

MineOS is a hackathon MVP for reporting, triaging, and auditing mine-compliance violations.

## Local setup

1. Create a PostgreSQL database and copy `backend/.env.example` to `backend/.env` with its connection values.
2. Apply the database migrations in order:

   ```sh
   psql "$DATABASE_URL" -f db/migrations/000_initial_schema.sql
   psql "$DATABASE_URL" -f db/migrations/001_frontend_integration.sql
   ```

3. Install the Python dependencies required by the demo-data script, then seed the database:

   ```sh
   python -m pip install -r scripts/requirements.txt
   set -a; source backend/.env; set +a
   python scripts/seed.py
   ```

4. Start the API:

   ```sh
   npm --prefix backend install
   npm --prefix backend run dev
   ```

5. Each dashboard is a separate Next.js application. Copy `frontend/.env.example` into the app directory as `.env.local`, install its dependencies, then start it. For example:

   ```sh
   cp frontend/.env.example frontend/mine-os-field-report/.env.local
   pnpm --dir frontend/mine-os-field-report install --frozen-lockfile
   pnpm --dir frontend/mine-os-field-report dev
   ```

The API runs on `http://localhost:5050` by default. The apps use `NEXT_PUBLIC_API_URL` to reach it. For the linked manager flow, run the field-report app on port `3001` and the violation-detail app on port `3002`, or adjust their URLs in `mine-os-manager-dashboard/.env.local`.

PDF OCR renders the first page with Poppler's `pdftoppm`; install Poppler on the demo machine if that command is not already available.
