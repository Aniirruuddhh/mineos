# Backend architecture

`app.js` builds and exports the Express application. `server.js` loads the
environment and starts it on `PORT` (default `5050`).

- `src/config` owns environment, PostgreSQL pool, and upload configuration.
- `src/constants` owns domain enumerations and SLA values.
- `src/routes` maps the existing `/api` resources to thin controllers.
- `src/controllers` owns HTTP request/response handling; `src/services` owns
  workflows, SLA calculation, OCR, audit hashing, and dashboard calculations.
- `src/repositories` is the only home for SQL. These are plain modules rather
  than interface/implementation pairs: Node has no need for that extra layer,
  and the current application has one PostgreSQL implementation per aggregate.
- `src/models`, `src/helpers`, and `src/validators` keep response mapping,
  shared conversions, and existing validation messages separate from routes.
- `src/middlewares`, `src/monitoring`, and `src/storage` contain request
  handling, health checks, and upload file handling.
- `src/events` exposes the minimal post-commit event bus. `src/jobs` documents
  why no scheduler is required. `src/security` reserves JWT/RBAC work without
  adding unused middleware.
- `src/tests` contains unit tests that do not write to the production database.

Database migrations remain at `db/migrations/` and seed data remains in
`scripts/seed.py`; neither is moved by the backend application refactor.
