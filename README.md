# Campus Lost & Found Backend

GT4 Part 1: a TypeScript/Express API with MongoDB persistence, real registration/login, and five authenticated routes for **Claim**. Items form a shared read-only catalogue. Frontend integration is planned for Session 11.

## Run locally

Use Node.js 24. Install dependencies with `npm ci`. Copy `.env.example` to `.env` if you do not already have one, then fill in:

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | Atlas connection string including your database name |
| `JWT_SECRET` | Random secret of at least 32 characters |
| `PORT` | Server port; defaults to 4000 |
| `CORS_ORIGIN` | Allowed frontend origins, comma separated; defaults to `http://localhost:5173` |

Generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Atlas needs a database user and network access for the machine running the API. Keep secrets in `.env` locally and your host's environment settings when deploying.

```sh
npm run seed:items
npm run dev
```

The seed inserts three sample items and one sample reporter with a random password. It preserves existing items and claims when repeated. Register your own account to log in; the sample reporter is not a demo login account.

Check `GET http://localhost:4000/api/health` for `{ "ok": true, "db": true }`. Startup connects MongoDB before accepting requests.

## API

Register with `{ "name": "Student", "email": "student@example.com", "password": "LearnClaims123!" }`; log in with email and password. Send the returned token as `Authorization: Bearer <token>` on protected requests.

| Method | Path | Successful result |
|---|---|---|
| GET | `/api/health` | 200, database health |
| POST | `/api/auth/register` | 201, user without password |
| POST | `/api/auth/login` | 200, `{ token, user }` |
| GET | `/api/items` | 200, shared item catalogue; token required |
| GET | `/api/items/:id` | 200, item; token required |
| GET | `/api/claims` | 200, only your claims, newest first |
| GET | `/api/claims/:id` | 200, your claim |
| POST | `/api/claims` | 201, new claim |
| PATCH | `/api/claims/:id` | 200, updated claim |
| DELETE | `/api/claims/:id` | 204, empty body |

POST takes `itemId` (a 24-character ObjectId string from the item catalogue) and `proofDescription` (10–1000 characters after trimming). PATCH accepts either or both of those fields. The server supplies claimantId, claimedAt, and initial status `pending`. Status is an enum: pending/approved/rejected. Students cannot set status, roles, dates, or ownership. Administrator review endpoints belong to a later extension.

All five claim routes require authentication and scope their operations to the token's user. Another user's claim and a missing claim both return 404. Input errors return 400, missing/invalid authentication 401, disallowed browser origins 403, duplicate registration 409, and oversized bodies 413. Unexpected failures return a generic JSON 500.

The backend now uses string API IDs, proofDescription, and status rather than the frontend demo's numeric item IDs and verified flag. The sibling frontend remains independent until its API integration is implemented.

## Verify and learn

```sh
npm test
npm run typecheck
npm run build
npm start
```

Tests use a temporary MongoDB process, never Atlas. The first test run downloads a MongoDB binary to the operating system's temporary directory, so it needs internet access. `dev` runs TypeScript with watching; `typecheck` checks types; `build` emits JavaScript into `dist/`; `start` runs that JavaScript.

Import `postman/GT4-Part1.postman_collection.json` and optionally `postman/Local.postman_environment.json` into Postman. Seed items and start the API, then run all 17 requests in order. The collection saves tokens and IDs automatically, checks ownership/validation, and deletes its test claim. Each run registers two uniquely named demo accounts. Use a disposable database for repeated collection runs if you do not want those accounts in your app database. Token values are blank in the committed collection.

Read [the learning guide](docs/learning-guide.md) beside your source code. It traces registration, login, and a claim request through this app and explains the lesson concepts using your actual files.

## Deployment and submission

The `Dockerfile` builds TypeScript and starts the compiled API as a non-root user. `.dockerignore` excludes secrets and development artifacts. For a Node hosting service, use Node 24, build with `npm ci && npm run build`, and start with `npm start`. Set the environment variables above on the host and use `/api/health` as its health check. Seed the target database explicitly with `node dist/scripts/seed.js` after building. The HTTP server binds to `0.0.0.0` and reads the host's `PORT`.

Deployment files are prepared; no hosting service has been created. HTTPS is supplied by your hosting service. The classroom baseline does not yet include authentication rate limiting or account recovery, so add those before wider public use.

Submit this backend's `gt4-part1` branch through a pull request and merge it. Commit `.env.example`, never `.env`. Do not tag GT4 until the end of Session 11.
