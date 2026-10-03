# GT4 Part 1 Claims API Design

Approved in chat on October 3, 2026: finish the Session 9 backend around Claim, then teach the concepts through the resulting code. Frontend integration belongs to Session 11.

## Behavior

Students register with name, email, and password; registration always assigns the student role. Passwords are hashed with bcrypt and never serialized. Login returns a signed, two-hour JWT. Inactive users cannot log in or use protected routes.

Claim stores itemId and claimantId as ObjectIds, claimedAt as a Date, proofDescription as required trimmed text of 10–1000 characters, and status as pending/approved/rejected with default pending. Status replaces the backend verified flag. Students may edit itemId and proofDescription, but not ownership, dates, or status. Every claim operation is scoped to the authenticated claimant; absent and other users' claims both return 404.

Item supplies a shared, authenticated read-only catalogue. Sample data is inserted explicitly by an idempotent seed command. Creating or changing a claim's itemId must check that the item exists. A Mongoose ref alone is insufficient.

## Structure and verification

Keep schemas in models, Bearer authentication in middleware/auth.ts, routes in routes, app assembly in app.ts, database connection in config/db.ts, and process startup in server.ts. JSON uses string id/reference fields and hides _id, __v, and passwords. Runtime validation rejects malformed bodies and unexpected properties. Errors are JSON with 400/401/403/404/409/413/500 statuses as appropriate. Allowlisted CORS origins and environment variables configure deployment.

Model and HTTP integration tests use Node's test runner and a temporary MongoDB instance, never the user's Atlas database. Validate the live application separately without deleting app data. Deliver a Postman collection, README, learning walkthrough, deployment configuration, and a clean build. Use gt4-part1, preserve .env exclusion, and prepare the GitHub PR and hosting workflow within available account access.
