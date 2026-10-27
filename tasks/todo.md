# GT6 checklist

Detailed choices, dependencies, acceptance criteria, and verification: [plan.md](plan.md).

- [x] 1. Verify baseline, remote GT5/main state, and correct gt6-tests branches.
- [x] 2. Add frontend Vitest setup; preserve the existing Node suite.
- [x] 3. Add ClaimBadge, useToggle, and ReviewPage test files.
- [x] Checkpoint: frontend tests and required checks pass; any old failure is recorded.
- [x] 4. Add isolated Supertest/Vitest auth tests; preserve backend regression tests.
- [x] Checkpoint: backend tests, typecheck, and build pass without live service calls in GT6 tests.
- [x] 5a. Configure both CI workflows.
- [ ] 5b. User adds a distinct >=32-character backend Actions JWT_SECRET (currently absent).
- [x] 6. Update README evidence; demonstrate a deliberate failure, restore it, pass checks.
- [x] Checkpoint: local changes are reviewed and ready for the user's push authorization; existing dependency advisories remain recorded.
- [ ] 7. Obtain release authorization; push, open PRs, verify green checks, merge.
- [ ] Verify green main CI and live deployment checklist in both repos.
- [ ] Obtain tag-publication authorization; publish gt6 on both merged commits.
- [ ] Deliver both repository submission links.
