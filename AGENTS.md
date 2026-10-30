# Repository Guidelines

## Project Structure & Module Organization

This Express, MongoDB, and TypeScript backend serves Campus Lost & Found. `src/types/` defines API and storage types; `src/models/` defines User, Item, and Claim schemas. `src/routes/` handles authentication, claims, and the item catalogue. `src/middleware/` holds JWT authentication, runtime input checks, and JSON errors. `src/app.ts` assembles Express; `src/app.ts` exports the hosting app and waits for MongoDB in request middleware; `src/server.ts` connects MongoDB and starts local HTTP. `src/data/` holds transaction/provisioning helpers and test sample data. `tests/` holds model and HTTP tests; README.md documents setup, the API and office workflow. TypeScript emits to ignored `dist/`.

## Build, Test, and Development Commands

- `npm ci`: install the versions recorded in `package-lock.json`.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run build`: compile TypeScript into `dist/`.
- `npm run dev`: watch and run the TypeScript server.
- `npm start`: run compiled `dist/server.js` after building.
- `npm test`: run the existing Node suite against temporary MongoDB, then isolated GT6 Vitest/Supertest tests.
- `npm run test:gt6`: run isolated GT6 route tests; requires a local or environment `JWT_SECRET`.

There is no lint script. Use Node.js 24.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and type-only imports. Keep strict typing enabled. Use PascalCase for models/types, camelCase for functions, and lowercase filenames for other modules. Align API and database types with `src/types/index.ts`.

## Testing Guidelines

Run `npm test`, `npm run typecheck`, and `npm run build`. Existing tests use Node's runner and disposable MongoDB replica sets through mongodb-memory-server; the first run downloads a test binary. GT6 tests in `tests/gt6/` use Vitest/Supertest and mock database access and Gemini. Never use Atlas for automated tests. Cover validation, authentication, ownership, and update rules. No coverage threshold is configured.

## Domain Notes

Course maps to Item; Submission maps to Claim. Items identify their reporter. Claims reference an existing item and authenticated claimant. New claims start pending; status replaces the backend verified flag. Items marked found cannot receive new claims or claim reassignment (409). Existing claims remain readable. Claim list/detail responses include item title and location through a populated virtual, while preserving itemId. Proof requires 10–1000 characters. Student claim operations filter by claimantId from the token; separate admin routes enforce the current database role. Reviewed claims are immutable, including deletion. Approval and competing rejection are transactional, and submissions/reassignment serialize on the item version. Students cannot set ownership, dates, roles, or status. Item reads are shared. Item reads are public. One administrator enters Lost item reports for a selected active student reporter and reviews claims. Approval marks the item Found and rejects competing pending claims; the approved student sees office pickup instructions. Public registration remains student-only.

## Security & Configuration

Configure MONGODB_URI, JWT_SECRET, PORT, and CORS_ORIGIN using `.env.example`. Never commit `.env`, credentials, tokens, or generated output. TypeScript types do not replace runtime input checks.

## Commit & Pull Request Guidelines

Use short-lived `codex/` feature branches from main for new work. Use concise imperative commit subjects with prefixes such as feat:, fix:, docs: or chore:. Keep tests with the behavior they verify and separate dependency updates from feature changes. Ask the user before every push, including tags. PRs should explain behavior, list checks, and identify configuration/API changes. Deployment and release tags require separate authorization.
