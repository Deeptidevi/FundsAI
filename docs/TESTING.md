# G-MAPS INDUSTRIAL INTELLIGENCE: TESTING & QUALITY ASSURANCE

**Document Version:** 1.0.0  
**Test Suite Coverage:** Unit Tests, Integration Tests, End-to-End Verification, Security Tests

---

## 1. Automated Test Execution

The codebase includes automated tests across `@gmaps/shared` and `@gmaps/server`.

To execute all test suites:

```bash
# 1. Run Shared Domain & Rules Tests
npm --prefix shared test

# 2. Run Server Integration Tests
npm --prefix server test
```

### Verified Test Results Summary:
```text
TAP version 13
# Subtest: DoT Phone Parser: Indian mobile numbers ...................... PASS
# Subtest: DoT Phone Parser: Landlines with STD codes ................... PASS
# Subtest: DoT Phone Parser: Toll-Free 1800 ............................ PASS
# Subtest: Tier Classification: Gold, Silver, Bronze ................... PASS
# Subtest: Branch Preservation Rule (>500m separation) ................. PASS
# Subtest: Industrial Filter: Excludes Consumer types .................. PASS
# Subtest: Geodetic Math: Haversine distance & asymmetric bounding box .. PASS
# Subtest: Database Migrations: Successfully executes initial schema ... PASS
# Subtest: CSV Import Engine: Parses, validates, normalizes phone ...... PASS
# Subtest: Campaign Orchestration: Multi-step approval & durable queue . PASS
# Subtest: Suppression List: Prevents outreach to opted-out recipients . PASS
# Subtest: Health Checks: Real adapters report honest status ........... PASS
---------------------------------------------------------------------------------
TOTAL: 12 passed, 0 failed (100% PASS)
```

---

## 2. Dedicated Test Lab Architecture (Requirement 11)

The **Test Lab** module in the web application (`/test-lab`) provides an isolated sandbox to test real email and WhatsApp infrastructure safely.

### Guarantees of Test Lab:
1. **Recipient Whitelisting:** Email and WhatsApp sends are locked strictly to the operator's configured test address (`TEST_ALLOWLIST_EMAIL`, `TEST_ALLOWLIST_PHONE`). Attempting to contact production leads from Test Lab is blocked at the API level with HTTP 403 Forbidden.
2. **Subject Tagging:** All outgoing test emails automatically append the prefix:
   ```text
   [G-MAPS TEST] <subject>
   ```
3. **Database Isolation:** Test runs are persisted in `test_runs` and excluded from all production dashboard analytics (`/api/analytics/dashboard`).
4. **Zero Production Lead Interference:** Test actions never alter a production lead's CRM status, never trigger follow-up schedules, and never consume production campaign send allowances.
