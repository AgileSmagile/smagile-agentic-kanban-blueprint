---
name: regression-gate
description: Agent-only skill. After feature tests pass, walks the agent through regression test vectors for any new or modified API routes. Produces regression tests and documents coverage on the card. Invoked by the regression-gate hook, not by humans.
---

# Regression Gate

You have been triggered because your tests passed and your diff includes new or modified API route files. Before you open a PR or move this card, you must write regression tests for the security-critical paths in the code you changed.

This is not optional. The harness triggered this skill because your diff matched route patterns. The regression tests you write here are the tests that prevent silent security regressions after your feature ships.

## Step 1: Identify what you changed

Run the following to get the list of modified route files:

```bash
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached 2>/dev/null || git diff --name-only
```

Filter for API route files (patterns: `api/`, `routes/`, `pages/api/`, `app/api/`). These are the files that need regression coverage.

If no route files are in the diff, state "No API routes modified; regression gate passed" and stop.

## Step 2: For each modified route, work through these vectors

### Vector 1: Cross-user/cross-tenant data isolation

Does this endpoint return or modify data scoped to a user or tenant?

- **Check:** Every database query must include an ownership filter (e.g. `eq(table.userId, user.id)` or `eq(table.siteId, siteId)`).
- **Test:** Verify the ownership filter exists in the source code. Use the static analysis pattern (read the file, assert the pattern is present).
- **Skip if:** The endpoint is public, admin-only with no user-scoped data, or a health check.

### Vector 2: Resource ownership chains

Does this endpoint use nested resource IDs from the URL (e.g. `/sites/:siteId/plots/:plotId/tasks/:taskId`)?

- **Check:** Each level of the chain must be validated. A valid child ID from a different parent must not work.
- **Test:** Verify the ownership verification function is called for each nesting level.
- **Skip if:** The endpoint has no nested resource parameters.

### Vector 3: Role enforcement

Does this endpoint require a minimum role (e.g. "full", "admin", "collaborator")?

- **Check:** Role check is called before any data mutation.
- **Test:** Verify the role check is present and specifies the correct minimum role.
- **Skip if:** The endpoint is read-only with no role requirement.

### Vector 4: Auth enforcement

Does this endpoint call the correct auth function before any database access?

- **Check:** Auth middleware is the first significant call in the handler.
- **Test:** Verify auth is called before the first database query. If a route-auth-coverage sentinel exists for this project, verify the route is listed correctly (not in the exempt list without a documented reason).
- **Skip if:** The endpoint is explicitly public with a documented reason in the sentinel.

### Vector 5: Input validation on security boundaries

Does this endpoint accept foreign key references in the request body (e.g. `tradeId`, `plotId`, `userId`)?

- **Check:** Every client-supplied ID must be verified as belonging to the authenticated scope before use in a query or mutation.
- **Test:** Verify a lookup or join validates the relationship between the supplied ID and the authenticated context.
- **Skip if:** The endpoint accepts no foreign key references from the client.

### Vector 6: Token-gated routes

Is this endpoint public and authenticated via a URL token rather than a session?

- **Check:** Rate limiting must be present. Token validation must not leak token state (expired vs invalid vs revoked must return the same error). Queries must be scoped to the token's context.
- **Test:** Verify rate limiting is called. Verify error responses are opaque.
- **Skip if:** The endpoint uses session auth, not token auth.

## Step 3: Write the tests

Create a test file following the project's established pattern:

- **If the project uses static source analysis tests:** read the route file content and assert patterns are present.
- **If the project uses functional tests:** mock auth and database, make requests, assert correct status codes.
- **Match the existing test framework** (vitest, jest, etc.) and file naming convention.

Place the test file adjacent to existing test files for this project's auth/security tests.

## Step 4: Run and verify

```bash
npm test
```

All tests must pass. If a regression test fails, that means the code you wrote has a security gap. Fix the code, not the test.

## Step 5: Document on the card

Add a comment on your card:

```
[regression-gate] Regression vectors covered:
- [list each vector tested and what it checks]

Vectors not applicable (with reasons):
- [list each skipped vector and why]

Test file: [path to new test file]
```

## Rules

- Do NOT skip vectors without documenting why they do not apply.
- Do NOT write tests that mirror the implementation. Test the invariant ("ownership filter must exist"), not the specific query shape.
- Do NOT delete or weaken existing regression tests to make yours pass.
- If you discover a security gap while writing these tests, fix the gap in the same PR. Do not ship known vulnerabilities.
