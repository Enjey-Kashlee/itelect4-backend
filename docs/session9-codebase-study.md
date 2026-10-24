# Session 9: learn this backend from the course to the running code

This guide explains the checked-out Campus Lost & Found backend against **ITELECT4 Session 9 — Node, Express, MongoDB & JWT**. Page numbers below mean the numbered pages in the [attached lecture console](</Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/ITELECT4_Session9_Backend.html>). Read a section, open its linked source, then answer its checkpoint before continuing.

The course artifact supplies the learning topics and classroom requirements. Its setup commands and submission instructions are study material here; they are not instructions to rebuild, deploy, push, merge, or modify this app.

**Evidence and scope.** Explanations below were checked against the current source, tests, configuration, CI workflow, and Postman collection. Statements labelled “reason” explain the design's practical effect; they do not claim an undocumented historical decision. Earlier sessions are discussed only through Session 9's recap and references. The sibling frontend's implementation is outside this walkthrough.

**Verification on 2026-10-24:** all 15 existing tests passed using temporary MongoDB; typecheck and build passed. The first sandboxed test attempt could not bind a port; the approved rerun passed. All 17 source files are linked, and local links, JSON examples, and copied TypeScript snippets were checked. No live Atlas, manual Postman run, hosting deployment, or frontend integration was verified.

The existing `docs/learning-guide.md` is locally deleted. This separate guide preserves that deletion and the other pre-existing working-tree changes. It documents the source that exists now, rather than restoring old documentation or deployment files.

## Reading route

1. Sections 1–3: understand the system and the files before reading functions.
2. Sections 4–7: learn types, schemas, validation, and JSON.
3. Sections 8–10: trace startup, registration, login, and authentication.
4. Sections 11–13: trace every endpoint and its errors.
5. Sections 14–17: understand seeding, tests, tools, and current limits.
6. Sections 18–19: practise explaining the system without looking at the answers.

For each section, ask: **What enters? What changes? What may fail? Who enforces the rule? Why does that rule belong there?**

## 1. What you are building

**Course pages 1–6: the second repository and the backend.**

The frontend presents screens and collects input. This backend receives HTTP requests, decides what is allowed, reads or writes MongoDB, and returns HTTP responses. Node.js runs the JavaScript. Express matches requests to functions. Mongoose maps documents and runs schema rules. MongoDB stores data. Atlas is a hosted MongoDB service, not a different database language.

A browser can skip its own form checks. Postman and curl can call this API directly. Therefore, browser validation helps the user, while server validation and authorization decide what the application accepts.

Session 9 describes moving from `json-server` and mock login to application-owned rules and real identity checks. A mock server still serves HTTP; the teaching distinction is that this backend contains your domain rules, credential checks, and ownership filters.

The repos stay separate. A successful backend request does not prove frontend integration. The frontend must later send real tokens, use the backend's string IDs, adapt field names, and convert JSON dates where needed.

### The domain mapping

| Lecture example          | Campus Lost & Found           | Meaning                                                       |
| ------------------------ | ----------------------------- | ------------------------------------------------------------- |
| `Submission`             | `Claim`                       | The selected user-owned CRUD resource                         |
| `studentId`              | `claimantId`                  | User who owns that record                                     |
| `submittedAt`            | `claimedAt`                   | Server-generated creation date                                |
| `courseCode` / `repoUrl` | `itemId` / `proofDescription` | App-specific editable fields; their meanings and rules differ |
| `Course`                 | `Item`, loosely               | Supporting domain data; this app actually persists items      |

Do not equate a claim with an item. An **Item** describes a lost or found object. A **Claim** records a user's assertion about an item. A **User** can report an item and can also make claims. Those are different relationships.

Example: Alice reports a bottle. Bob recognises it and submits proof. The item's `reportedById` identifies Alice. The claim's `claimantId` identifies Bob. Its `itemId` identifies the bottle's database record.

The API accepts a claim; it does not prove ownership of the physical object. Status remains `pending` because administrator review is outside the implemented scope.

**Checkpoint:** Why can someone claim an item they did not report? Because item reporting and claim ownership represent different actions.

## 2. Course map: all 49 pages

Use this map when the lecture and the project use different filenames or examples.

| Pages | Course topic                                    | Study here                                       |
| ----- | ----------------------------------------------- | ------------------------------------------------ |
| 1–3   | Prerequisites, goals, Sessions 1–8 recap        | Sections 1 and 3                                 |
| 4–6   | Backend, mock server replacement, separate repo | Sections 1–3                                     |
| 7–8   | npm scripts and TypeScript configuration        | Section 3                                        |
| 9–12  | Atlas, credentials, IP access, URI, environment | Section 8                                        |
| 13–14 | Obtain a token and create example records       | Sections 9 and 18; use claims and existing items |
| 15–17 | Interfaces and derived types                    | Sections 4–5                                     |
| 18–19 | Resource schema and server rules                | Section 6                                        |
| 20    | `_id` becomes `id`                              | Section 7                                        |
| 21–22 | User schema and password hashing                | Sections 6 and 9                                 |
| 23    | Interface versus schema                         | Sections 4 and 5                                 |
| 24–26 | Connection and startup order                    | Section 8                                        |
| 27–29 | Middleware, errors, full request flow           | Sections 10, 12, and 13                          |
| 30–34 | JWT, payload, `req.userId`, guard               | Section 10                                       |
| 35–36 | Register and login                              | Section 9                                        |
| 37–43 | Five protected CRUD routes                      | Sections 11–12                                   |
| 44–45 | Expected results and debugging traps            | Sections 13 and 18                               |
| 46–47 | GT4 Part 1 and pre-push checks                  | Sections 15–17                                   |
| 48–49 | Later sessions and recap                        | Section 17                                       |

Connections to earlier sessions come from the supplied lecture: Session 1 supplies domain interfaces; Session 2 supplies utility types; Session 6 introduces frontend route protection and mock authentication; Session 7 exposes API/JSON type differences; Session 8 introduces browser form validation. This guide does not reconstruct other course content that was not supplied.

## 3. Repository and tools

### Every source file has an owner

