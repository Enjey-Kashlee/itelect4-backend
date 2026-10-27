# GT6 local verification

Checked October 27, 2026 with Node v24.21.0. Both branches are `gt6-tests`, based on refreshed `origin/main` containing the GT5 merges. No existing work was discarded.

## Passed

| Repository | Checks                                              | Result                                                        |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Backend    | Clean `npm ci`; `npm test`                          | 21 existing Node tests + 4 new Vitest/Supertest tests pass    |
| Backend    | `npm run typecheck`; `npm run build`                | Pass, including new route-test and Vitest configuration types |
| Frontend   | Clean `npm ci`; `npm test`                          | 17 existing Node tests + 9 Vitest tests across 4 files pass   |
| Frontend   | `npm run lint`; `npm run build`; `npx tsc --noEmit` | Pass                                                          |
| Both       | Changed-file formatting and `git diff --check`      | Pass                                                          |

The backend clean run set `DOTENV_CONFIG_PATH=/dev/null` and a disposable test-only signing secret. The existing suite started temporary MongoDB; the new GT6 suite mocked the connection and active-user lookup. Gemini was mocked to throw if called, and every GT6 route test asserts it was not called. No Atlas or paid Gemini request was needed.

The required three frontend areas are ClaimBadge status rendering, useToggle state transitions, and invalid ReviewPage submission with the exact schema message and zero fetch calls. The fourth file tests the narrow lint repair to usePrevious. It now remembers the previous distinct search value through unrelated renders. Tests cover StrictMode and NaN equality.

## Failure proof

- Frontend: changing the pending status expectation to `WRONG expected status` caused exactly one failure, with eight tests still passing. Restored the correct text; the final full run passes.
- Backend: changing the no-token expected status from 401 to 402 caused exactly one failure, with three tests still passing. Restored 401; the final full run passes.
- Hook fix: inverting the Object.is guard made the regression suite fail. Restored the source; both focused hook tests pass.

## Review

The production backend, authentication, AI prompt, and Gemini settings are unchanged. Both Node suites remain intact, and each runner has separate discovery. Required packages are development dependencies. No real env files, credentials, generated output, disabled rules, or skipped tests are part of the change.

The backend retains CommonJS production output; Vitest transforms the imported TypeScript modules for its mocks. The frontend change to usePrevious follows React's documented guarded state-update pattern for remembering previous values: https://react.dev/reference/react/useState#storing-information-from-previous-renders . Its one caller is ItemsPage's previous-search hint.

## Dependency advisories

Native npm audit was run after installation. Every flagged package was already present at an affected version in the original lockfiles. No forced or broad upgrades were included in this testing task. These findings remain unresolved and should be reviewed before MA2/final release; review date: October 28, 2026.

- Backend: one high advisory in existing body-parser 2.3.0, reachable through Express request parsing (compressed-body denial of service). A fix is available. This needs a separate dependency patch and regression verification.
- Frontend: 12 reported packages (one critical, eight high, three moderate). Most are development tooling through shadcn/Vite, including proxy-addr, MCP SDK, undici, brace-expansion, source-map-js, fast-uri, hono, and ip-address. The client uses Zod for form validation, so its constrained-collection advisory also needs review, although current forms validate bounded strings rather than collections. Vite advisories affect development-server paths. Fixes are reported available; no forced remediation was applied.
- Lockfile review: backend existing package versions are unchanged. Frontend installation deduplicated three nested trace-mapping entries and updated sourcemap-codec/picomatch within the resolved testing/build dependency graph. Clean builds and both suites pass.

Live read-only checks also passed: the documented frontend, API health, and items URLs returned HTTP 200; health returned `{"ok":true,"db":true}`. The API allowed the localhost frontend Origin. This does not establish the authenticated live workflow or the unpushed GT6 code. Both workflow files parsed successfully as YAML and have unrestricted push and pull_request triggers.

## Pending external steps

- Backend Actions secret-name check returned no configured secrets. The user must add a distinct random `JWT_SECRET` of at least 32 characters under repository Settings → Secrets and variables → Actions. Do not reuse production credentials.
- Obtain explicit user authorization before pushes, PR creation/merges, and publishing tags. No remote write, PR, merge, or gt6 tag has been performed.
- Verify actual green PR checks before merging and green main CI/badges afterward. Local runs cannot prove GitHub Actions execution.
- Complete the final live register/login/claim/AI workflow after release. No test accounts/claims or paid Gemini requests were created during this local verification.
- Publish `gt6` on the merged commits only after both repos pass the required checks. MA2 `final` tags remain separate.
