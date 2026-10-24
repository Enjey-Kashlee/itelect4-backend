# GT5: AI claim preparation

Campus Lost & Found reviews a student's description of a lost item and ownership evidence. This is advice for preparing a claim, never an ownership decision. It does not read or write claims, inspect other students' data, or give Gemini database tools.

## Contract

`POST /api/ai` requires the existing Bearer token. Send only `{ "prompt": "..." }`, with 20–2000 characters after trimming. Unknown fields are rejected. Invalid bodies never reach Gemini.

The response has four fields:

| Field          | Meaning                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `summary`      | One sentence summarizing the supplied description                                    |
| `strengths`    | 1–3 useful details already supplied, or an honest statement that details are missing |
| `improvements` | 1–3 concrete next steps without inventing evidence                                   |
| `readiness`    | `ready`, `almost`, or `not-yet`, assessing description quality only                  |

The backend's Zod schema defines the TypeScript type, Gemini JSON Schema, and runtime response validation. The matching frontend type is `AiReview`. `src/ai/prompt.ts` contains the app-specific system prompt, two typed examples with different enum values, and a five-turn conversation. User text is delimited and angle brackets are escaped; these measures do not guarantee resistance to prompt injection. Gemini has no tools, secrets in the prompt, or database access. The browser renders the reply as text.

| Status | Meaning                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------- |
| 200    | Checked review                                                                                      |
| 400    | Invalid request body                                                                                |
| 401    | Missing, invalid, expired token, or inactive account                                                |
| 429    | Five attempts per minute per account per instance, or Google's quota exhausted                      |
| 500    | Missing backend Gemini key                                                                          |
| 502    | Provider failure, timeout, safety block, incomplete reply, invalid JSON, or invalid response schema |

Authentication runs before rate limiting. Invalid authenticated attempts count toward the local limit but consume no Gemini quota. The in-memory limiter is a speed bump on Vercel; exact global limits would need a shared store. The provider timeout is 60 seconds and automatic SDK retries are disabled so a single action does not generate repeated provider calls. Existing database/CORS requirements still apply.

## Local setup

Create a Gemini key at <https://aistudio.google.com/apikey> and save `GEMINI_API_KEY=...` in the ignored backend `.env`. The empty variable belongs in `.env.example`. Never use a `VITE_` variable for this key. Existing routes can run without the Gemini key.

```sh
npm ci
npm run try-ai
npm run dev
```

`try-ai` uses a fictional bottle description without Express or MongoDB. It makes one real Gemini call. The frontend `/review` page requires login, validates input, calls `askAi` through the existing API client and `useMutation`, and displays all four fields. Nothing is automatically saved as a claim. The page tells students their description is sent to Google and asks them to omit sensitive personal details.

Import `postman/GT5-AI.postman_collection.json` with the existing Local environment. Run its six requests in order; it creates one disposable account and makes one real AI request when pointed at a real provider. Use a disposable database for repeated runs. Tokens are blank in committed files.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

For repeatable provider failure checks, install Postman CLI 1.70+ and run the simulation in one terminal:

```sh
postman simulation run postman/simulations/gemini.sim.yaml --port 4900 --output ndjson
```

Then, in another terminal:

```sh
npm run test:ai
```

These integration tests start the real app with temporary MongoDB and the actual Gemini SDK, using a fake key and the SDK's `GOOGLE_GEMINI_BASE_URL` override. They check auth, validation, missing configuration, success, quota, provider JSON/HTML errors, malformed JSON, schema rejection, safety blocks, timeout, and separate account limits. Never set the endpoint override in production. The local fixture follows Google's [generateContent contract](https://ai.google.dev/api/generate-content) and [structured output docs](https://ai.google.dev/gemini-api/docs/structured-output); it is not Google's model and cannot establish real answer quality. An owner-provided mock was not retrieved because Postman CLI is signed out. Postman sign-in is not needed for these local checks.

## Submission steps still requiring live access

1. Push `gt5-ai` on both repositories after the user's explicit push approval, create PRs, and merge both.
2. In the backend Vercel project, add `GEMINI_API_KEY` for Production, Preview, and Development, then redeploy. Frontend `VITE_API_URL` continues to point to the backend.
3. Check the deployed API with a live login token, then the deployed `/review` page. Confirm logged-out visits redirect to `/login`, every reply field is visible, and browser requests go to the backend rather than Google.
4. Verify `git grep -n AIza` and `git log --all -p -S AIza` find no leaked key. Inspect privately if either finds a match.
5. Only after both PRs are merged and live checks pass, create `gt5` tags on both repos; ask before pushing each tag.
6. Submit both GitHub repo links and both live URLs. The user submits the coursework.

Repository links: [backend](https://github.com/Enjey-Kashlee/itelect4-backend), [frontend](https://github.com/Enjey-Kashlee/itelect4-project).
Existing deployment URLs: [backend](https://itelect4-backend-virid.vercel.app), [frontend](https://itelect4-project-mu.vercel.app). These URLs do not establish GT5 deployment until the live checks above pass.

## Local verification on October 25, 2026

- Backend: 21 tests pass; typecheck and build pass.
- Separate AI integration suite: 11 tests pass against the local Postman simulation, including the 60-second timeout.
- Frontend: 17 tests pass; production build and TypeScript check pass.
- Postman GT5 collection: 6 requests, 12 assertions, all pass against the temporary backend and simulated Gemini.
- Browser: logged-out redirect, registration/login with a disposable account, short-input validation, all four result fields, quota error, dark-mode readability, and logout verified.
- A mutation of the minimum prompt length was detected by the schema test.
- `.env` is ignored; tracked files and existing Git history contain no Gemini key prefix matches.
- Existing issues outside this change: frontend lint fails at `src/hooks/usePrevious.ts` (`react-hooks/refs`); backend audit reports one high-severity `body-parser` advisory, GHSA-27r3-jxmh-p828, already present in the base lockfile.
- Live Gemini was attempted with the saved key: Google returned 503 UNAVAILABLE due to high model demand; the next request hit the original 20-second deadline. The deadline was increased to 60 seconds; the final live retry also returned 504. A successful live reply, real answer quality, deployment, and GT5 live URLs remain unverified. Deployment steps are still required. Full responsive/accessibility and console audits were not performed.