| File                                                                                                                                                   | Responsibility and reason                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [src/types/index.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/types/index.ts)                     | Shared TypeScript shapes; avoids separately declaring the same fields everywhere |
| [src/models/Claim.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/Claim.ts)                   | Claim storage schema and domain validation                                       |
| [src/models/Item.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/Item.ts)                     | Lost/found item schema and reporter reference                                    |
| [src/models/User.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/User.ts)                     | Account schema, email index, password save hook                                  |
| [src/models/json.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/json.ts)                     | Shared conversion from Mongoose document output to public JSON                   |
| [src/middleware/validation.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/validation.ts) | Checks untrusted request values before routes use them                           |
| [src/middleware/auth.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/auth.ts)             | Verifies token and account, attaches authenticated identity                      |
| [src/middleware/errors.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/errors.ts)         | Converts expected and unexpected errors into JSON HTTP responses                 |
| [src/routes/auth.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/auth.ts)                     | Registration and login                                                           |
| [src/routes/claims.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/claims.ts)                 | Claim CRUD, reference existence, and ownership filters                           |
| [src/routes/items.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/items.ts)                   | Shared authenticated item reads                                                  |
| [src/config/env.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/config/env.ts)                       | Parses and checks configuration once                                             |
| [src/config/db.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/config/db.ts)                         | Connects MongoDB and waits for user index readiness                              |
| [src/app.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/app.ts)                                     | Builds Express middleware and routes without opening a listening port            |
| [src/server.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/server.ts)                               | Owns startup, HTTP listener, and shutdown signals                                |
| [src/data/seedItems.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/data/seedItems.ts)               | Inserts reusable sample items without replacing existing ones                    |
| [src/scripts/seed.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/scripts/seed.ts)                   | Command-line lifecycle for seeding and database cleanup                          |

### Root and supporting files

[package.json](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/package.json) declares scripts and dependencies. [package-lock.json](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/package-lock.json) records resolved dependency versions so `npm ci` installs the recorded dependency tree. It is generated dependency metadata, not application logic to memorize.

[tsconfig.json](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/tsconfig.json) tells the compiler how to check and emit code. [AGENTS.md](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/AGENTS.md) records repository conventions and scope. [README.md](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/README.md) explains usage, but parts refer to locally deleted documentation/deployment files; use actual source as the current behavior reference.

[.env.example](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/.env.example) lists configuration keys without real secrets. [.gitignore](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/.gitignore) excludes dependencies, output, local secrets, coverage, logs, and system files. Ignoring a file does not remove it from Git if it is already tracked, and does not erase past secrets from history.

The four test files, Postman files, and CI workflow are explained in Sections 15–16. `node_modules/` contains installed dependencies. `dist/` contains emitted JavaScript and is ignored. Neither is handwritten domain source.

### What each command does

| Command              | What happens                                                 | What it does not prove                         |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `npm ci`             | Installs locked dependencies                                 | That the app works                             |
| `npm run dev`        | Runs `tsx watch src/server.ts`; restarts on source changes   | Type correctness                               |
| `npm run typecheck`  | Runs `tsc --noEmit`                                          | Successful HTTP or database behavior           |
| `npm run build`      | Runs `tsc`, emitting JavaScript in `dist/`                   | Valid environment or working Atlas credentials |
| `npm start`          | Runs `node dist/server.js`                                   | That `dist/` matches later source edits        |
| `npm test`           | Executes `tests/*.test.ts` with Node's test runner and `tsx` | Deployment or frontend integration             |
| `npm run seed:items` | Runs the seed script against the configured database         | That the configured database is disposable     |

Node 24 is the repository target and CI version. `package.json` permits Node `>=24`, but that declaration alone does not prove later major versions were tested.

`target: "ES2022"` sets emitted JavaScript language level. `module` and `moduleResolution` use `nodenext`, following Node's module rules. Together with `"type": "commonjs"`, the current project emits CommonJS. TypeScript's source `import` syntax does not by itself make the runtime project ESM.

`rootDir` is `src/`; `outDir` is `dist/`. `strict` enables stronger static checks. `esModuleInterop` helps imports from CommonJS packages. `skipLibCheck` skips checking dependency declaration internals; it does not disable checking your source. Consistent filename casing helps avoid imports that work on one filesystem and fail on another.

`include` covers `src/**/*`. The current `typecheck` and `build` scripts do **not** type-check `tests/`. Tests are executed through `tsx`, which strips their types.

Runtime dependencies own specific jobs: `express` handles HTTP routing; `mongoose` handles models and database access; `jsonwebtoken` signs/verifies tokens; `bcryptjs` hashes/checks passwords; `dotenv` loads local environment; `cors` handles browser cross-origin policy. `bcryptjs` avoids native compilation tooling, matching the lecture's portability rationale. Development dependencies supply TypeScript, the runner, type declarations, and temporary MongoDB for tests.

**Checkpoint:** Why can `npm run dev` work while `npm run build` fails? Running stripped TypeScript is not the same as checking its types.

## 4. TypeScript: describe data before using it

**Course pages 15–17 and 23.** Open [src/types/index.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/types/index.ts).

An interface describes the fields TypeScript expects in your code. It disappears at runtime. JSON arriving from a network does not gain correctness because a handler declares a body type.

```ts
export type ID = string;
export type ClaimStatus = "pending" | "approved" | "rejected";
```

`ID` is a readable name for a string. It does not validate a string or create a special runtime ID class. `ClaimStatus` is a union: TypeScript permits these three literal values in checked code. The runtime schema separately restricts stored statuses.

`User`, `Item`, and `Claim` describe application-facing shapes. `User` omits a password because public account data must not expose it. `Item.status` describes whether the object is lost or found. `Claim.status` describes review progress. They answer different questions.

### Derive types instead of copying interfaces

```ts
export type UserDoc = Omit<User, "id"> & { password: string };
```

`Omit` removes a field from a type. `&` combines the remaining shape with another shape. This type removes public `id` and adds the password used internally. Mongoose supplies the document's `_id` separately.

```ts
export type ClaimDoc = Omit<Claim, "id" | "claimantId" | "itemId"> & {
  itemId: Types.ObjectId;
  claimantId: Types.ObjectId;
};
```

The storage type replaces API reference strings with MongoDB-native ObjectIds. `"id" | "claimantId" | "itemId"` is a union of keys to omit, not a runtime expression. `ItemDoc` makes the same conversion for `reportedById`.

```ts
export type NewClaimBody = Pick<Claim, "itemId" | "proofDescription">;
export type UpdateClaimBody = Partial<NewClaimBody>;
```

`Pick` keeps only selected fields. `Partial` makes those fields optional, permitting a patch to change one field. It also permits an empty object at the type level. The route rejects an empty patch at runtime.

