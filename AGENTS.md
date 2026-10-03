# Repository Guidelines

## Project Structure & Module Organization

This Express, MongoDB, and TypeScript backend serves Campus Lost & Found. `src/types/` defines API and storage types; `src/models/` defines User, Item, and Claim schemas. `src/routes/` handles authentication, claims, and the item catalogue. `src/middleware/` holds JWT authentication, runtime input checks, and JSON errors. `src/app.ts` assembles Express; `src/server.ts` connects MongoDB and starts HTTP. `src/data/` and `src/scripts/` seed sample items. `tests/` holds model and HTTP tests; `postman/` holds runnable requests; `docs/learning-guide.md` teaches the code. TypeScript emits to ignored `dist/`.

## Build, Test, and Development Commands

- `npm ci`: install the versions recorded in `package-lock.json`.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run build`: compile TypeScript into `dist/`.
- `npm run dev`: watch and run the TypeScript server.
- `npm start`: run compiled `dist/server.js` after building.
- `npm test`: run model, configuration, and HTTP tests against temporary MongoDB.
- `npm run seed:items`: insert sample items without overwriting existing records.

There is no lint script. Use Node.js 24.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and type-only imports. Keep strict typing enabled. Use PascalCase for models/types, camelCase for functions, and lowercase filenames for other modules. Align API and database types with `src/types/index.ts`.

## Testing Guidelines

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests use Node's runner and mongodb-memory-server; the first run downloads a test binary. Never use Atlas for automated tests. Cover validation, authentication, ownership, and update rules. No coverage threshold is configured.

## Domain Notes

Course maps to Item; Submission maps to Claim. Items identify their reporter. Claims reference an existing item and authenticated claimant. New claims start pending; status replaces the backend verified flag. Proof requires 10–1000 characters. Every claim operation filters by claimantId from the token. Students cannot set ownership, dates, roles, or status. Item reads are shared. Administrator review and frontend integration are later work; preserve that boundary.

## Security & Configuration

Configure MONGODB_URI, JWT_SECRET, PORT, and CORS_ORIGIN using `.env.example`. Never commit `.env`, credentials, tokens, or generated output. TypeScript types do not replace runtime input checks.

## Commit & Pull Request Guidelines

Use concise imperative subjects with prefixes such as feat: or docs:. Work for this task on gt4-part1. PRs should explain behavior, reference the course task, list checks, and mention configuration/API changes. Submit through a merged PR; tag GT4 after Session 11.
