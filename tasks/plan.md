# GT6 implementation plan

Goal: satisfy Session 12 GT6 for Campus Lost & Found in both repositories by October 30, 2026. This plan covers tests, CI, README evidence, reviewed PRs, and gt6 tags. MA2 final tags are separate work.

## Current evidence

- Both working trees are clean on gt5-ai. Local backend main is 12 commits behind HEAD; frontend main is 5 behind. Remote merge/release state has not been refreshed.
- Both repositories already run Node test suites. Preserve those checks.
- Backend .github/workflows/ci.yml already runs tests, typecheck, and build, but push triggers are limited to main and gt4-part1. Frontend has no CI workflow at that path.
- Frontend has no Vitest setup. Use existing ClaimBadge, useToggle, and ReviewPage for the three required test files.
- Backend createApp connects before routing; requireAuth also queries User.findById().select("isActive"). Both need isolation for the new route test.
- The frontend AGENTS.md records a pre-existing usePrevious lint error. Verify its current state before deciding any repair scope; do not suppress it.

## Decisions

- Follow the handout's gt6-tests branch name in both repositories for this task. Verify remote main includes the completed GT5 work before branching; preserve existing GT5 commits and local files.
- Add a narrowly scoped Vitest suite alongside each existing Node suite. Make npm test run both; scope test discovery explicitly so neither runner consumes the other's tests. Keep test:ai's external simulation separate from the offline GT6 suite.
- Frontend: ClaimBadge checks status text from typed Claim data; useToggle checks its initial value and state change inside act(); ReviewPage submits invalid input, checks the exact Zod message, and spies on fetch to prove no network request occurs. Use a fresh QueryClientProvider per form test and restore spies/DOM state.
- Backend: use Supertest with Vitest against the real mounted POST /api/ai route. Mock connectDatabase and the active-user lookup, retaining real requireAuth. Check missing and invalid tokens return 401; sign an expiring token with a valid userId, submit an invalid prompt, and expect 400 with the validation message. This proves valid authentication passed without calling Gemini. Guard against accidental provider calls.
- Set isolated test configuration before importing app.ts: a dummy MongoDB URI, test CORS origin, and JWT_SECRET. CI uses the required repository secret; never copy the production signing secret or require Atlas/Gemini credentials. Verify mocking works with the current CommonJS TypeScript project before expanding the suite; use the smallest test-compatible setup without an app-wide module migration.
- Reuse existing Postman requests as contract references. GT6 requires Vitest/Supertest, so no new Postman workspace or published resources are needed.

## Ordered tasks

1. Verify baseline and Git starting point. Inspect remote main/GT5 state, run existing checks, then create gt6-tests in each repo from the correct completed GT5 state. Record unrelated failures. Acceptance: GT5 code preserved and baseline failures distinguished from new failures.
2. Add frontend test infrastructure. Add Vitest, jsdom, and Testing Library development dependencies; configure jsdom, setup/cleanup, and a dummy VITE_API_URL in vite.config.ts. Preserve legacy test command and make npm test run both suites. Acceptance: existing tests still run and new runner can render a component.
3. Add three frontend test files beside ClaimBadge, useToggle, and ReviewPage. Acceptance: typed status assertions, hook state transition, exact invalid-form message and zero fetch calls all pass. Verification: focused Vitest run, full npm test, lint, build, and repository-required TypeScript check. Checkpoint: three new files pass and existing checks remain covered.
4. Add isolated backend route tests. Add Vitest, Supertest and types; configure discovery and scripts while preserving legacy tests. Acceptance: real JWT middleware returns 401 for missing/invalid tokens, valid token reaches input validation, and no real database/provider is used by this suite. Verification: focused suite, full npm test, typecheck, build. Checkpoint: resolve CommonJS mocking/configuration issues without broad production changes.
5. Configure CI in both repos. Extend backend workflow; add frontend workflow. Trigger on every push and pull requests, use Node 24 and npm ci. Backend runs both suites, typecheck, build; frontend runs both suites, lint, build. Inject JWT_SECRET only into backend checks that need it. User supplies a distinct >=32-character GitHub Actions repository secret. Acceptance: no ignored local env or real service credentials needed. Resolve a confirmed pre-existing lint issue narrowly if needed for required green checks; never weaken lint rules.
6. Complete README and local proof. Put correct CI badges at the top of both READMEs and verify workflow links, live URLs, local commands, architecture, and AI-use disclosure. Deliberately break one expected assertion, record the failing result, restore it, and rerun successfully. Run all required checks and inspect staged scope/secrets before release. Acceptance: clean test evidence and no deliberately broken assertion remains. Avoid renaming real .env files; verify the new isolated suites with dotenv disabled/test configuration instead.
7. Release and submit after explicit user authorization. Prepare focused commits and PR descriptions; ask before pushes, PR creation/merges, and tag publication. Require green PR checks before merging each PR. Verify latest main CI and green badges in both repos, then tag the merged commits gt6 and publish after authorization. Run the handout's final live checks with a test account: health, registration/login, claim creation, and AI review. Submit both repository links. Acceptance: merged PRs, green main checks, published gt6 tags, and working documented live links.

## Verification and limits

Implementation should stay in test/configuration/documentation files, except a narrowly justified fix to a verified blocker. Do not remove existing tests to meet the handout's example count of three new frontend files. Full backend legacy tests may use temporary MongoDB; the new GT6 auth suite must not. Live checks are distinct from mocked test evidence and may create test account/claim records. Do not claim remote CI, secrets, or deployments are verified until checked live.

Implementation status (October 27, 2026): local test infrastructure, new tests, CI workflows, README evidence, and a narrow usePrevious lint fix are implemented. Clean installs and local checks pass. See tasks/verification.md for evidence and pending release steps. No remote writes have been performed.