`RegisterBody` and `LoginBody` describe accepted fields for developers. The routes still run `jsonBody`, `onlyFields`, and field checks because HTTP callers are not TypeScript callers.

### Syntax you will repeatedly meet

- `import type` imports compile-time information without adding a runtime dependency for that type.
- `Schema<ClaimDoc>` supplies a generic type argument: the schema is associated with that document shape.
- `Request<IdParam, unknown, UpdateClaimBody>` describes URL parameters, response body type, and request body type. It does not inspect incoming JSON.
- `unknown` requires checking a value before using it. `any` largely bypasses those checks.
- `Promise<string>` means an asynchronous operation resolves to a string or rejects.
- `await` waits inside that async function; other requests can still progress while I/O is pending.
- `throw` exits the current normal path. Express 5 forwards async handler rejection to error middleware.
- `?.` reads a property only when its receiver exists. `??` supplies a fallback for `null` or `undefined`.
- `as` asserts a type; it does not convert or validate the runtime value.
- `.field` reads a property; `{ field: value }` constructs an object; `{ field }` uses a variable with the same name.

**Checkpoint:** Does `NewClaimBody` prevent Postman from sending `status`? No. The runtime allowlist rejects it.

## 5. Four distinct checks: shape, existence, ownership, and validity

These checks solve different problems. None replaces another.

1. **Shape:** `objectId(...)` requires a string containing exactly 24 hexadecimal characters. `"hello"` fails with 400.
2. **Existence:** `Item.exists({ _id: id })` checks whether an item matches. A well-formed ID with no item returns 404 during claim creation/update.
3. **Ownership:** `{ _id: id, claimantId: req.userId }` requires both the requested claim and its authenticated owner to match.
4. **Domain validity:** schema rules require suitable proof length and a permitted status value.

A random valid ObjectId does not mean any document exists. An existing claim does not mean you may read it. An authenticated user does not make every value they send valid.

Open [src/middleware/validation.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/validation.ts):

- `jsonBody` requires a non-null object and rejects arrays. The parser handles JSON syntax first; this helper checks the resulting value's shape.
- `onlyFields` rejects any key outside an explicit allowlist. It does not silently discard forbidden fields.
- `stringField` rejects non-strings. It does not coerce a number or object into a string.
- `objectId` checks format before Mongoose receives the identifier.
- `passwordField` requires a string and caps it at 72 UTF-8 bytes, avoiding bcrypt's input truncation limit. Byte length differs from character count.

The claim schema trims proof and enforces 10–1000 characters. Thus `"   short   "` still fails. Route checks prevent coercion and unsupported fields; schema checks enforce domain values. Validation belongs at both boundaries for different reasons.

An allowlist also rejects MongoDB operators such as `$set` supplied as body keys. A string check rejects an email object such as `{ "$ne": null }`. Queries receive explicit fields built by the server rather than arbitrary request objects.

**Important precision:** these are **Mongoose application rules**, not MongoDB collection validators. A direct database write that bypasses Mongoose can bypass these schema rules. The unique email index is enforced by MongoDB once ready. This repo does not configure collection-level JSON Schema validators.

**Checkpoint:** What does `ref: "Item"` check? It names the related Mongoose model. It does not check existence, ownership, or whether an item is claimable.

## 6. Models: the rules around stored documents

**Course pages 18–19 and 21–23.**

A schema describes fields, casting, defaults, validation, hooks, and serialization behavior. A model exposes operations such as `create`, `find`, and `findOneAndUpdate`. A document is one record represented through that model.

### Claim, field by field

Open [src/models/Claim.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/Claim.ts).

```ts
const claimSchema = new Schema<ClaimDoc>({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
```

`new Schema` constructs runtime schema configuration. `Schema.Types.ObjectId` declares the field's runtime storage/casting type. `Types.ObjectId` in the TypeScript file describes the corresponding value type. `ref` enables relationship lookup conventions such as `populate`; no route here calls `populate()`.

`claimantId` is also a required ObjectId, referencing `User`. The authentication middleware checks the user account; the route sets this field from `req.userId`.

`claimedAt: { type: Date, default: Date.now }` supplies the current time when the field is absent. Passing the function lets Mongoose evaluate the time for each new document. Calling `Date.now()` while constructing the schema would compute a fixed value too early.

`proofDescription` is required, trimmed, and bounded to 10–1000 characters. The array form of a validator pairs its rule with an error message. These are app-specific rules replacing the lecture's GitHub URL and score examples.

`status` permits `pending`, `approved`, or `rejected`, requires a value, and defaults to `pending`. This satisfies the course's enum category. The enum permits these values in the model; it does not authorize students to set them over HTTP.

`claimSchema.set("toJSON", { transform: publicJson })` attaches the public output conversion. `model<ClaimDoc>("Claim", claimSchema)` creates the model used by routes. With default Mongoose naming, documents use the `claims` collection.

The three course rule categories are present: required references/proof, an enum for status, and minimum/maximum proof length. There is no reason to copy the lecture's GitHub URL rule into lost-and-found proof.

### Item

Open [src/models/Item.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/Item.ts). Title is required, trimmed, and 2–120 characters. Description is required, trimmed, and at most 1000. Location is required, trimmed, and at most 200. Status is `lost` or `found`. `reportedById` is a required User reference.

Items are stored because claims need real item records to reference. HTTP item routes provide authenticated reads only. There is no item creation/update/deletion endpoint in this scope.

### User

Open [src/models/User.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/User.ts). Name is trimmed, required, and 2–80 characters. Email is required, normalized to lowercase and trimmed, capped at 254 characters, checked against a basic email pattern, and indexed as unique.

The email regex checks basic shape; it does not prove a mailbox exists or belongs to the registrant. `unique: true` creates an index, rather than acting like `minlength` validation. Duplicate email writes surface as MongoDB duplicate-key errors.

Password is required, minimum eight characters, and hidden from normal query projections with `select: false`. Role defaults to `student`; allowed stored roles are `student` and `security_admin`. `isActive` defaults to true. Current authentication reads it, unlike the lecture example where it is not used yet.

This model has no `{ timestamps: true }` option. Do not expect the lecture User's automatic `createdAt` and `updatedAt` fields here.

**Checkpoint:** Why is a schema enum insufficient to block a student from approving a claim? `approved` is valid domain data. The request allowlist enforces who may submit which fields.

## 7. Storage values and JSON values differ

