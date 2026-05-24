---
name: xtest
description: Exploratory testing from a user's perspective. AI-reasoned edge cases, happy path validation, non-happy-path scenarios, regression quality assessment. The closest thing to having a human test team. Invocable by any agent or the product owner.
---

# XTEST: Exploratory Testing

You have been asked to run exploratory testing. This is not a security audit (that is `/ntest`) and not a coverage exercise (that is unit/integration tests). This is the test a sharp, experienced QA engineer would run: reasoning about what real users will do, including things the developer did not anticipate.

The value is in the intelligence of the testing, not the volume.

## Scope

Determine scope from the invocation:
- `/xtest [project-name]` — full exploratory test of a project
- `/xtest [project-name] [feature-area]` — focused exploratory test (e.g. `/xtest my-app booking`)
- `/xtest [project-name] --post-change` — specifically looking for drift after recent heavy development

If no argument is given, ask which project or feature area.

## Phase 0: Understand the product

Before testing, you must understand what the product does and who uses it. This is not optional.

1. Read the project's configuration and any product documentation.
2. Read recent git history (`git log --oneline -30`) to understand what has changed recently.
3. Identify the user roles (e.g. administrator, collaborator, viewer, external user).
4. Identify the core user journeys: what does each role need to accomplish?
5. Read existing test suites to understand what is already covered and how.

**Output:** Brief statement of: what the product does, who uses it, what the core journeys are, what has changed recently.

## Phase 1: Happy path validation

For each core user journey, trace the path through the code:

### 1.1 Can the user accomplish their primary goal?

Walk through the code path for each core journey:
- Does the API accept the expected inputs?
- Does it return the expected outputs?
- Are success responses properly shaped?
- Does state change correctly (database writes, side effects)?
- Are related records updated (e.g. creating a resource updates its parent)?

### 1.2 Is the journey complete?

- Does the feature have all the endpoints it needs? (Can you create but not edit? Edit but not delete?)
- Are list/detail/create/update/delete all present where expected?
- Are pagination, filtering, and sorting implemented where lists could grow large?
- Does the UI have access to all the data it needs? (Check API response shapes against likely frontend needs)

### 1.3 Are success states handled well?

- After a successful action, is the response useful? (Does it return the created/updated record?)
- Are notifications or side effects triggered? (Emails sent? Audit records created?)
- Is the user's next step clear from the response?

**Output:** Happy path validation results per journey. Pass/fail with specific notes.

## Phase 2: Boundary exploration

Now deliberately push beyond the expected. For each feature area:

### 2.1 Empty states
- What happens when there is no data? (Empty lists, first-time user, no results)
- Does the API return a sensible empty response or error?
- Are there null/undefined traps in the response handling?

### 2.2 Maximum and extreme values
- What happens with very long strings? (Names, descriptions, URLs)
- What happens with very large numbers? (Quantities, prices, dates far in the future)
- What happens with maximum items? (Hundreds or thousands of records)
- Are there unbounded queries that would choke on large datasets?

### 2.3 Special characters and encoding
- Unicode in names, descriptions, file names?
- HTML/script tags in text fields? (Also a security concern, but here we care about data integrity)
- Emoji in text fields?
- Leading/trailing whitespace?

### 2.4 Timing and concurrency
- What happens if the same action is submitted twice rapidly? (Double creation, duplicate records)
- Are there race conditions in read-modify-write patterns?
- What happens if a long-running operation is interrupted?
- Are there stale data risks (user A and user B editing the same record)?

### 2.5 State transitions
- Can records be moved to invalid states? (e.g. completing a task that depends on an incomplete predecessor)
- Are state transitions validated? (Can you go from "shipped" back to "draft"?)
- What happens when prerequisites are deleted? (Delete a parent; what happens to its children?)

**Output:** Boundary findings with specific code locations and scenarios.

## Phase 3: Role and permission scenarios

### 3.1 Role matrix
For each role, document what they can and cannot do:
- Read which resources?
- Create which resources?
- Update which resources?
- Delete which resources?
- Access which features?

### 3.2 Permission edge cases
- What happens when a user's role changes mid-session? (Promoted or demoted)
- What happens when a user is removed from a team/organisation?
- Can a user with expired permissions still access cached data?
- Are role checks consistent across related endpoints? (Can view a report but not the data it is built from?)

### 3.3 Multi-user scenarios
- User A creates something; user B tries to modify it. What happens?
- User A deletes something while user B is viewing it. What happens?
- Admin changes permissions while user is mid-workflow. What happens?

