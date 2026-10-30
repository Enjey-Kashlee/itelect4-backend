# Campus Lost & Found Backend

[![CI](https://github.com/Enjey-Kashlee/itelect4-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Enjey-Kashlee/itelect4-backend/actions/workflows/ci.yml)

Express, TypeScript and MongoDB API for the campus lost and found office. One administrator records items handed in by students and reviews ownership claims. Students browse the public catalogue and submit claims with proof of ownership.

## Application links

- [Frontend](https://itelect4-project-mu.vercel.app)
- [Backend health](https://itelect4-backend-virid.vercel.app/api/health)
- [Public item catalogue](https://itelect4-backend-virid.vercel.app/api/items)
- [Frontend repository](https://github.com/Enjey-Kashlee/itelect4-project)

Changes to the shared API should be deployed with the corresponding frontend changes. Local verification does not confirm which revision is deployed at these URLs.

## Local setup

Use Node.js 24. Run `npm ci`, then copy `.env.example` to `.env` if one does not already exist.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB replica-set or sharded-cluster connection string, including the database name |
| `JWT_SECRET` | Random signing secret containing at least 32 characters |
| `CORS_ORIGIN` | Allowed frontend origins, comma separated; normally `http://localhost:5173` locally |
| `PORT` | Optional HTTP port; defaults to 4000 |
| `GEMINI_API_KEY` | Optional server-only key for AI feedback; other features do not require it |

Never commit real environment files, passwords, tokens or database credentials. Do not put backend secrets in frontend environment variables.

```sh
npm run dev
```

For a compiled server:

```sh
npm run build
npm start
```

`GET /api/health` reports database connectivity. Both local startup and hosted request handling wait for the user indexes, including the single-admin constraint.

Claim submission, item reassignment and admin decisions require MongoDB transactions. Standalone MongoDB cannot perform these operations; the API returns 503 rather than making partial writes.

## Office workflow

1. A student hands an item to the office.
2. The admin records it as **Lost**, selecting the registered active student who reported it.
3. Other students open its details and submit ownership proof.
4. The admin approves or rejects pending claims.
5. Approval marks the item **Found**, approves the selected claim and rejects competing pending claims together. The approved student receives office pickup instructions.

Found items cannot receive new claims. Decisions are final, and reviewed claims cannot be edited or deleted. Physical collection is handled at the office and is not recorded as completed by this version.

Public registration creates students only. The database permits one `security_admin` record, including inactive accounts. There is no default admin password or public admin-registration endpoint. There is no bundled account-provisioning CLI. Private provisioning logic remains in `src/data/setupAdmin.ts` for a deliberate owner-operated process against the chosen database. It validates credentials, hashes passwords, refuses an email already registered to a student, and leaves an existing admin unchanged. A real admin has not yet been provisioned as part of this work.

## API

Protected routes use `Authorization: Bearer <token>`. Login accepts email/password and returns `{ token, user }`; tokens expire after two hours. The server checks the account's current activity and role on protected requests.

| Method | Endpoint | Access and behavior |
| --- | --- | --- |
| GET | `/api/health` | Public database health |
| POST | `/api/auth/register` | Public student registration: name, email and password |
| POST | `/api/auth/login` | Public login |
| GET | `/api/items` | Public item catalogue |
| GET | `/api/items/:id` | Public item details |
| POST | `/api/items` | Admin only; title, description, location and selected `reportedById`; initial status is Lost |
| GET | `/api/claims` | Only the authenticated user's claims |
| GET | `/api/claims/:id` | Only the authenticated user's claim |
| POST | `/api/claims` | Student only; `itemId` and `proofDescription` |
| PATCH | `/api/claims/:id` | Owner only; update a pending claim's item and/or proof |
| DELETE | `/api/claims/:id` | Owner only; delete a pending claim |
| GET | `/api/admin/students` | Admin-only active student ID/name/email selector |
| GET | `/api/admin/claims?status=pending` | Admin-only pending, approved or rejected claims with item/claimant context |
| PATCH | `/api/admin/claims/:id/status` | Admin only; exactly `{ "status": "approved" }` or `{ "status": "rejected" }` |
| POST | `/api/ai` | Authenticated ownership-description feedback; never approves or submits a claim |

IDs are 24-character ObjectId strings. Claim proof must contain 10–1000 characters after trimming. Ownership, submission dates, decision metadata and initial status come from the server. Claim statuses are `pending`, `approved` and `rejected`.

Public items include reporter ID/name, excluding email and account details. Owner claim responses include item title/location; administrator lists also include limited claimant context. Claim proof remains private. Approval returns `{ claim, rejectedOtherClaimsCount }` and records `reviewedById`/`reviewedAt`.

Errors use JSON messages: 400 for invalid input, 401 for unavailable/invalid sessions, 403 for denied access or disallowed origins, 404 for missing records, 409 for conflicts or final decisions, and 413 for oversized requests. Another user's claim also returns 404. Unexpected errors do not expose internal details.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

`npm test` runs the Node regression tests and the isolated Vitest/Supertest authentication suite. API tests use temporary local MongoDB replica sets, never the application database. The first run downloads a MongoDB test binary. Tests cover student ownership, admin authorization, reporter selection, singleton provisioning, transaction rollback and concurrent claim decisions.

The Vitest suite needs a test-only `JWT_SECRET` of at least 32 characters; other settings use dummy values. GitHub Actions supplies this from the repository secret named `JWT_SECRET`, runs `npm ci`, and checks types, tests and the build. The signing secret used by CI should be separate from application secrets.

`npm run test:watch` watches the Vitest suite. `npm run format:check` checks Prettier formatting; `npm run format` writes formatting changes. There is no lint command.

The optional `npm run test:ai` integration suite is separate from `npm test`. It requires an externally supplied Gemini-compatible simulation at `http://127.0.0.1:4900/gemini`; that service is not bundled. See [the integration tests](tests/integration/ai.test.ts) for its contract.

## Project layout

- `src/routes/`: authentication, item, student-claim, admin and AI endpoints.
- `src/middleware/`: bearer authentication, role checks, runtime validation and errors.
- `src/models/` and `src/types/`: MongoDB schemas and API/storage types.
- `src/data/`: transactional claim helpers, private admin provisioning logic and sample-data fixtures used by tests.
- `src/config/`: environment validation and database connection management.
- `src/app.ts`: assembled hosting app; `src/server.ts`: local HTTP entry point.
- `tests/`: unit, API, concurrency and isolated authentication tests.

Compiled output in `dist/`, dependencies and real environment files are ignored.

## AI-use disclosure

OpenAI Codex assisted with implementation, test design, CI configuration, documentation and debugging. The author is responsible for reviewing, understanding and explaining the submitted code.