**Course page 20.** Open [src/models/json.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/json.ts).

`publicJson` adds string `id` from `_id`, deletes `_id`, `__v`, and `password`, then converts top-level ObjectId reference values to strings. The shared transform keeps the three models consistent.

`__v` is Mongoose's version key. Removing it from public output does not delete it from MongoDB. Likewise, renaming `_id` for output does not rename the stored field.

A claim in Mongoose has ObjectId values and a JavaScript `Date`. In an HTTP JSON response, IDs are strings and the date is an ISO string. JSON has no native ObjectId or Date type.

Illustrative response; generated values vary:

```json
{
  "id": "65f100000000000000000001",
  "itemId": "65f000000000000000000001",
  "claimantId": "65f200000000000000000001",
  "claimedAt": "2026-10-24T01:00:00.000Z",
  "proofDescription": "My initials are engraved underneath the bottle.",
  "status": "pending"
}
```

`res.json(document)` invokes document JSON serialization. The login route explicitly calls `user.toJSON()` before nesting it in its response. A model test's `toJSON()` result can still contain a Date object; JSON encoding is what turns that date into text.

The declared `Claim.claimedAt: Date` therefore does not precisely describe the raw wire value. A frontend must parse a response date before calling Date methods. Serialization helps align API shapes, but does not complete frontend integration.

No `populate()` means `itemId` remains an identifier rather than an embedded item. Fetch `/api/items/:id` if you need item details. The current transform handles top-level ObjectIds; it is not a recursive serializer for imagined future nested structures.

**Checkpoint:** Does hiding a password remove it from storage? No. The hash remains stored; query projection and JSON conversion control exposure.

## 8. Configuration and startup: make the server ready first

**Course pages 9–12 and 24–26.** Open [src/config/env.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/config/env.ts), [src/config/db.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/config/db.ts), and [src/server.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/server.ts).

### Environment and Atlas

`import "dotenv/config"` loads local environment values before startup reads them. Hosted deployments normally supply environment values through host settings. `.env.example` documents keys without publishing credentials.

`readConfig(process.env)` returns typed application configuration. It requires a URI beginning with `mongodb://` or `mongodb+srv://`, a secret of at least 32 characters, a decimal port from 1–65535, and at least one allowed frontend origin. Defaults are port 4000 and origin `http://localhost:5173`. Multiple origins are comma-separated and trimmed.

These checks reject obviously wrong configuration; they do not verify credentials, secret randomness, or connectivity. A 32-character predictable secret still lacks adequate secrecy. Connection success is a separate step.

Atlas website login, database credentials, and application accounts are three different identities:

- Your Atlas account manages the hosted service.
- The database user inside the URI lets this backend connect to MongoDB.
- A Campus Lost & Found account is stored in `users` and signs in through this API.

The URI must identify the intended database. Special characters in credentials may need percent encoding. Network access rules must allow the machine running the backend; a valid password does not bypass an IP access rule. Prefer allowing the required address rather than treating unrestricted access as necessary.

Atlas pricing, UI labels, and tier limits in the lecture are dated service information. They were not live-verified for this guide. They are not code invariants to memorize.

### Startup sequence

1. Load environment values and parse configuration.
2. `await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })`.
3. `await User.init()` to wait for user model/index initialization.
4. Build the Express app with the validated configuration.
5. Listen on the configured port and `0.0.0.0`.

The timeout limits server selection waiting; it is not a guaranteed five-second deadline for every possible startup failure.

Waiting for `User.init()` matters because the unique email index must be ready before accepting registrations. Checking for an existing email in application code alone would race: two concurrent requests could both observe no user and both try to insert. The database's unique index decides which insert succeeds. The error handler maps duplicate key code `11000` to 409.

The server binds all IPv4 interfaces so it can work on hosting platforms as well as locally. This is separate from the `0.0.0.0/0` CIDR sometimes mentioned in Atlas access lists.

The split between `createApp` and `server.ts` makes tests possible without starting the normal server or reading production `.env` settings. Tests supply their own config, database connection, and temporary port.

A listener error logs a generic message, disconnects MongoDB, and sets a failure exit code. `SIGINT` and `SIGTERM` stop accepting connections and disconnect after the HTTP server closes. The outer catch reports known configuration messages or a generic database/connectivity error, avoiding credential exposure.

**Checkpoint:** Why not call `listen` before awaiting MongoDB? Requests could arrive before the database and required index are ready.

## 9. Registration and login: two different workflows

**Course pages 21–22 and 35–36.** Open [src/routes/auth.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/auth.ts) beside [src/models/User.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/User.ts).

### Register: create an account

`POST /api/auth/register` accepts name, email, and password. It checks the body object, rejects extra fields, checks strings/password byte length, and explicitly creates a user with `role: "student"`.

The User schema trims/normalizes values and validates them. The save hook hashes the password before insertion. A successful insert returns 201 and public user JSON. Registration does **not** issue a token.

```ts
userSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
});
```

This is a regular function because Mongoose binds `this` to the document. An arrow function would capture a different `this`. The modified check prevents hashing an existing hash again when only the user's name changes. `User.create()` uses document save behavior, so registration runs the hook.

Bcrypt produces a salted, one-way hash. Equal passwords normally produce different hashes because salts differ. Login checks a guess with `bcrypt.compare`; it does not decrypt anything. A stolen hash can still be attacked by guessing, so hashing does not make weak passwords safe.

The cost factor is **12 here**, compared with **10 in the lecture**. Higher cost consumes more work per hash/check. This improves resistance to guessing but also consumes server resources. No performance benchmark is claimed here.

The hook protects this save path. Query updates such as `updateOne` do not automatically run a `pre("save")` hook. There is no password-change endpoint; any future one must preserve hashing deliberately.

### Login: check credentials and issue proof

`POST /api/auth/login` accepts only email and password. Email is trimmed/lowercased to match storage normalization. Password is not trimmed; spaces can be part of a password.

`User.findOne({ email }).select("+password")` retrieves the normally hidden hash for this check. The route rejects missing users, inactive accounts, and incorrect passwords with the same 401 message: `Email or password is incorrect`.

A valid login signs `{ userId: String(user._id) }` using HS256 and a two-hour expiry. It returns `{ token, user }`, with no password in the public user.

The generic credential message avoids an explicit “email exists” clue. It does not guarantee identical timing, and registration still identifies duplicates. Do not describe this as complete protection against account enumeration.

