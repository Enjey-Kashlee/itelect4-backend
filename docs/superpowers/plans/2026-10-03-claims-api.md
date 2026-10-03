# GT4 Part 1 Claims API Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement the approved work inline. Track progress below.

**Goal:** Deliver and teach a working, authenticated claims REST API for GT4 Part 1.

**Architecture:** Express routes use Mongoose models and a shared JWT middleware. Startup reads validated environment configuration before connecting MongoDB. HTTP tests use a temporary database and real requests.

**Tech Stack:** TypeScript, Express 5, Mongoose 9, bcryptjs, jsonwebtoken, Node test runner, mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-10-03-claims-api-design.md`

## Global Constraints

- Claim is the graded resource. Do not modify the sibling frontend.
- ObjectId item/claimant references; pending/approved/rejected; proof length 10–1000.
- Every claim route checks token ownership; callers cannot assign status or ownership.
- Never commit .env, dependencies, generated output, tokens, or credentials.

## Review Focus

- Malformed bodies and operator objects must return JSON 400.
- Forged or expired tokens and inactive accounts must return 401.
- Updates cannot change owner/status or bypass proof validation.
- Missing item references must not be stored.
- Startup failure must not print database credentials; tests must never use Atlas.

### Task 1: Models and storage contracts

Files: src/types/index.ts, src/models/{Claim,User,Item}.ts, src/models/json.ts; tests/claimModel.test.ts.
Produces: Claim, User, Item models with sanitized JSON; ObjectId database types and string request IDs.
- [x] Update model tests for status defaults, proof limits, missing IDs, and JSON serialization; run and observe failures.
- [x] Implement models and request/document types. User hashes modified passwords before save.
- [x] Run model tests and typecheck; commit the models.

### Task 2: Configuration, authentication, and HTTP API

Files: src/config/{env,db}.ts, src/app.ts, src/server.ts, src/middleware/{auth,errors,validation}.ts, src/routes/{auth,claims,items}.ts; tests/{api,config}.test.ts.
Consumes: Task 1 models. Produces: createApp(config), readConfig(env), connectDatabase(uri), authenticated REST routes.
- [x] Add integration/config tests: real registration/login, hidden hash, seven endpoints, input failures, cross-user access, spoofed fields, invalid JWTs, and item existence. Run and observe failures.
- [x] Implement runtime validators, JWT guard, configuration, routes, JSON errors, health, startup, and shutdown.
- [x] Run the whole test suite, typecheck, and build; commit.

### Task 3: Sample data, submission artifacts, and teaching

Files: src/scripts/seed.ts, postman/*.json, README.md, docs/learning-guide.md, Dockerfile, .dockerignore, AGENTS.md.
Consumes: Models and config. Produces: idempotent sample catalogue, runnable API collection, learning guide, deployment-ready container.
- [x] Test seed idempotence and Postman workflow; implement the seed command.
- [x] Document local usage, endpoints, testing, configuration, and the exact request path through code. Update contributor guidance.
- [x] Verify tests/build, connect the configured Atlas database, seed explicitly, and check live health/startup.
- [x] Commit and obtain a fresh review. Fix correctness findings with regression tests.
- [ ] Publish and merge the reviewed GitHub PR. Deployment files only, as requested.

## Progress

- Baseline committed as 81791c1; working on gt4-part1.
- Atlas connection works outside the network sandbox. The local JWT secret will be replaced with a generated secret if it is too short.

- Final review approved after gating startup on User.init(); 15 tests, typecheck, and build pass.
- Live Atlas Postman run passed 17 requests and 25 assertions. Docker is not installed locally, so the container build is unverified.
