# Learn Session 9 Through Your Claims API

Keep the source file named in each section open beside this guide. Start the app and use the Postman collection to see the behavior you are reading about.

## 1. What is now real?

Your frontend demo used JSON Server and a name-based login. This backend is a Node process that receives HTTP requests, decides whether a caller is allowed to perform an action, and stores accepted data in MongoDB. The frontend is still independent; Postman acts as our client while learning the backend.

MongoDB stores documents, which resemble JavaScript objects. A collection groups one kind of document: users, items, or claims. A document remains in the database after the Node process stops. Mongoose is the library your Node code uses to describe and query those documents.

## 2. Startup: server.ts, config/env.ts, and config/db.ts

`server.ts` loads `.env` into `process.env`, validates settings, connects MongoDB, then starts listening on the configured port. `config/env.ts` checks the secret, URI, and port before they are used. `config/db.ts` contains the actual database connection call and limits how long connection selection can wait. It also awaits `User.init()` so the unique email index is ready before registrations can arrive; an index failure stops startup.

`app.ts` assembles Express without opening a port. That separation lets tests build the same app with test settings and run it on an available temporary port. The production process uses `server.ts`; tests use `createApp()`.

`npm run dev` executes TypeScript with watching but does not prove it type-checks. `npm run typecheck` checks types without producing files. `npm run build` compiles JavaScript to `dist/`, and `npm start` runs that output. Node needs that output for production startup.

## 3. TypeScript types and Mongoose rules

Open `src/types/index.ts` and `src/models/Claim.ts` together. The interface helps the compiler check your code; it disappears when JavaScript runs. Network clients can still send any JSON, so runtime validation is essential.

The schema describes accepted data at runtime. Claim requires its item and claimant, allows only pending/approved/rejected as its status, and limits trimmed proof text to 10–1000 characters. These are the graded task's required, enum, and minimum/maximum length rules. Defaults supply the current claim date and pending status.

Try sending a proof of `short` in Postman. Then try the same invalid proof in PATCH. Both must fail. Updates use `runValidators: true` so the schema's rules also run when editing a stored document.

## 4. ObjectIds, Omit, Pick, and references

MongoDB assigns each document an `_id`. The ObjectId is an object in the database code and is represented as a 24-character hexadecimal string in JSON. `ClaimDoc` replaces the API's string references with `Types.ObjectId`. `Omit` removes fields before redefining them; it avoids duplicating the entire interface. `Pick` selects only itemId and proofDescription for `NewClaimBody`; `Partial` makes those editable fields optional for PATCH.

The schema's `Schema.Types.ObjectId` is its runtime field type. TypeScript's `Types.ObjectId` describes the value stored in that field. `ref: "Item"` names the related model, but it does not check that an item exists. The claim route explicitly queries Item before accepting that reference.

`models/json.ts` changes `_id` into API-friendly `id`, removes internal version fields and passwords, and converts references to strings. Dates become ISO text when the response is encoded as JSON.

## 5. Registration and password hashing

Follow POST `/api/auth/register` in `routes/auth.ts`. The route validates the actual request body, then calls `User.create()`. `models/User.ts` runs a pre-save hook that hashes the password with bcrypt before saving. A hash is used to check an attempt later; it is not decrypted to recover the original password.

The hook checks `isModified("password")`. Saving a name change must not hash the existing hash again. The email schema normalizes case and whitespace. A unique database index prevents duplicate registrations, including simultaneous requests; the error handler returns 409 for a duplicate.

`select: false` excludes passwords from ordinary queries. The JSON transform removes them even when a query deliberately selected the password. Registration assigns the student role and rejects a body containing role, so someone cannot grant themselves administrator access.

## 6. Login and JWTs

POST `/api/auth/login` selects the password hash with `.select("+password")`, checks the attempted password with `bcrypt.compare()`, and signs a token containing the user's ID. `expiresIn: "2h"` gives it a two-hour lifetime. Wrong passwords, unknown users, and inactive accounts receive the same login error.

A JWT has header, payload, and signature sections. Its payload is readable; keep secrets out of it. The signature lets your server verify the token using JWT_SECRET. The response contains `{ token, user }`; Postman saves the token in a variable. Treat a token as a temporary login credential. Changing a character or using an expired token should return 401.

## 7. Middleware and the request path

Express processes middleware in the order it is registered in `app.ts`. CORS checks browser origins, `express.json()` parses a JSON body, and a matching router handles the path. CORS controls browser access to responses; it does not replace authentication.

`middleware/auth.ts` reads the Authorization header, verifies the token's signature and expiry, validates its user ID, and checks that the user is still active. It stores the verified ID on `req.userId` and calls `next()`. The TypeScript declaration in the same file teaches Express's request type about that extra property.

`router.use(requireAuth(jwtSecret))` is above every claim route. Each request must pass that guard before a handler runs. Express 5 passes rejected async handler promises to the final error middleware.

## 8. Trace your first claim

Send POST `/api/claims` with an itemId from GET `/api/items` and a proofDescription. You provide the item and proof. Authentication provides the claimant. The schema provides the date and initial status.

The route checks allowed fields, validates the ObjectId string, confirms the item exists, and calls `Claim.create()`. Mongoose checks its rules before saving. Express then encodes the sanitized document as JSON and returns 201.

Types such as `Request<unknown, unknown, NewClaimBody>` help while writing the handler. They do not remove extra JSON properties at runtime. That is why `onlyFields()` also rejects status, claimantId, claimedAt, and MongoDB update operators from incoming bodies.

## 9. CRUD and ownership

GET `/api/claims` filters by claimantId from the token. GET, PATCH, and DELETE for one record filter by both `_id` and claimantId. Changing the URL to another student's claim matches nothing and returns 404. Both a missing record and someone else's record get the same answer.

PATCH changes only fields that were sent and allowed. `$set` prevents the body from acting as a database command. `returnDocument: "after"` returns the edited claim, and `runValidators: true` keeps the schema rules active. This installed Mongoose version prefers returnDocument over the lecture's older `new: true` option.

DELETE returns 204 with an empty body. A client must not try to parse that response as JSON. A second DELETE returns 404 because the record is gone. Administrators' status-review routes are a future extension; these five routes are the student's own claim workflow.

## 10. Errors, tests, and deployment

Read `middleware/errors.ts`. Bad input and malformed IDs are 400, missing or invalid authentication is 401, duplicate registration is 409, and unexpected failures are a generic 500. Consistent JSON makes these errors usable by Postman and, later, your frontend. Server logs avoid passwords, tokens, and connection strings.

`tests/api.test.ts` sends real HTTP requests to the same Express app backed by a temporary MongoDB process. It checks hashing, login, every CRUD method, updates, item existence, and two users' access. These tests never use your Atlas URI. The seed test proves repeating the sample-data command does not overwrite existing records.

The deployment host runs the compiled Node app and supplies environment variables. The frontend will eventually live at another origin and use its own API base URL setting. That connection is separate coursework; for this session, a working API and its requests demonstrate the backend concepts.

Try explaining this request aloud: “I send an item ID and proof, the token identifies me, the schema validates the claim, MongoDB saves it, and the API returns JSON.” Then locate each part of that sentence in your files.