`select: false` and the JSON transform serve different purposes. Projection avoids normally fetching the hash. The transform strips it even when login deliberately fetched it.

**Checkpoint:** Why compare with `bcrypt.compare` instead of hashing the supplied password and comparing strings? A new hash gets a new salt; compare uses the stored hash's parameters.

## 10. JWT, middleware, and the authenticated identity

**Course pages 27–34.** Open [src/app.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/app.ts) and [src/middleware/auth.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/auth.ts).

A JWT has a header, payload, and signature. Header/payload use Base64URL encoding and can be read without the signing secret. HS256 uses an HMAC signature to detect tampering. It is not encryption. Never put passwords or private proof text in a token.

`iat` means issued-at time; `exp` means expiration time. These are timestamps in seconds. Two hours is 7200 seconds. Anyone possessing a valid bearer token can use it, so protect the token and use HTTPS in deployment. Do not paste real tokens into public decoder sites.

### The guard's exact order

1. Parse one bearer token from the `Authorization` header.
2. Verify its signature and expiry with `jwt.verify`, allowing only HS256.
3. Check that the payload is an object containing a 24-hex-character string `userId` and a numeric `exp`.
4. Query the user and require `isActive`.
5. Set `req.userId` and call `next()`.

The regex accepts `Bearer` case-insensitively, unlike the lecture's exact `startsWith("Bearer ")` check. A missing or malformed header returns `Send Authorization: Bearer <token>`. A parsed but invalid token returns `Token is invalid or has expired`. An unavailable account returns `Account is unavailable`.

The `try/catch` surrounds token verification/payload checks. Database lookup errors are outside it, so a database failure is not falsely labelled an invalid token.

The database lookup costs a query per protected request but makes account deactivation effective even before token expiry. This is a meaningful addition to the lecture guard.

`declare global { namespace Express { interface Request { userId?: string } } }` extends Express's TypeScript Request declaration. It does not attach a value at runtime. The assignment inside the guard does that.

The property is optional because public requests have not passed authentication. Protected routes rely on middleware ordering to establish identity. TypeScript does not prove that `router.use(requireAuth(...))` ran first; source structure and tests protect that invariant.

`requireAuth(secret)` returns a middleware function. `createClaimsRouter(secret)` and the other factories receive dependencies explicitly instead of reading the secret throughout the code. Tests can use a test secret without changing global configuration.

### App middleware order

`createApp` disables the `x-powered-by` header, installs CORS, installs a JSON parser with a `32kb` limit, mounts health/auth/claim/item handlers, then installs the unmatched-route 404 and error handler.

A URL such as `/api/claims/abc` first matches the `/api/claims` mount. Its router then handles `/:id`. The router-wide auth guard runs before those handlers.

CORS permits configured origins and requests with no `Origin`. A disallowed supplied origin becomes 403. Postman and other non-browser clients commonly omit Origin, so they are not evidence that browser CORS works. CORS is browser policy, not authentication; a caller outside the browser can omit or choose a header.

Because CORS and JSON parsing come first, a forbidden origin or malformed JSON can fail before authentication. “All protected requests without tokens return 401” needs that qualification.

**Checkpoint:** Is a frontend `ProtectedRoute` sufficient? No. It controls rendering, while this middleware controls access to API data.

## 11. Every route and why it exists

**Course pages 37–43.** Open [src/routes/claims.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/claims.ts) and [src/routes/items.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/items.ts).

| Method and path           | Identity | Successful response                                   |
| ------------------------- | -------- | ----------------------------------------------------- |
| `GET /api/health`         | Public   | 200 with `{ "ok": true, "db": true }` while connected |
| `POST /api/auth/register` | Public   | 201, public user                                      |
| `POST /api/auth/login`    | Public   | 200, `{ token, user }`                                |
| `GET /api/items`          | Required | 200, shared items sorted by title ascending           |
| `GET /api/items/:id`      | Required | 200, one item                                         |
| `GET /api/claims`         | Required | 200, caller's claims sorted by `claimedAt` descending |
| `GET /api/claims/:id`     | Required | 200, one owned claim                                  |
| `POST /api/claims`        | Required | 201, new owned claim                                  |
| `PATCH /api/claims/:id`   | Required | 200, updated owned claim                              |
| `DELETE /api/claims/:id`  | Required | 204, empty body                                       |

Health returns 503 with both booleans false if Mongoose is disconnected. This differs from the lecture's always-200 health response and independent `ok` flag. The current handler reads connection state; it does not execute a database ping or a CRUD query.

### List and read

`Claim.find({ claimantId: req.userId }).sort({ claimedAt: -1 })` returns only this user's records, newest first. An empty result is `[]`, not an error. `-1` means descending order. Equal timestamps do not have an explicit tie-breaker.

Reading one validates the URL ID, then calls `findOne` with both `_id` and `claimantId`. A matching ID owned by someone else and a nonexistent record both yield `No claim with that id` and 404. This avoids explicitly confirming a private record's existence.

Item reads intentionally have no reporter ownership filter. Any authenticated active user can browse the shared catalogue and select an item for a claim. Do not apply the claim privacy rule to the catalogue.

### Create

Only `itemId` and `proofDescription` are accepted. `existingItem` validates the ID and calls `Item.exists`. The route creates an explicit object containing those values and `claimantId: req.userId`. The schema supplies date and initial status.

The lecture spreads request data and then overwrites the owner. This app instead rejects extra keys and constructs the allowed fields. Sending `claimantId`, `claimedAt`, or `status` returns 400 instead of silently accepting/overwriting those fields.

`Item.exists` prevents a normal request from creating a dangling reference. It is not a foreign-key constraint or transaction. External database edits could remove the item between checking and writing. No item-delete HTTP route currently exists, which limits that particular race within this API.

### Update

PATCH changes the supplied editable fields; omitted fields keep their current values. It does not mean replacing the whole record, as a full PUT commonly would.

The route validates the claim ID and builds the ownership filter. It checks `Claim.exists(filter)` before inspecting the body or replacement item, so another user receives 404 before those validations disclose information.

Then it checks the body/allowlist, rejects `{}`, validates any replacement item, checks any proof string, and builds `changes` explicitly.

```ts
const claim = await Claim.findOneAndUpdate(
  filter,
  { $set: changes },
  { returnDocument: "after", runValidators: true },
);
```

