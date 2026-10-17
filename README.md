# Campus Lost & Found Backend

Campus Lost & Found is a TypeScript/Express API with MongoDB persistence, real registration/login, and five authenticated routes for **Claim**. Items form a public read-only catalogue.

## Live application

- Frontend: [https://itelect4-project-mu.vercel.app](https://itelect4-project-mu.vercel.app)
- Backend API: [https://itelect4-backend-virid.vercel.app](https://itelect4-backend-virid.vercel.app)
- API checks: [Health](https://itelect4-backend-virid.vercel.app/api/health) · [Items](https://itelect4-backend-virid.vercel.app/api/items)

## Run locally

Use Node.js 24. Install dependencies with `npm ci`. Copy `.env.example` to `.env` if you do not already have one, then fill in:

| Variable      | Meaning                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| `MONGODB_URI` | Atlas connection string including your database name                           |
| `JWT_SECRET`  | Random secret of at least 32 characters                                        |
| `PORT`        | Server port; defaults to 4000                                                  |
| `CORS_ORIGIN` | Allowed frontend origins, comma separated; defaults to `http://localhost:5173` |

Generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Atlas needs a database user and network access for the machine running the API. Keep secrets in `.env` locally and your host's environment settings when deploying.

```sh
npm run seed:items
npm run dev
```

The seed inserts three sample items and one sample reporter with a random password. It preserves existing items and claims when repeated. Register your own account to log in; the sample reporter is not a demo login account.

Check `GET http://localhost:4000/api/health` for `{ "ok": true, "db": true }`. Local startup connects MongoDB before accepting requests. On Vercel, request middleware connects before handling a request. Concurrent requests share the connection attempt, and subsequent requests reuse the open connection. Both paths wait for the unique email index before registration can run.

## API

Register with `{ "name": "Student", "email": "student@example.com", "password": "LearnClaims123!" }`; log in with email and password. Send the returned token as `Authorization: Bearer <token>` on protected requests.

| Method | Path                 | Successful result                   |
| ------ | -------------------- | ----------------------------------- |
| GET    | `/api/health`        | 200, database health                |
| POST   | `/api/auth/register` | 201, user without password          |
| POST   | `/api/auth/login`    | 200, `{ token, user }`              |
| GET    | `/api/items`         | 200, public shared item catalogue   |
| GET    | `/api/items/:id`     | 200, public item                    |
| GET    | `/api/claims`        | 200, only your claims, newest first |
| GET    | `/api/claims/:id`    | 200, your claim                     |
| POST   | `/api/claims`        | 201, new claim                      |
| PATCH  | `/api/claims/:id`    | 200, updated claim                  |
| DELETE | `/api/claims/:id`    | 204, empty body                     |

POST takes `itemId` (a 24-character ObjectId string from the item catalogue) and `proofDescription` (10–1000 characters after trimming). PATCH accepts either or both of those fields. The server supplies claimantId, claimedAt, and initial status `pending`. Status is an enum: pending/approved/rejected. Students cannot set status, roles, dates, or ownership. Administrator review endpoints belong to a later extension.

All five claim routes require authentication and scope their operations to the token's user. Another user's claim and a missing claim both return 404. Input errors return 400, missing/invalid authentication 401, disallowed browser origins 403, duplicate registration 409, and oversized bodies 413. Unexpected failures return a generic JSON 500.

## Verify and learn

Format all supported project files with `npm run format`. Check formatting without changing files with `npm run format:check`. Prettier uses two-space indentation, double quotes, and semicolons; generated files and environment files are excluded.

For formatting on save in VS Code, install the **Prettier - Code formatter** extension (`esbenp.prettier-vscode`), select it as the default formatter, and enable **Editor: Format On Save**. The extension uses this project's installed Prettier and configuration.

```sh
npm test
npm run typecheck
npm run build
npm start
```

Tests use a temporary MongoDB process, never Atlas. The first test run downloads a MongoDB binary to the operating system's temporary directory, so it needs internet access. `dev` runs TypeScript with watching; `typecheck` checks types; `build` emits JavaScript into `dist/`; `start` runs that JavaScript.

Import `postman/GT4-Part1.postman_collection.json` and optionally `postman/Local.postman_environment.json` into Postman. Seed items and start the API, then run all 17 requests in order. The collection saves tokens and IDs automatically, checks ownership/validation, and deletes its test claim. Each run registers two uniquely named demo accounts. Use a disposable database for repeated collection runs if you do not want those accounts in your app database. Token values are blank in the committed collection.

Read [the Session 9 study guide](docs/session9-codebase-study.md) beside your source code. It traces registration, login, and a claim request through this app and explains the lesson concepts using your actual files.
