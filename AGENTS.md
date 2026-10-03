# Repository Guidelines

## Project Structure & Module Organization

This is the planned Express, MongoDB, and TypeScript backend for the sibling `../itelect4-project/` app. `src/types/index.ts` defines users, items, and claims; `src/models/Claim.ts` defines claim storage rules. Put new runtime code under `src/`, such as `src/server.ts` and `src/routes/`. TypeScript emits to `dist/`; `tests/` holds model tests. No static assets exist.

## Build, Test, and Development Commands

- `npm ci`: install the versions recorded in `package-lock.json`.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run build`: compile TypeScript into `dist/`.
- `npm run dev`: watch and run `src/server.ts` with `tsx` once that entry point exists.
- `npm start`: run the compiled `dist/server.js` after a successful build and once the server is implemented.

There is no `test` or `lint` script. `dev` and `start` need the missing `src/server.ts`.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and `import type` for type-only imports. Keep `strict` typing enabled. Use PascalCase for types (`UserDoc`), camelCase for functions, and lowercase module filenames. Keep API and database types aligned with `src/types/index.ts`.

## Testing Guidelines

The claim model uses Node's test runner via `node --import tsx --test tests/*.test.ts`; no coverage threshold or `npm test` script is configured. Add focused tests for new routes and rules. Also run `npm run typecheck` and `npm run build`; they do not prove that a server runs.

## Domain Notes

Use the Campus Lost & Found names when adapting coursework: `Course` becomes `Item`, and `Submission` becomes `Claim`. An `Item` is a lost or found report; `reportedById` identifies its reporter. A `Claim` links an existing item to a student through `itemId` and `claimantId`. A security admin verifies claims; new requests should start with `verified: false`. Check item existence and authorization in the backend, since the sibling frontend's form checks and demo login are not enforcement. Preserve the shared `User`, `Item`, and `Claim` meanings when defining MongoDB models or API responses.

## Security & Configuration

Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, and `PORT`. Never commit `.env`, credentials, or generated `dist/` files. Validate incoming requests.

## Commit & Pull Request Guidelines

This backend directory has no Git history. Use concise imperative subjects, optionally prefixed like the sibling project (`feat:` or `docs:`). PRs should explain changes, link the issue or course task, list checks run, and mention configuration or API changes.