`$set` changes only the named fields. `returnDocument: "after"` returns the updated record, corresponding to the lecture's `new: true`. `runValidators: true` applies update validation; Mongoose update validators are normally disabled. These validate updated paths and supported operations, not every conceivable database invariant.

The final write still includes ownership. The preliminary existence check alone would not safely authorize a later unscoped write. The final null check also handles a record disappearing between the initial check and update.

No optimistic concurrency token is used. Concurrent edits to the same field can overwrite each other. The code does not prevent duplicate claims for an item, nor does it block changes based on `approved` or `rejected` status. Do not infer rules that are absent.

### Delete

`findOneAndDelete` uses both claim ID and claimant identity. Missing/foreign records give 404. Success sends 204 with no response body. Repeating deletion gives 404 because the record no longer exists.

A frontend must not blindly call `response.json()` on a 204 response. Empty content is the deliberate result.

**Checkpoint:** What would break if GET used only `findById(req.params.id)`? Knowing another record's ID could expose its owner's claim.

## 12. Full trace: create a claim

**Course page 29, adapted to this code.** Read [src/app.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/app.ts), [src/middleware/auth.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/auth.ts), [src/routes/claims.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/routes/claims.ts), and [src/models/Claim.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/models/Claim.ts) in that order.

Suppose Bob sends a request with an allowed/no Origin, a valid bearer token, `Content-Type: application/json`, and this body:

```json
{
  "itemId": "65f000000000000000000001",
  "proofDescription": "  My initials are engraved underneath the bottle.  "
}
```

1. CORS accepts the origin policy. The JSON parser parses the body and enforces size.
2. Express mounts the claims router. Its guard verifies token signature, expiry, payload shape, and account activity.
3. The guard assigns Bob's verified ID to `req.userId`. It does not read ownership from JSON.
4. The POST route checks object shape and allowed keys. It checks proof is a string.
5. `existingItem` checks `itemId` format, then queries MongoDB for that item.
6. `Claim.create` supplies item, proof, and Bob's claimant ID. Mongoose casts references, generates `_id`, applies defaults, trims proof, and validates.
7. MongoDB inserts the document. The awaited operation resolves with the saved document.
8. `res.status(201).json(claim)` invokes the public transform and JSON encoding.
9. Bob receives string IDs, a date string, trimmed proof, and status `pending`.

No-token failure stops before the handler. Missing-item failure stops before claim creation. Short proof with an existing item reaches model validation and produces 400 before insertion. A database failure becomes a generic 500, not a validation success.

Registration follows a different model path: the User save hook hashes a password. Creating a Claim never hashes anything because Claim has no password hook.

**Predict before checking:** If the proof is short and the item is missing, which error wins? With a valid string proof and valid-shaped item ID, the missing item returns 404 before proof-length schema validation.

## 13. Errors are part of the API contract

**Course pages 28, 44–45.** Open [src/middleware/errors.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/middleware/errors.ts).

`HttpError` carries a deliberate status and message. Routes throw it for expected problems. Express 5 forwards rejected async handlers to the error middleware, so each route does not need repetitive catch-and-send blocks.

The error handler has four parameters. Express uses that signature to recognize it as error middleware, even though `_next` is unused. The underscore is a naming convention, not special runtime behavior.

| Status | Current cause                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------- |
| 400    | Wrong body shape, unsupported field, invalid ID, invalid field value, empty patch, malformed JSON |
| 401    | Missing/invalid/expired token, unavailable account, incorrect credentials                         |
| 403    | Disallowed supplied browser origin                                                                |
| 404    | Unknown route, missing item, missing or foreign claim                                             |
| 409    | Duplicate email index conflict                                                                    |
| 413    | JSON body exceeds parser limit                                                                    |
| 500    | Unexpected failure; generic public message                                                        |
| 503    | Health route sees disconnected database                                                           |

Mongoose ValidationError becomes `{ message: "Validation failed", errors: [...] }`. CastError becomes 400. Duplicate-key code `11000` maps to the email conflict message because that is the currently relevant unique-index conflict. New unique indexes would need that mapping reconsidered.

Parser errors receive specific JSON messages. Unexpected errors log the error name without request bodies, tokens, or connection strings. That avoids secret leakage but provides limited diagnostic detail.

The final ordinary middleware sends a JSON 404 when no route matches. It differs from a matched route throwing 404 because its record was not found; clients should inspect the message as well as status.

### Debug by layer

- App will not start: inspect validated configuration, database credentials, network access, index readiness, and port availability.
- `start` uses old behavior: rebuild `dist/`; it does not read your latest source directly.
- Login 401: check normalized email, exact password, account activity, and password projection. A malformed body may instead give 400.
- Claim 401: check header format, expiry, signing secret, and whether the account still exists/is active.
- Claim 400: check ID shape, body allowlist, string types, proof length after trimming, and JSON Content-Type.
- Missing Content-Type: the parser may leave the body undefined; this app converts that into 400 instead of the lecture's destructuring exception.
- Postman works but browser fails: inspect browser Origin/CORS and the request headers before changing database code.
- Claim 404: distinguish a missing referenced item from an inaccessible claim using the response message. Ownership filters deliberately conceal foreign claims.

**Checkpoint:** Why not return the complete thrown database error? It can expose implementation details and credentials.

## 14. Seeding: create demo data without resetting the database

Open [src/data/seedItems.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/data/seedItems.ts) and [src/scripts/seed.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/src/scripts/seed.ts).

Seeding supplies items because there are no item-write endpoints. Three fixed IDs identify a bottle, umbrella, and keychain. A sample reporter account satisfies each item's reporter reference.

The function looks for `sample-reporter@example.invalid`; if absent, it creates a student with a randomly generated password that is then hashed. This is not a published demo login. Register your own learning account.

Each item uses `updateOne` with `$setOnInsert`, `upsert: true`, and `runValidators: true`. If its ID exists, it keeps existing data. If absent, it inserts the sample values. There is no collection drop or claim deletion.

Fixed IDs make repeated seeding stable. Sequential reruns are tested. This is not a claim that concurrent first-time seeds are fully coordinated: two seed processes could race while creating the same reporter.

The entry script loads config, connects, seeds, reports success/failure, and disconnects in `finally`. `finally` runs on either outcome. Because it reuses `readConfig`, the seed command also needs a valid JWT secret even though seeding itself does not sign tokens.

**Checkpoint:** Does rerunning the seed reset a modified bottle title? No. `$setOnInsert` only applies when insertion occurs.

## 15. Tests: evidence for behavior