**Output:** Role matrix and permission edge case findings.

## Phase 4: Error recovery and resilience

### 4.1 User errors
- What happens when required fields are missing?
- What happens when fields have the wrong type? (String where number expected)
- Are error messages helpful? ("Something went wrong" is not helpful)
- Can the user recover from an error without starting over?

### 4.2 System errors
- What happens when the database is slow or unavailable?
- What happens when an external API fails? (Payment, email, webhook)
- Are errors logged with enough context to diagnose?
- Does a failure in one operation corrupt state for others?

### 4.3 Data integrity
- Create something, modify it repeatedly, delete it. Is the data consistent throughout?
- Are related records updated when the parent changes? (Cascade updates)
- Are orphaned records left behind when parents are deleted? (Cascade deletes)
- Are soft deletes implemented where needed? Can deleted records be restored?

**Output:** Error handling assessment with specific findings.

## Phase 5: Cross-feature interaction

Features that work in isolation may conflict when combined.

### 5.1 Feature combinations
- Do related features share data correctly?
- Can actions in one feature break assumptions in another?
- Are there shared resources with contention? (Same database row updated by multiple features)

### 5.2 Workflow continuity
- Does the end-to-end workflow make sense from a user perspective?
- Are there dead ends where the user cannot proceed?
- Are there circular paths where the user ends up back where they started?

**Output:** Cross-feature interaction findings.

## Phase 6: Automated test quality assessment

Review the existing test suite for quality, not just coverage:

### 6.1 Test realism
- Are test fixtures realistic? (Real-world data shapes, not `{id: 1, name: "test"}`)
- Do tests cover the scenarios that would actually happen in production?
- Are mocks accurate? (Do they match the real API/database behaviour?)

### 6.2 Test effectiveness
- Would these tests catch a real regression?
- Are assertions meaningful? (Testing the right thing, not just that it does not throw)
- Are edge cases covered in tests, or only happy paths?
- Are there tests that always pass regardless of implementation? (Tautological tests)

### 6.3 Missing tests
- Based on the exploratory findings, which scenarios should have automated tests but do not?
- Prioritise: which missing tests would catch the most impactful bugs?

**Output:** Test quality assessment with specific recommendations.

## Phase 7: Findings and output

### 7.1 Categorise findings

| Category | Definition | Action |
|----------|-----------|--------|
| **Bug** | Something that does not work as intended | Create card, fix if straightforward |
| **UX issue** | Works technically but confusing or unhelpful for users | Create card |
| **Missing feature** | Expected functionality that does not exist | Note for product owner |
| **Fragile area** | Works now but likely to break with changes | Recommend tests |
| **Test gap** | Scenario that should have automated coverage but does not | Write the test or create card |

### 7.2 Write tests for key findings

For each Bug or Fragile area found:
- Write an automated test that would catch the issue
- Use the project's existing test framework and conventions
- Focus on behaviour, not implementation

### 7.3 Summary

End with a structured summary:

```
## XTEST Summary: [project] — [date]

**Scope:** [what was tested]
**User roles tested:** [roles]
**Core journeys validated:** [pass/fail per journey]

**Findings:**
- Bugs: [count] — [one-line each]
- UX issues: [count]
- Missing features: [count]
- Fragile areas: [count]
- Test gaps: [count]

**Tests written:** [count and brief description]
**Cards created:** [list]

**Overall assessment:** [One paragraph: is this product ready for real users? What is the biggest risk?]

**Top 3 priorities:**
1. [finding]
2. [finding]
3. [finding]
```

## Rules

- Think like a user, not a developer. "Would a user understand this error message?" not "Does the error handler return the right status code?"
- Do not report theoretical issues. Every finding must be grounded in a specific code path you traced or a specific scenario you can describe step by step.
- Do not conflate security findings with UX findings. If you find a security issue, note it but refer to `/ntest` for proper security testing.
- Quality over quantity. Five well-reasoned findings that identify real user-facing risks are worth more than fifty shallow observations.
- The goal is to find what the developer did not think of. If the tests already cover it, move on.
- Be specific about what "a user might do": name the role, the scenario, and the motivation. "An administrator who just onboarded a new team member tries to assign them to a project" is useful. "A user might enter bad data" is not.
- When assessing test quality, be constructive. "This mock does not match the real API response shape because..." is useful. "These tests are bad" is not.