Open [tests/claimModel.test.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/tests/claimModel.test.ts), [tests/config.test.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/tests/config.test.ts), [tests/db.test.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/tests/db.test.ts), and [tests/api.test.ts](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/tests/api.test.ts).

The current suite has 15 top-level tests: three model tests, one config test, one readiness test, and ten HTTP/integration tests. A single top-level test often contains multiple assertions.

Model tests construct documents and call `validate()` without persisting. They check required IDs, proof bounds, defaults, and public ID serialization. Generating an ObjectId for such a test does not create an actual referenced item; that demonstrates why route existence checks are separate.

The config test exercises missing/bad settings and defaults. The readiness test mocks `mongoose.connect` and `User.init`; it delays and rejects initialization to prove `connectDatabase` waits and propagates failure. A mock isolates sequencing, while integration tests exercise real queries.

The API suite starts a temporary MongoDB process through `mongodb-memory-server`, connects Mongoose to its URI, waits for the User index, and listens on loopback with port `0`. Port `0` asks the OS to choose an available port. No Atlas URI is read for those tests.

The first run may download MongoDB into an operating-system temporary cache. “Memory server” does not mean database queries are mocked: a real temporary database process runs. Tests close the HTTP server, disconnect Mongoose, and stop that process afterward.

HTTP tests use built-in `fetch`. The helper adds JSON headers and tokens, serializes request bodies, and parses responses only if response text exists. That final condition handles 204 correctly.

The tests cover password hashing and hiding, email normalization/uniqueness, role rejection, byte limits, token lifetime and invalid signatures/algorithms, inactive accounts, CRUD, ownership, reference checks, item reads, JSON/CORS/size errors, and repeated seeding.

Tests do not prove every edge case. For example, seed coverage checks counts and preservation of existing fixture data; it does not assert every possible concurrent seed interleaving. There are no administrator-review or frontend-integration tests because those features are absent.

The test runner executes TypeScript through `tsx`. Run typecheck/build separately for source typing. No coverage threshold or lint script is configured.

**Checkpoint:** Why test both model and HTTP behavior? A valid model cannot prove authentication ran or the route used an ownership filter.

## 16. Postman, CI, and working conventions

### Postman is a real HTTP exercise

[postman/GT4-Part1.postman_collection.json](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/postman/GT4-Part1.postman_collection.json) contains 17 ordered requests and 25 `pm.test` checks. It registers two unique users, saves their tokens, selects an item, checks auth/validation/ownership, creates and edits a claim, and deletes that claim.

Collection variables carry `baseUrl`, credentials for generated demo accounts, tokens, user/item/claim IDs. The pre-request script uses a timestamp and random suffix to generate account emails. Test scripts save response values for later requests; running an isolated later request without those variables can fail.

[postman/Local.postman_environment.json](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/postman/Local.postman_environment.json) optionally supplies local `baseUrl`. Check the active variable value if requests hit the wrong server.

The collection has real side effects. It targets whatever server `baseUrl` identifies. Each complete run leaves two registered users even though it deletes its test claim. Use a separate learning database if you do not want account clutter. Committed token values are blank.

### CI is the automated version of local checks

[.github/workflows/ci.yml](/Users/enjeykashleealonzo/Documents/College Arc Season 4 Part 1/itelect4/itelect4-backend/.github/workflows/ci.yml) runs on pushes to `main`/`gt4-part1` and on pull requests. It checks out the repo, configures Node 24 with npm caching, installs locked dependencies, then runs tests, typecheck, and build.

Its GitHub token has read access to contents. It checks the application; it does not deploy it. Reading the workflow does not establish the status of a remote run.

### Course workflow versus current action

Repository instructions specify `gt4-part1`, a merged PR submission, and tagging `GT4` after Session 11. These explain how course work is submitted. Learning this code does not require committing, pushing, merging, or tagging now.

Local edits already existed when this walkthrough began, including README edits and deleted Docker/old documentation files. This study guide does not restore or stage them.

## 17. Differences from the lecture and real boundaries

Use these distinctions when explaining why the code does not match the slides character for character.

| Lecture baseline                                         | Current app                                                           | Practical reason/effect                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Submission CRUD                                          | Claim CRUD plus shared Item reads                                     | Uses the app's selected user-owned resource                      |
| Number IDs in original interfaces, derived storage types | Public string IDs, ObjectId references in storage types               | Matches MongoDB and API boundaries explicitly                    |
| Route trusts typed body and spreads it                   | Runtime object/string checks, explicit field construction, allowlists | Network JSON can bypass TypeScript and carry forbidden fields    |
| `ref` relationship                                       | `ref` plus `Item.exists()`                                            | A relationship name alone does not establish an existing target  |
| Separate inline JSON transforms                          | Shared `publicJson`                                                   | Keeps output IDs and password removal consistent                 |
| bcrypt cost 10                                           | Cost 12, 72-byte input cap                                            | Adds work per hash and avoids bcrypt truncation ambiguity        |
| Basic token check with assertion                         | HS256 restriction, runtime payload checks, active-user lookup         | Does not rely on a type assertion as validation                  |
| `isActive` present but unused                            | Checked during login and guarded requests                             | Disabled users cannot keep using existing tokens                 |
| Open `cors()`                                            | Origin allowlist                                                      | Restricts browser response access to configured frontend origins |
| JSON parser without explicit limit                       | `32kb` limit and JSON error responses                                 | Bounds request bodies and handles parser failures consistently   |
| Direct environment reads                                 | Checked config passed into app/router factories                       | Fails early and permits isolated tests                           |
| Connect before listening                                 | Connect and wait for User index before listening                      | Prevents accepting registration before uniqueness is ready       |
| `new: true`                                              | `returnDocument: "after"`                                             | Returns the updated record                                       |
| User timestamps enabled                                  | No automatic User timestamps configured                               | Do not assume lecture fields exist                               |
| Health always answers 200                                | 503 when disconnected                                                 | Connection failure affects health status                         |

The project has no WebSockets, administrator review endpoints, role-based administrator authorization, frontend integration, password recovery, refresh tokens, logout/token denylist, authentication rate limiting, or pagination. These are scope boundaries, not features secretly supplied by Express or JWT.

In particular, storing role `security_admin` does not grant special API capabilities here. All authenticated claim routes still use the caller's own claimant ID. Do not manually change accounts or credentials as part of studying.

The API allows duplicate claims and does not restrict claim creation to `found` items. The proof description is a statement, not verified evidence. List endpoints return all matching records; no explicit pagination or query optimization is present. Concurrency on proof edits uses ordinary database update behavior, without conflict detection for stale clients.

This is a course backend, not evidence of public production readiness. Hosted service setup, HTTPS, real Atlas connectivity, and deployment status require separate verification. Docker files are locally deleted in this checkout; README statements about prepared deployment files do not establish their availability.

## 18. Study lab: predict, run deliberately, explain

Use the existing tests for isolated verification. Manual Postman exercises write to the database selected by your local configuration. Choose a learning database first. Do not change or expose real credentials to follow a lecture demonstration.

### A. Read without running anything

1. Open `types/index.ts`. Identify the public claim fields and the two editable request fields.
2. Open `models/Claim.ts`. Find required, enum, min/max, default, and trim rules.
3. Open `routes/claims.ts`. Locate where caller identity enters every operation.
4. Open `middleware/auth.ts`. Distinguish verification from decoding and from account lookup.
5. Open `models/json.ts`. Explain why database and HTTP shapes differ.

### B. Local checks

With Node 24 and dependencies installed, run from the backend repo:

```sh
npm test
npm run typecheck
npm run build
```

Predict which check catches a type error, a missing ownership filter, or an invalid configuration value. Typechecking catches many source type errors. Behavioral tests can expose ownership regressions. Config validation runs when invoked, including during startup and its test.

To use Postman manually, prepare your own learning environment, run `npm run seed:items`, then `npm run dev`. Seeding and the dev server use real configured database settings, unlike the isolated test suite. Stop the dev server with Ctrl-C when finished.

### C. One request chain

1. `GET /api/health`: expect 200 and both flags true while connected.
2. Register a unique user with the JSON below: expect 201, string `id`, and no password.
3. Login using the same email/password: expect 200 and save the token.
4. `GET /api/items` with the bearer token: expect the shared catalogue. Copy a real `id`.
5. `POST /api/claims` with that item ID and proof: expect 201, your claimant ID, date, and `pending`.
6. `GET /api/claims`: expect your new claim in the array.
7. `PATCH /api/claims/<claimId>` with only proof: expect 200 and updated proof.
8. Read the claim using a second account's token: expect 404.
9. Delete it using the owner's token: expect 204 and empty content. Read again: expect 404.

Registration example; choose a fresh email for repeat runs:

```json
{
  "name": "Study Student",
  "email": "session9-study@example.com",
  "password": "LearnClaims123!"
}
```

Login uses only email and password. Claim creation uses only `itemId` and `proofDescription`; replace the example ID with one from the catalogue:

```json
{
  "itemId": "65f000000000000000000001",
  "proofDescription": "My initials are engraved underneath the bottle."
}
```

In Postman's Bearer Token field, paste only the token. Postman adds the `Bearer` prefix. For raw JSON bodies, send `Content-Type: application/json`.

### D. Change one input and predict the response

| Change                                                 | Expected result and layer             |
| ------------------------------------------------------ | ------------------------------------- |
| Omit token on a normal claims GET                      | 401, auth middleware                  |
| Use an expired or wrongly signed token                 | 401, token verification               |
| Send item ID `101` as a number                         | 400, runtime ID shape check           |
| Send a valid-shaped nonexistent item ID                | 404, route existence lookup           |
| Send proof `"short"` with an existing item             | 400, Claim schema                     |
| Send `status: "approved"` in a valid-owned claim patch | 400, route allowlist                  |
| Send `claimantId` during creation                      | 400, route allowlist                  |
| Send an empty patch for an owned claim                 | 400, route rejects no editable fields |
| Read another user's existing claim                     | 404, ownership-scoped query           |
| Register the same normalized email again               | 409, unique index and error mapping   |
| Send `Origin: https://unapproved.example`              | 403, CORS before route handling       |
| Send malformed JSON                                    | 400, parser and error handler         |

Do not test expected failures by removing security code. Use inputs and the existing assertions to learn where each request stops.

## 19. Explain it back: questions with answers

1. **What does Node do that Express does not?** Node runs the process and provides runtime facilities; Express organizes HTTP middleware and handlers within that process.
2. **What does MongoDB do that Mongoose does not?** MongoDB stores/query documents and enforces database indexes. Mongoose is an application library for models, validation, casting, and hooks.
3. **Why are interfaces insufficient?** Their runtime checks do not exist; TypeScript erases them.
4. **Why use Omit/Pick/Partial?** Derive storage/input/update shapes while reusing domain field definitions.
5. **Why are database references ObjectIds but API IDs strings?** Storage uses BSON ObjectIds; JSON transports their textual representation.
6. **Why is a valid-shaped ID insufficient?** It says nothing about a matching document or the caller's right to access it.
7. **Where does claim ownership come from?** The guard sets `req.userId` after verification/account checking; routes use it as `claimantId`.
8. **Why does another user's claim return 404?** The query requires ownership and avoids confirming a private claim exists.
9. **Does JWT hide identity?** No. It authenticates signed content; payload is readable.
10. **Why fetch the account after verifying JWT?** To reject deleted/inactive accounts before token expiry.
11. **Why await the unique index?** Database uniqueness must be available before concurrent registrations begin.
12. **Why is PATCH different from creation?** PATCH permits a subset of editable fields and must explicitly enable update validation.
13. **Why call `next()` only on auth success?** It allows protected handlers to run only after identity is established.
14. **Why return 204 on deletion?** The operation succeeded and deliberately has no representation to send.
15. **Why can a model accept approved status but HTTP reject it?** Model validity and caller permissions are separate rules.
16. **What remains after seeding twice?** The same fixed sample items and one sample reporter, preserving existing matching items in sequential runs.
17. **Why separate app construction from startup?** Tests can supply dependencies and a temporary listener without starting the configured real server.
18. **What is not proven by a successful build?** Credentials, connectivity, authorization behavior, hosting, and frontend integration.

Before moving on, explain this example aloud: **Bob claims Alice's bottle. Which ID identifies the item, which identifies the reporter, which identifies the claimant, and where is each checked?**

Answer: Item `_id` identifies the bottle, Item `reportedById` identifies Alice, and Claim `claimantId` identifies Bob. The claim route checks item ID shape/existence. The guard authenticates Bob; the claim write supplies Bob's ID. Item reads are shared. Later claim reads/changes require Bob's claimant identity, regardless of who reported the bottle.
