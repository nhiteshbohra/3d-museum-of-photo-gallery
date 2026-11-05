# USER_CHAOS_REVIEW.md
## Complete User-Perspective Bug Hunt (Exhaustive Edition)

> **Purpose:** Find bugs that only appear in the real world, when real users do
> unexpected things, that our developer tests did not cover.
>
> **How to use (one command, runs by itself):** Give this file to an AI
> assistant that can read/write files (Claude Code, Cursor, Copilot agent, etc.)
> and say:
> *"Follow the AUTOMATED EXECUTION PROTOCOL in USER_CHAOS_REVIEW.md on
> `<file/folder>`. Run all sweeps until the stopping rule is met."*
>
> The AI will inventory the code, review every unit, run repeated sweeps,
> keep a bug ledger so nothing is reported twice, verify findings, and stop
> only when the stopping rule is satisfied. You do NOT need to re-run it
> again and again manually. In plain chat (no file access) it works in
> chunks: just reply **"continue"** (see P8).

---

## AUTOMATED EXECUTION PROTOCOL (READ THIS FIRST, IT CONTROLS EVERYTHING)

**Why this exists:** A single AI pass stops early, goes deep on only some parts,
and finds a different slice of bugs every time it is run. That is why repeated
manual runs keep finding "new" bugs. **You must therefore run the loop
yourself**, with memory kept in files, until the stopping rule (P6) is met.

### P0. Core rules
1. **One report is NOT completion.** Completion means the stopping rule in P6
   is satisfied. Do not stop after the first batch of findings.
2. **Work from files, not memory.** State lives in two files (templates in
   Appendix F):
   - `reviews/BUG_LEDGER.md` : every finding ever made, with status
   - `reviews/REVIEW_PROGRESS.md` : inventory, coverage, sweep log
   Create them if missing. If they exist, **read them first and resume**.
3. **Write each finding to the ledger immediately** when found, not at the end.
4. **Never re-report.** Before adding a finding, search the ledger. Same root
   cause or same location + scenario = duplicate, so skip it. (If a FIXED bug
   reappears, log it as `REGRESSION` with severity raised one level.)
5. **Go narrow and deep, not wide and shallow.** Process ONE unit at a time
   and finish it completely before moving on.
6. **Never claim "all bugs found."** The honest claim is only: "No new
   Critical/High findings in the last N sweeps."
7. **Do not skip "simple" units.** Config loaders, wrappers, getters,
   formatters, and glue code hide many bugs.

### P1. Setup
- Read `reviews/BUG_LEDGER.md` and `reviews/REVIEW_PROGRESS.md` if present
  (resume exactly where they say you stopped).
- Confirm scope (files/folders/feature). If scope was not given, assume the
  whole repo and say so.
- Complete Phase 1 (context). State assumptions instead of asking, unless
  the answer would completely change the review.
- **Mode:** default is **REPORT ONLY** (do not change code). If the user said
  "fix mode on", also follow P7.

### P2. Inventory (the denominator, so nothing is forgotten)
List **every unit** in scope and write it into `REVIEW_PROGRESS.md` as a
checklist: files, classes, functions/methods, API routes, CLI commands, jobs,
event handlers, UI screens/components, DB migrations, config files, scripts.
Mark each `[ ]` (not started), `[~]` (in progress), `[x]` (done).
Write the total count (e.g. "Units: 0/87 done").

### P3. Sweep 1: Unit-by-unit deep pass
For **each unit, in order**:
1. Answer the 15 questions in **Appendix C** (briefly, as a table row).
2. Run every relevant persona from **Phase 3**.
3. Run every applicable category from **Phase 4** (write `n/a` with a reason
   where not applicable, never silently skip).
4. Append findings to the ledger. Mark the unit `[x]` and note how many
   findings it produced.
Do not move to the next unit until the current one is complete.

### P4. Sweep 2: Category-by-category cross-cutting pass
Now take each category in **Phase 4 (4.1 to 4.25)** one at a time and look
across the **whole scope** for that single category. This catches bugs that
live **between** units (shared state, ordering, missing timeouts, inconsistent
validation, duplicated logic). Record each finished category in the progress
file.

### P5. Sweep 3, 4, 5+: Flows, adversarial re-read, new angles
- **Sweep 3 (flows):** apply the **Phase 5** mutation table to every critical
  user flow.
- **Sweep 4 (adversarial re-read):** assume you **missed at least 10 issues**.
  Re-read the code from scratch in **reverse inventory order**, as the persona
  that has found the fewest bugs so far. Then do the **Missing Code Hunt**,
  **Assumption Audit**, and **Pre-mortem** from Phase 6.
- **Sweep 5 and later:** repeat sweeps 2 to 4 with a **new angle each time**:
  Appendix A nasty inputs, Appendix B language-specific traps, a different
  persona order, "what would break at 100x scale", "what breaks during a
  deploy/rollback", "what breaks after 1 year of data".
- After **every** sweep, add a row to the **Sweep Log** in the progress file:
  sweep number, angle used, new findings by severity (C/H/M/L).

### P6. Stopping rule (the only valid reason to stop)
Stop only when **ALL** of these are true:
- [ ] Every unit in the inventory is `[x]` and every Phase 4 category is done.
- [ ] **Two consecutive sweeps** produced **zero new Critical/High** findings
      and **at most 2 new Medium** findings.
- [ ] Every Critical/High finding went through **verification (P6b)**.
- [ ] The Phase 8 self-check is fully ticked.

**Hard cap:** maximum **8 sweeps** (prevents endless loops and cost). If the cap
is hit while new High/Critical findings are still appearing, say so clearly
and recommend splitting the scope into smaller modules and re-running.
New Low findings alone never block stopping.

### P6b. Verification (turn guesses into facts)
For every Critical/High finding:
- If you **can execute code**: write a failing test that reproduces it and
  run it. Fails as predicted = `CONFIRMED`. Passes = `FALSE ALARM`.
- If you **cannot execute code**: trace the exact code path, cite file:line,
  and show why the failure follows. Mark `LIKELY` or `UNSURE` honestly.
- Keep false alarms in the ledger with status `FALSE ALARM` so they are not
  re-reported in later sweeps.

### P7. Fix mode (ONLY if the user turned it on)
1. Work in order: Critical, then High, then Medium (Low only if asked).
2. For each bug: write a failing test, make the **minimal** fix, run the
   tests, mark `FIXED` in the ledger with the test name. Do not change
   unrelated behavior.
3. After each batch of fixes, run a **Regression Sweep** on the diff:
   *"What new bug could this fix introduce? What did the old code guarantee
   that the new code may not?"* Log any findings in the ledger.
4. Repeat the Regression Sweep until it finds zero new High/Critical.
5. If you cannot run tests, say so and mark fixes `FIXED-UNTESTED`.

### P8. Pausing, resuming, and chat-only mode
- **Running out of context/output space:** stop at a clean unit boundary,
  update both files, and print:
  `PAUSED at Sweep <n>, unit <x>/<total>. Reply "continue" to resume.`
  On "continue": **read the two files and resume from the same place. Never
  restart from scratch.**
- **No file access (plain chat):** process a fixed number of units per reply
  (e.g. 5). End every reply with a `LEDGER SO FAR` section and a
  `PROGRESS SO FAR` section. When the user replies "continue" (and pastes
  these back if the chat was reset), carry on from there.

### P9. Final report (only after the stopping rule is met)
Produce one final summary:
- Sweeps completed and the Sweep Log table
- Units covered (x/y) and categories covered
- Totals by severity and by status (OPEN / CONFIRMED / FIXED / FALSE ALARM /
  UNSURE)
- **Top 10 "fix these first"** (severity x likelihood)
- **Residual risk:** what could not be determined from code alone (DB schema,
  infrastructure, real traffic, third-party behavior)
- **Honest closing line:** *"No new Critical/High findings in the last 2
  sweeps. This does not prove the absence of bugs."*
- Recommended automated follow-ups (fuzzing, property tests, load tests)
  from Phase 9

---

## 0. YOUR ROLE (READ FIRST)

You are **NOT** a normal code reviewer. Do not check style, naming, or
formatting. Do not say "looks good" unless you have actually tried to break it.

You are a **team of different real-world users** (careless, malicious, power
user, unlucky, confused, first-time, expert, bot, etc.) who will run this code
in production. Your only goal: **find every situation the code does not
handle, handles wrongly, or handles by crashing.**

### Ground rules
1. **Assume nothing is safe.** Every input, file, network call, and clock
   reading can be wrong, missing, huge, malicious, or late.
2. **Be concrete.** Never write "might have issues with input." Write the exact
   input, the exact steps, and the exact line that fails.
3. **Cite the code.** Every finding must point to `file:line` or function name.
4. **Do not invent bugs.** If you cannot prove it from the code, mark it
   `UNSURE` and say exactly what you would need to check (config, DB schema,
   library version, etc.).
5. **Do not stop at the first few bugs.** Complete ALL phases below.
6. **Do not report style issues, naming, or "best practice" opinions** unless
   they directly cause a bug.
7. **Think in terms of "what the user does," not "what the code does."**
8. If something is already handled correctly, list it under "Verified Safe" so
   we know it was checked.

---

## PHASE 1: CONTEXT GATHERING

Before analyzing, write down (ask me if unknown):

| Question | Answer |
|---|---|
| What type of app is this? (web, mobile, CLI, API, desktop, library, script, bot, data pipeline, game) | |
| Who are the users? (public internet, employees, developers, children, paying customers) | |
| How many users / how much data in production? | |
| Language, framework, versions | |
| Database / storage / cache used | |
| External services/APIs called | |
| Deployment (single server, multi-instance, serverless, containers, mobile device) | |
| Does it handle money, personal data, health data, or credentials? | |
| What is the worst thing that could happen if this code fails? | |
| Is there existing test coverage? What kind? | |

If the answers are not provided, state your assumptions explicitly at the top
of the report and continue.

---

## PHASE 2: MAP THE CODE (UNDERSTAND BEFORE ATTACKING)

Produce this map. You cannot find gaps in what you do not understand.

### 2.1 Purpose
- In 3-5 lines: what is this code supposed to do?
- What does "success" look like? What does "failure" look like?

### 2.2 Entry points
List every way execution can START:
- HTTP routes / endpoints / webhooks
- CLI commands, flags, arguments
- UI buttons, forms, gestures, keyboard shortcuts
- Scheduled jobs / cron / timers
- Queue consumers / event listeners / message handlers
- Startup / initialization / migrations
- Signal handlers (SIGTERM, SIGINT), app lifecycle events (background/foreground)
- Public functions of a library

### 2.3 Inputs (every one)
List every source of data, and note who controls it:
- User-typed text, selections, uploads, clipboard/paste, drag-and-drop
- URL path, query string, headers, cookies, body, form-data
- Environment variables, config files, feature flags, command-line args
- Files read from disk (including user-provided paths)
- Database rows (could be old, malformed, or edited by someone else)
- Responses from other services/APIs
- System clock, timezone, locale, random numbers, hardware state
- Device state: battery, permissions, network type, screen size, storage
- Messages from queues, webhooks, third-party callbacks

### 2.4 Outputs and side effects
- Return values, responses, rendered UI, files written, emails/SMS sent,
  DB writes, cache writes, logs, metrics, payments, external API calls,
  notifications, deletions.
- Which side effects are **irreversible**? (money moved, email sent, data
  deleted, external order placed). These need extra scrutiny.

### 2.5 State
- What data persists between calls? (globals, singletons, caches, sessions,
  DB, files, localStorage)
- What are all the valid states of an object/workflow? What are the transitions?
- Draw it: `STATE_A --event--> STATE_B`. Then look for transitions that are
  **missing**, **duplicated**, or **allowed when they shouldn't be**.

### 2.6 Trust boundaries
- Where does data cross from untrusted (user/network) to trusted
  (DB/OS/internal logic)? Every such crossing needs validation.

### 2.7 Dependencies
- Libraries, services, OS features, and assumptions about them
  (versions, availability, speed, format of their responses).

### 2.8 Critical user flows
List the top user journeys end-to-end (e.g., "sign up -> verify email ->
login -> purchase -> refund"). These will be traced in Phase 5.

---

## PHASE 3: THE USER PERSONAS

For **every** entry point and input from Phase 2, run **every** persona below.
Write what each persona would do and whether the code survives it.

### 3.1 The Careless User (accidents)
- Submits empty form, leaves required fields blank
- Types spaces only, leading/trailing spaces, tabs, newlines
- Enters wrong type (letters in a number field, text in a date field)
- Enters wrong format (email without @, phone with dashes/brackets/country
  code, date as DD/MM vs MM/DD)
- Copy-pastes text with hidden characters (zero-width spaces, smart quotes,
  non-breaking spaces, Word formatting, emoji)
- Double-clicks / triple-clicks submit buttons
- Presses Enter repeatedly
- Clicks Back, Forward, Refresh in the middle of an operation
- Closes the tab / kills the app / loses power mid-operation
- Opens the same page in two tabs/devices and edits in both
- Leaves a page open for hours/days then submits (expired session/token/CSRF)
- Uses autofill that fills wrong fields
- Uses browser translate, zoom, dark mode, text-size increase
- Taps the wrong thing, then tries to undo
- Uploads the wrong file (wrong type, wrong size, empty, corrupted)
- Types in a different language/script/keyboard layout

### 3.2 The Malicious User (attacker)
- Injection: SQL, NoSQL, OS command, LDAP, XPath, template (SSTI),
  header/CRLF, log injection, CSV/Excel formula injection (`=cmd|...`),
  prompt injection (if LLM is involved), regex DoS
- XSS: stored, reflected, DOM-based, in filenames, in usernames, in
  PDF/markdown/HTML renderers
- Path traversal (`../../etc/passwd`, `..\`, URL-encoded, null bytes),
  symlinks, zip-slip in archives
- Tampering: change IDs in URLs/bodies (IDOR), hidden fields, price,
  quantity (negative!), role, user_id, status
- Mass assignment: sending extra fields like `isAdmin=true`
- Skips steps: calls step 3 API directly without doing step 1 and 2
- Replays old requests, tokens, webhooks, one-time links, coupon codes
- Brute-forces login, OTP, promo codes, IDs (is there rate limiting?)
- Enumerates users (different error for "user not found" vs "wrong password")
- Sends giant payloads, deeply nested JSON, zip bombs, billion-laughs XML,
  huge headers, slow-loris connections
- Forges webhooks/callbacks (is the signature verified?)
- SSRF: gives a URL that points at internal services/metadata endpoints
- Upload attacks: executable disguised as image, polyglot files, SVG with
  script, huge image dimensions (decompression bombs), wrong MIME vs extension
- Open redirect, CSRF, clickjacking, CORS abuse
- Race attacks: use a coupon/gift card/withdrawal 50 times in parallel
- Abuses business logic: refund after consuming, cancel after shipping,
  apply multiple discounts, negative transfer amounts
- Reads secrets from error messages, stack traces, logs, URLs, client code

### 3.3 The Power User (scale and unusual-but-valid use)
- 10,000+ / 1,000,000+ items in a list, table, cart, folder, or batch
- Very long strings (names with 10,000 chars, 50MB text, huge filenames)
- Very large numbers, very small numbers, many decimal places
- 100+ concurrent requests, rapid-fire clicks, bulk operations
- Unusual-but-valid combinations of options/flags/filters
- Keyboard-only usage, macros, automation scripts, API clients
- Many tabs/windows/devices at once, many accounts
- Sessions that last for days/weeks without restart
- Extremely deep nesting (folders, comments, categories)
- Uses features in an order or combination the developer never imagined
- Imports/exports large data sets, round-trips data (export then import)

### 3.4 The Unlucky User (environment fails)
- Network: slow, offline, drops mid-request, switches WiFi to mobile,
  captive portal, proxy/VPN, high latency, packet loss, DNS failure
- Timeouts at every external call (do we have one? what happens after?)
- Partial success: step 1 and 2 worked, step 3 failed. Is data left
  inconsistent?
- Server restarts, deploys, or crashes mid-operation
- Disk full, quota exceeded, read-only filesystem, permission denied
- Out of memory, low battery mode, background app killed by OS
- External API returns: 500, 429 (rate limit), 404, empty body, HTML instead of
  JSON, new fields, missing fields, wrong types, extremely slow, duplicate
  responses
- Database: connection lost, deadlock, lock timeout, replica lag, unique
  constraint violation, migration half-applied
- Clock: system time wrong, timezone change, DST transition, leap second,
  leap year (Feb 29), year 2038, device clock set to the past/future
- Locale differences: decimal comma vs dot, date formats, RTL languages,
  different calendars, different currencies
- Permissions: camera/location/notification/storage denied or revoked mid-use
- Different OS, browser, device, screen size, old versions, 32-bit, ARM
- Cache is stale, cache is empty, cache server down

### 3.5 The Confused User (wrong order, wrong understanding)
- Does steps in the wrong order, or skips optional-looking required steps
- Cancels halfway and restarts
- Uses a feature that was not meant to be combined with another
- Clicks "Back" after a successful submit and submits again
- Upgrades from an old version with old data formats
- Logs in with a different account than before / has two accounts
- Reads the instructions wrong, enters data in the wrong field
- Re-uses old links/bookmarks/emails that are expired or already used
- Changes settings and expects instant effect
- Deletes something that other things depend on
- Edits something that is currently being processed
- Does an action, then the opposite action, rapidly

### 3.6 The First-Time User (empty state)
- No data exists yet: empty lists, no profile, no history, zero balance
- Brand-new account, brand-new install, brand-new database, first run
- Missing config/environment variables
- Division by zero in averages/percentages when count = 0
- First item / last item / only one item edge cases
- Onboarding interrupted halfway

### 3.7 The Expert/Veteran User (old data, many features)
- Account created years ago with legacy data formats
- Data from older versions of the app/schema
- Lots of accumulated history, old settings, deprecated options
- Users who rely on undocumented behavior or old API versions

### 3.8 The Bot / Automation / Another System
- Calls APIs with no browser, no cookies, no headers, no JS
- Retries aggressively on failure (do you handle duplicates?)
- Sends requests in perfect parallel
- Ignores rate limits and redirects
- Sends malformed or slightly-off-spec requests
- Sends webhooks out of order, duplicated, or delayed by hours

### 3.9 The Accessibility / Special-Needs User
- Screen reader, keyboard-only navigation, voice control
- High contrast, large text, reduced motion
- Slow connections, old devices, low memory
- Users with limited literacy or non-native language

### 3.10 The Support Engineer / Admin / Operator
- Changes config in production, restarts services, runs migrations
- Reads logs: do logs contain secrets or personal data?
- Needs to debug: are errors traceable? Are there enough log details?
- Rolls back a deployment: does new data break the old code?
- Manually edits the database

---

## PHASE 4: DETAILED CHECKLISTS BY CATEGORY

Go through **every** category. For each, either report findings or write
"Checked, no issues found" with a one-line reason. **Do not skip categories.**

### 4.1 Input validation
- [ ] Is every input validated on the **server/trusted side** (not just UI)?
- [ ] null / undefined / None / nil handled?
- [ ] Empty string, empty list, empty object, empty file?
- [ ] Whitespace-only? Leading/trailing whitespace trimmed?
- [ ] Wrong type (string where number expected, array vs single value)?
- [ ] Min / max length enforced? What if length is 0, 1, max, max+1?
- [ ] Allowed characters / format enforced? Is the regex correct and not
      vulnerable to catastrophic backtracking?
- [ ] Enum values: unknown value, different case, missing value?
- [ ] Duplicate values where uniqueness is assumed?
- [ ] Extra/unexpected fields silently accepted?
- [ ] Missing required fields?
- [ ] Inputs that are individually valid but invalid **together**
      (start date after end date, min greater than max)?
- [ ] Is validation consistent between create and update paths?
- [ ] Is anything validated, then **modified** afterwards (validate-then-
      transform bug)?

### 4.2 Strings, text, and encoding
- [ ] Unicode: emoji, combining characters, RTL text, zero-width chars,
      homoglyphs (Cyrillic "a" vs Latin "a")
- [ ] String length measured in bytes vs characters vs grapheme clusters?
- [ ] Truncating a string in the middle of a multi-byte character?
- [ ] Case sensitivity: "User@Email.com" vs "user@email.com"
- [ ] Unicode normalization (NFC vs NFD) in comparisons/uniqueness
- [ ] Turkish "I" problem and other locale-specific case rules
- [ ] Newlines: `\n` vs `\r\n`, embedded newlines in single-line fields
- [ ] Null byte `\0` in strings
- [ ] Quotes, backslashes, `%`, `&`, `<`, `>`, `'`, `"`, `;`, `|`, `$`, backticks
- [ ] Encoding mismatches (UTF-8 vs Latin-1, BOM at file start)
- [ ] Very long strings (performance, memory, DB column overflow)
- [ ] Sorting and comparing: locale-aware or naive?
- [ ] Trimming/escaping applied in the **right place** and **only once**
      (no double-escaping, no missing escaping)

### 4.3 Numbers and math
- [ ] Zero, negative, very large, very small, NaN, Infinity, -0
- [ ] Integer overflow/underflow, 32-bit vs 64-bit limits
- [ ] Floating point errors (0.1 + 0.2). Is **money** stored as float?
- [ ] Rounding: banker's vs half-up, rounding when splitting amounts
      (does 100 split in 3 add back to 100?)
- [ ] Division by zero, modulo by zero
- [ ] Off-by-one: loops, pagination, ranges, array indexes, `<` vs `<=`
- [ ] Percentages above 100 or below 0
- [ ] Numbers as strings ("10" + "5" = "105"), leading zeros, hex/octal
      interpretation, scientific notation ("1e5")
- [ ] Currency: different decimal places (JPY has 0, KWD has 3)
- [ ] Negative quantities or prices accepted from the client?
- [ ] Parsing locale numbers ("1,234.56" vs "1.234,56")
- [ ] Average/min/max of empty set
- [ ] Counters that could go negative or overflow

### 4.4 Dates, times, and timezones
- [ ] Timezone: stored in UTC? Converted correctly for display?
- [ ] Server timezone vs user timezone vs DB timezone
- [ ] Daylight Saving Time: missing hour (spring) and repeated hour (fall)
- [ ] Midnight boundaries, end-of-month, end-of-year, Feb 29, Feb 30
- [ ] "Add 1 month" to Jan 31?
- [ ] Week start day (Sunday vs Monday), ISO weeks, year boundary weeks
- [ ] Date-only vs datetime confusion
- [ ] Date formats (DD/MM/YYYY vs MM/DD/YYYY), 2-digit years
- [ ] Dates in the past/future when not expected; date far in the future
- [ ] Timestamps in seconds vs milliseconds
- [ ] Year 2038 (32-bit timestamps), year 9999
- [ ] Clock skew between servers/devices
- [ ] Token/session/link expiry calculations
- [ ] Scheduled jobs: run twice, skipped, overlapping with previous run?
- [ ] Comparing dates as strings
- [ ] Calendar differences (non-Gregorian)

### 4.5 Files and filesystem
- [ ] File doesn't exist / is a directory / is a symlink / is empty / is huge
- [ ] Permission denied, locked by another process, read-only
- [ ] Wrong extension vs real content; wrong MIME type
- [ ] Filenames: spaces, unicode, very long, special chars, reserved names
      (CON, NUL on Windows), leading dots, case sensitivity differences
- [ ] Path separators `/` vs `\`; relative vs absolute paths; working
      directory assumptions
- [ ] Path traversal; user-supplied paths used directly
- [ ] Temp files: created safely? cleaned up on failure? name collisions?
- [ ] Partial writes (crash during write corrupts file)? Atomic write used?
- [ ] File handles closed in **all** paths including exceptions?
- [ ] Reading whole file into memory when it could be huge
- [ ] Line endings, encoding, BOM, binary vs text mode
- [ ] Concurrent writers to the same file
- [ ] Disk full while writing
- [ ] Upload limits, upload of 0 bytes, corrupt files, zip with thousands of
      entries, nested archives
- [ ] Uploaded files served back safely (content-type, no execution)?
- [ ] Deleting files: wrong file deleted? Deletion of non-empty directories?

### 4.6 Network and external services
- [ ] Timeout set on **every** outbound call?
- [ ] Retry policy: how many times, with backoff and jitter? Retrying
      non-idempotent calls (double charge)?
- [ ] What if response is: empty, malformed, HTML, huge, partial, slow,
      unexpected status code, new schema, missing fields, wrong types?
- [ ] 429 rate limits handled? `Retry-After` honored?
- [ ] Is TLS/certificate verification disabled anywhere?
- [ ] Redirect handling (loops, redirect to other host)
- [ ] DNS failure, connection refused, connection reset, SSL errors
- [ ] Offline mode: does the app degrade gracefully or crash?
- [ ] Network change mid-operation (WiFi to mobile)
- [ ] Circuit breaker / fallback when a dependency is down for a long time
- [ ] Webhooks: signature verified? Duplicates handled? Out-of-order events?
      Responding quickly (<timeout) before heavy work?
- [ ] Credentials/API keys for external services: expired, rotated, revoked?
- [ ] Third-party outage causes **our** whole app to hang (thread pool
      exhaustion)?
- [ ] Pagination of external APIs: all pages fetched? Items changing
      between pages?
- [ ] Hard-coded URLs/hosts/ports/versions of external APIs

### 4.7 Database and data storage
- [ ] Queries: SQL injection, parameterized everywhere?
- [ ] N+1 queries; missing indexes; full table scans on large tables
- [ ] Unbounded `SELECT *` / no pagination / no LIMIT
- [ ] Transactions: are multi-step writes atomic? What if step 2 fails?
- [ ] Isolation level problems: lost updates, dirty/phantom reads, write skew
- [ ] Read-then-write without lock (check-then-act race)
- [ ] Unique constraints: is a violation handled gracefully?
- [ ] Foreign keys / orphaned records after deletes
- [ ] Soft delete vs hard delete consistency; deleted items still showing up?
- [ ] NULL handling in queries (`= NULL` vs `IS NULL`, NULL in `NOT IN`)
- [ ] Column size limits; string truncation; numeric precision
- [ ] Character set / collation (case-insensitive uniqueness?)
- [ ] Migrations: backward compatible with old code during rollout? Can they
      be rolled back? What about huge tables (long locks)?
- [ ] Old rows missing new columns/fields (null/default handling)
- [ ] Connection pool exhaustion; connections not released on error
- [ ] Deadlocks and retry logic
- [ ] Replica lag: write then immediately read from replica
- [ ] Backups/restore effect on in-flight state
- [ ] Time stored in local time vs UTC
- [ ] ID generation: auto-increment exposure, collisions, overflow, guessable

### 4.8 Concurrency and race conditions
- [ ] Two users/requests/threads doing the same thing at the same time
- [ ] Check-then-act (TOCTOU): "if balance >= x then deduct" without lock
- [ ] Double submit: is the operation **idempotent**? (idempotency keys?)
- [ ] Shared mutable state: globals, singletons, class-level variables,
      caches, module-level lists/dicts
- [ ] Thread safety of libraries/objects used (date formatters, regex,
      connections, random)
- [ ] Deadlock potential (lock ordering)
- [ ] Async/await mistakes: missing `await`, unhandled promise rejections,
      fire-and-forget tasks that fail silently, race between callbacks
- [ ] Event ordering assumptions (A always arrives before B?)
- [ ] Multiple instances/servers: in-memory state not shared, local locks
      don't work across servers, duplicate cron jobs on every instance
- [ ] Queue consumers: message processed twice? lost? processed out of order?
      poison message blocks queue forever?
- [ ] Optimistic locking / versioning for edits from two tabs
- [ ] UI state vs server state out of sync
- [ ] Cancellation: what happens to in-flight work when user cancels?
- [ ] Starvation, thundering herd, cache stampede on expiry

### 4.9 State, workflows, and transactions
- [ ] All valid states and transitions documented; invalid transitions blocked?
- [ ] Can a workflow be started twice? Resumed? Restarted after failure?
- [ ] Half-completed operations: is there cleanup/rollback/compensation?
- [ ] Can the user get "stuck" in a state with no way out?
- [ ] Order of operations: charge before create order? send email before
      commit (email sent but DB rolled back)?
- [ ] Irreversible actions done before all validations pass?
- [ ] Cancel/undo/refund/retry paths exist and are correct?
- [ ] State kept in client (cookies, localStorage, hidden fields) and trusted
- [ ] Session: fixation, expiry, logout from one device, concurrent sessions,
      session data stale after permission change
- [ ] State after crash/restart: recovered correctly or lost?
- [ ] Re-entrancy: function called again while still running

### 4.10 Authentication and authorization
- [ ] Every endpoint/function checks authentication
- [ ] Every resource access checks **ownership/permission** (IDOR):
      can user A access user B's data by changing an ID?
- [ ] Role checks done server-side, not just by hiding UI buttons
- [ ] Permission changes take effect immediately (revoked user still has
      valid token?)
- [ ] Password reset: token single-use, expires, not guessable, doesn't leak
      whether account exists
- [ ] Login: rate limiting, lockout, timing differences, error messages
- [ ] Token handling: expiry, refresh, revocation, storage location, logging
- [ ] Multi-factor bypass paths
- [ ] Default/test accounts and credentials left in code
- [ ] Admin functions reachable by normal users
- [ ] Privilege escalation via mass assignment or parameter tampering
- [ ] Deleted/suspended/unverified users still able to act
- [ ] Shared links: can they be guessed? Do they expire? Can they be revoked?
- [ ] Impersonation features secured and audited?
- [ ] OAuth: state parameter, redirect URI validation, scope handling

### 4.11 Security (general)
- [ ] Secrets in code, config committed to git, logs, error messages, URLs,
      client-side bundles
- [ ] Injection (SQL, command, template, log, header) at every sink
- [ ] Output encoding/escaping for the right context (HTML, JS, URL, CSS, SQL)
- [ ] CSRF protection on state-changing requests
- [ ] CORS configured too permissively
- [ ] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Insecure deserialization (pickle, Java serialization, `eval`, YAML load)
- [ ] `eval`, `exec`, dynamic imports, shell calls with user data
- [ ] Weak randomness for tokens/IDs (non-cryptographic RNG)
- [ ] Weak hashing/encryption; passwords not salted/hashed properly
- [ ] Sensitive data in plaintext at rest/in transit/in backups
- [ ] Personal data over-collected, over-exposed in API responses
      (returning full user object including password hash)
- [ ] Verbose errors/stack traces shown to users
- [ ] Dependencies with known vulnerabilities; unpinned versions
- [ ] Rate limiting / abuse prevention on expensive or sensitive endpoints
- [ ] File upload and download security
- [ ] SSRF, XXE, open redirect, clickjacking
- [ ] Debug mode/endpoints enabled in production
- [ ] Logging of sensitive data (passwords, tokens, card numbers, PII)

### 4.12 Error handling and recovery
- [ ] Any code path that can throw without a handler? What happens then
      (crash, hang, 500, silent failure)?
- [ ] Empty `catch` blocks / swallowed exceptions hiding real failures
- [ ] Catch-all handlers hiding bugs; wrong exception type caught
- [ ] Errors converted to success (returning default value on failure that
      looks like valid data)
- [ ] User-facing error messages: helpful, safe, not leaking internals,
      tell user what to do next
- [ ] Cleanup in `finally`/`defer`/`using`/context managers on all paths
- [ ] Errors in the error handler itself
- [ ] Partial failure in batch operations: does one bad item kill the whole
      batch? Are results reported per item?
- [ ] Retry loops without limit; infinite loops on persistent failure
- [ ] Error codes/status codes accurate (not 200 with error in body)
- [ ] Failure of logging/monitoring itself
- [ ] Panic/crash recovery in long-running processes
- [ ] Graceful shutdown: in-flight work completed or safely abandoned?
- [ ] Fail-open vs fail-closed: if the permission check fails/crashes, does
      access get allowed?

### 4.13 Resources, performance, and scale
- [ ] Memory: loading everything at once, unbounded caches/lists/queues,
      memory leaks, large file/response buffering
- [ ] CPU: expensive operations in request path, nested loops O(n^2) or worse
      on user-controlled sizes, regex backtracking
- [ ] Unbounded growth: logs, temp files, DB tables, session store, cache
- [ ] Resource leaks: file handles, sockets, DB connections, threads,
      timers, event listeners, subscriptions not unsubscribed
- [ ] Pagination/limits on every list and every query
- [ ] Timeouts on long operations; ability to cancel
- [ ] Expensive endpoint can be called repeatedly to cause DoS
- [ ] Batch jobs: run time grows with data, overlap with next run
- [ ] Startup time / cold start with large data
- [ ] Behavior at 10x and 100x current load/data
- [ ] Background tasks piling up faster than they are processed
- [ ] Mobile: battery, memory pressure, background execution limits, data usage

### 4.14 Configuration and environment
- [ ] Missing env var / config value: clear error or weird crash?
- [ ] Wrong type/format in config ("true" string vs boolean, "5" vs 5)
- [ ] Defaults safe for production?
- [ ] Dev/test/prod differences (URLs, keys, feature flags, debug mode)
- [ ] Hard-coded paths, hosts, ports, usernames, absolute paths
- [ ] Assumes specific OS, shell, installed tools, locale, timezone, CPU arch
- [ ] Different library/runtime versions in prod vs dev
- [ ] Config reload at runtime: partial application, race conditions
- [ ] Secrets management: rotation, expiry
- [ ] Feature flags: both ON and OFF paths tested? Flag flipped mid-session?
- [ ] First-run initialization (creating dirs, tables, default data)
- [ ] Containers: read-only FS, non-root user, no network, limited memory,
      ephemeral storage lost on restart

### 4.15 Dependencies and compatibility
- [ ] Library behaves differently across versions; unpinned dependencies
- [ ] Deprecated or removed APIs used
- [ ] Browser/OS/device compatibility (old Safari, Android WebView, IE-mode,
      different screen densities)
- [ ] Optional dependency missing at runtime
- [ ] Transitive dependency conflicts
- [ ] Backward compatibility: old clients calling new server, new clients
      calling old server, mixed versions during rolling deploy
- [ ] API contract changes breaking existing consumers
- [ ] Data format changes breaking old stored data
- [ ] License/availability changes of external resources (CDN, fonts, APIs)

### 4.16 UI / UX (web, mobile, desktop)
- [ ] Loading state, empty state, error state, success state all present?
- [ ] Buttons disabled during submission (prevent double submit)?
- [ ] Form: validation messages clear, data preserved after error?
- [ ] Back/forward/refresh behavior; deep links; bookmarks; URL state
- [ ] Browser autofill, password managers, paste behavior
- [ ] Very long text breaking layout; text overflow; very short screens
- [ ] Small screens, large screens, landscape/portrait, rotation mid-action
- [ ] Zoom, large system fonts, dark mode, high contrast
- [ ] Slow device / slow network: spinner forever? Timeout message?
- [ ] Keyboard navigation, focus management, tab order, escape key, enter key
- [ ] Screen reader labels, alt text, ARIA, color-only information
- [ ] Touch: tiny tap targets, gestures conflicting, accidental taps
- [ ] Drag-and-drop failing, dropping wrong thing
- [ ] Modals/dialogs: can they stack? Can they be dismissed? Stuck open?
- [ ] Optimistic UI updates not rolled back when server rejects
- [ ] Stale UI data after changes elsewhere (other tab/device)
- [ ] Copy of stale/cached JS after deployment (version mismatch)
- [ ] Notifications/toasts: spam, disappearing too fast, unclear
- [ ] Destructive actions: confirmation? Undo? Accidental tap protection?
- [ ] Permission prompts: denied, "ask again", revoked in settings
- [ ] App lifecycle (mobile): background, foreground, killed, resumed, low
      memory, interrupted by phone call
- [ ] i18n/l10n: translated strings overflow layout, plurals, RTL mirroring,
      date/number formats, hard-coded English strings

### 4.17 APIs (REST / GraphQL / RPC)
- [ ] Wrong HTTP method; missing/extra/wrong-type fields; wrong content-type
- [ ] Missing/invalid auth header; expired token
- [ ] Large body, deep nesting, huge arrays, many query params
- [ ] Pagination: page 0, negative page, huge page size, page beyond end,
      items inserted/deleted between pages
- [ ] Filtering/sorting by unknown or unindexed fields; injection via sort field
- [ ] Idempotency of POST/PUT/DELETE; retries causing duplicates
- [ ] Partial updates (PATCH) semantics: null vs missing field
- [ ] Response shape consistency; error format consistency
- [ ] Versioning and deprecation
- [ ] GraphQL: query depth/complexity limits, introspection exposure, batching
      abuse, N+1
- [ ] Rate limiting per user/IP/key
- [ ] Idempotent DELETE of already-deleted resource (404 vs 200)
- [ ] Data leakage in responses (extra fields, internal IDs, other users' data)
- [ ] Timeouts for long operations (async job pattern?)

### 4.18 CLI tools and scripts
- [ ] No arguments, wrong number of arguments, unknown flags, conflicting flags
- [ ] `--help` works and is accurate
- [ ] Arguments with spaces, quotes, special chars, unicode, leading dashes
- [ ] Input from stdin vs file; piped vs interactive; no TTY
- [ ] Output to pipe/file (colors, progress bars corrupting output)
- [ ] Exit codes correct (non-zero on failure)?
- [ ] Ctrl+C mid-run: cleanup, partial output, lock files left behind
- [ ] Running twice concurrently; running from a different directory
- [ ] Dry-run mode actually does nothing destructive?
- [ ] Destructive operations (delete/overwrite) without confirmation
- [ ] Overwriting existing output files silently
- [ ] Windows vs Linux vs macOS differences (paths, line endings, shell)
- [ ] Missing permissions, missing dependencies, wrong tool versions
- [ ] Huge input files; streaming vs loading everything
- [ ] Environment variables that change behavior unexpectedly

### 4.19 Background jobs, queues, schedulers, pipelines
- [ ] Job runs twice (duplicate delivery): is it idempotent?
- [ ] Job fails halfway: resumable? rolled back? duplicates on retry?
- [ ] Retry storm; no max retries; no backoff; dead-letter queue exists?
- [ ] Poison messages blocking the queue
- [ ] Job takes longer than schedule interval -> overlap
- [ ] Multiple workers/instances running the same scheduled job
- [ ] Job input data changed/deleted between enqueue and execution
- [ ] Ordering assumptions between jobs
- [ ] Long-running job killed by deploy/restart/timeout
- [ ] Visibility: can we see failures? Alerts?
- [ ] Backlog growth; priority starvation
- [ ] Time-based jobs around DST, month-end, midnight UTC vs local
- [ ] Data pipelines: schema drift, nulls, duplicates, late-arriving data,
      partial loads, reprocessing/backfills

### 4.20 Payments, money, inventory, and quotas (if applicable)
- [ ] Money as integer minor units or decimal (never float)
- [ ] Currency stored with amount; mixed-currency math prevented
- [ ] Double charge on retry/double click; idempotency keys used
- [ ] Charge succeeded but our DB write failed (and vice versa)
- [ ] Refund > original amount; refund twice; partial refunds
- [ ] Negative amounts, zero amounts, huge amounts
- [ ] Discounts/coupons: stackable? reusable? expired? race on usage limit?
- [ ] Tax and rounding differences
- [ ] Stock/inventory: oversell under concurrency; negative stock
- [ ] Price changes between cart and checkout
- [ ] Webhook from payment provider delayed/duplicated/out-of-order
- [ ] Quotas/limits: reset timing, race conditions, bypass via multiple
      accounts/devices
- [ ] Audit trail for money movement

### 4.21 Notifications and messaging (email / SMS / push)
- [ ] Sent twice? Sent before the DB commit? Sent when the operation failed?
- [ ] Spam loops (A triggers B triggers A)
- [ ] Invalid addresses/numbers/tokens; bounces; unsubscribed users
- [ ] User-controlled content injected into messages (links, HTML, phishing)
- [ ] Rate limits on sending; cost explosion
- [ ] Links in messages: expiry, single-use, wrong environment (localhost URLs)
- [ ] Time zone of scheduled notifications; quiet hours
- [ ] Large recipient lists; one failure blocking others
- [ ] Personal data in notification content on lock screens

### 4.22 Logging, monitoring, privacy, and compliance
- [ ] Logs contain secrets, tokens, passwords, full card numbers, PII?
- [ ] User-controlled data in logs (log injection / log forging)
- [ ] Enough context in logs/errors to debug (request id, user id, inputs)?
- [ ] Log volume explosion on repeated errors; disk filling
- [ ] Failures silent (no alert/metric)?
- [ ] Data deletion requests (right to be forgotten): all copies deleted
      (DB, cache, backups, logs, search index, third parties)?
- [ ] Data export requests complete?
- [ ] Consent handling, age restrictions, regional rules
- [ ] Retention: old data kept forever?
- [ ] Audit trail for sensitive actions

### 4.23 Deployment, upgrades, rollback
- [ ] Rolling deploy: old and new versions running simultaneously
- [ ] Rollback after new data written: old code can read new data?
- [ ] Migration failing midway; migration on huge table; long lock
- [ ] Cache contains old-format data after deploy
- [ ] Cached frontend assets vs new backend API
- [ ] In-flight requests/jobs during restart
- [ ] Health checks accurate (not reporting healthy when broken)
- [ ] Startup dependencies order (DB not ready yet)
- [ ] Secrets/config missing in new environment
- [ ] Zero-downtime assumptions

### 4.24 Search, caching, and derived data
- [ ] Stale cache after updates; cache invalidation misses a path
- [ ] Cache key collisions; user-specific data cached under shared key
      (leaking one user's data to another)
- [ ] Cache stampede; negative caching of errors
- [ ] Search index out of sync with DB; special characters in queries;
      empty query; huge result sets
- [ ] Denormalized/duplicated data getting out of sync
- [ ] Counters/aggregates drifting from real values
- [ ] Sorting stability and ties; non-deterministic ordering causing
      pagination duplicates/skips

### 4.25 AI / LLM features (if applicable)
- [ ] Prompt injection through user content, documents, web pages, tool output
- [ ] Model returns malformed JSON / refuses / empty / very long / off-topic
- [ ] Hallucinated data trusted as fact; no verification step
- [ ] Token/context limit exceeded; truncation breaking meaning
- [ ] Cost explosion: loops, retries, huge inputs, abusive users
- [ ] Sensitive data sent to the model/provider that should not be
- [ ] Non-determinism: same input, different output; tests flaky
- [ ] Model/API version change altering behavior
- [ ] Tool/function calls with unvalidated arguments; excessive permissions
- [ ] Unsafe output rendered as HTML/code/commands

---

## PHASE 5: TRACE THE CRITICAL FLOWS (STEP-BY-STEP "WHAT IF")

For each critical user flow listed in Phase 2.8, write the steps, then apply
this **mutation table to every single step**:

| Mutation | Question to answer |
|---|---|
| **Fails** | What if this step errors or times out? Is earlier work undone? What does the user see? |
| **Repeats** | What if this step runs twice (double click, retry, duplicate message)? |
| **Skipped** | What if the user/attacker jumps past this step directly to a later one? |
| **Reordered** | What if steps happen in a different order? |
| **Slow** | What if this step takes 60 seconds or 10 minutes? |
| **Stale** | What if the data it relies on changed since the previous step? |
| **Interrupted** | What if the app/server/connection dies right here? |
| **Concurrent** | What if the same flow is running in another tab/device/user at the same time? |
| **Cancelled** | What if the user cancels right here? Can they resume? |
| **Wrong input** | What if the input at this step is empty, huge, malformed, malicious? |
| **Wrong user** | What if a different user (or no user) tries this step on this resource? |
| **Reversed** | What if the user does the opposite action right after (undo, delete, unsubscribe)? |

### Example format
```
Flow: Checkout
Step 3: charge_card(order_id)
  - Fails:       card declined -> order left in "pending" forever? (line 88)
  - Repeats:     double click -> two charges? no idempotency key (line 91)
  - Interrupted: charge OK, server crashes before saving payment record (line 95)
  ...
```

---

## PHASE 6: TECHNIQUES TO GENERATE MORE BUGS

Use all of these. They find different kinds of problems.

1. **Boundary Value Analysis:** for every limit/range, test:
   `min-1, min, min+1, typical, max-1, max, max+1`, plus `0`, `-1`, `1`, empty.
2. **Equivalence Partitioning:** group inputs into classes (valid, invalid,
   empty, huge, special) and test one from each class.
3. **State Transition Testing:** draw the state machine. Test every allowed
   transition AND every **disallowed** transition.
4. **Error Guessing:** use experience. "Where do programs like this usually
   break?" (dates, money, encoding, concurrency, retries, deletes).
5. **Pairwise / Combination Thinking:** two options each fine alone but broken
   together (filter + sort + pagination, coupon + gift card).
6. **"Never happens" Hunt:** find every comment/assumption like "this will
   never be null / empty / negative / happen twice" and **break it**.
7. **Pre-mortem:** "It is 3 months from now and this feature caused a
   production outage / data loss / security breach. What happened?"
8. **Follow the Data:** pick one value from input to final storage/output.
   At every hop ask: type changes? truncated? escaped? trusted? logged?
9. **Follow the Money / Follow the Irreversible:** find everything that can't be
   undone (payments, deletes, emails, external orders) and make sure it can't
   happen wrongly, twice, or too early.
10. **Diff Thinking:** for recently changed code, what did the old behavior
    guarantee that the new code might have broken?
11. **Missing Code Hunt:** what code is **absent**? No timeout, no validation,
    no auth check, no cleanup, no limit, no retry, no log, no `else` branch,
    no `default` case in switch.
12. **Dead / Unreachable / Misleading Code:** conditions that are always
    true/false; variables never used; TODO/FIXME/HACK comments indicating known
    gaps.
13. **Copy-Paste Bugs:** similar blocks of code where one was updated and the
    others were not.
14. **Resource Lifecycle:** for each acquired resource (file, lock, connection,
    memory, listener), find where it is released, and every path that skips
    the release.
15. **Assumption Audit:** write every assumption the code makes (about input,
    environment, ordering, timing, size, availability) and ask "what if false?"

---

## PHASE 7: OUTPUT FORMAT (STRICT)

> Under the AUTOMATED EXECUTION PROTOCOL, each finding below is written to
> `reviews/BUG_LEDGER.md` **as it is found** (with a unique ID and a status).
> The full report in 7.1 to 7.5 is assembled **once**, at the end (P9), from
> the ledger. Do not print a new full report after every sweep, only a short
> sweep summary (new findings by severity).

### 7.1 Header
```
# Bug Hunt Report: <module/feature name>
Reviewed: <files>
Assumptions made: <list>
Coverage: <which phases/categories were completed>
```

### 7.2 For EACH issue found, use this exact template
```
### [ID-001] <Short title>
- **Severity:** Critical | High | Medium | Low
- **Likelihood:** Almost certain | Likely | Possible | Rare
- **Category:** (e.g., Concurrency, Input Validation, Security, Data Integrity)
- **Persona:** (e.g., Unlucky User)
- **Location:** file:line / function
- **Scenario (exact steps a user takes):**
  1. ...
  2. ...
  3. ...
- **What actually happens (impact):** ...
- **Why the current code doesn't handle it:** ...
- **Confidence:** Confirmed from code | Likely | UNSURE (what to verify: ...)
- **Suggested fix (minimal):**
  ```
  code
  ```
- **Test that reproduces it:**
  ```
  test code
  ```
```

### 7.3 Severity guide
| Severity | Meaning |
|---|---|
| **Critical** | Data loss/corruption, security breach, money loss, full outage, irreversible harm |
| **High** | Major feature broken, wrong data shown/saved, crash for many users, easy abuse |
| **Medium** | Feature breaks in specific conditions, confusing failure, workaround exists |
| **Low** | Minor glitch, cosmetic issue with functional impact, very rare edge case |

### 7.4 Priority
Rank all issues by **Severity x Likelihood**. Put the top 10 first in an
"Fix These First" list.

### 7.5 Required extra sections
- **Verified Safe:** things you actively tried to break and the code handled
  correctly (with one-line reason).
- **Cannot Determine From Code:** questions that need DB schema, config,
  infrastructure, or runtime knowledge.
- **Missing Safety Nets:** absent timeouts, rate limits, validation,
  monitoring, alerts, limits, backups, kill switches.
- **Assumptions Found:** list of assumptions the code relies on.
- **Suggested Tests To Add:** unit, integration, property-based, fuzz, load,
  and end-to-end tests that would prevent regressions.
- **Coverage Matrix:** table showing each persona vs each entry point with a
  mark of Checked / Issue found / Not applicable.

```
| Entry point        | Careless | Malicious | Power | Unlucky | Confused | First-time | Bot |
|--------------------|----------|-----------|-------|---------|----------|------------|-----|
| POST /checkout     | ISSUE-3  | ISSUE-1   | OK    | ISSUE-5 | OK       | N/A        | OK  |
```

---

## PHASE 8: SELF-CHECK BEFORE FINISHING

Do not finish until you can answer **yes** to all:

- [ ] Did I complete Phase 2 map (entry points, inputs, outputs, state,
      trust boundaries, dependencies)?
- [ ] Did I apply **every** persona to **every** entry point?
- [ ] Did I go through **every** category in Phase 4 (and write "no issues"
      explicitly where applicable)?
- [ ] Did I run the Phase 5 mutation table on every critical flow step?
- [ ] Did I use the Phase 6 techniques (esp. Missing Code Hunt and
      Assumption Audit)?
- [ ] Does every finding have: concrete scenario, location, impact,
      severity, fix, and a test?
- [ ] Did I mark uncertain items as UNSURE instead of guessing?
- [ ] Did I avoid style/opinion comments?
- [ ] Did I look for **irreversible side effects** and double-execution?
- [ ] Did I look at **what happens after a failure** (not only whether
      failure is detected)?
- [ ] Did I second-pass the top 5 findings to verify they are real?
- [ ] Is every unit in the inventory marked `[x]` (none skipped, including
      "simple" ones)?
- [ ] Did I run all sweeps (unit-by-unit, category-by-category, flows,
      adversarial re-read) and log each in the Sweep Log?
- [ ] Did the last **two consecutive sweeps** find zero new Critical/High?
- [ ] Is every finding in the ledger with an ID and status, and no duplicates?
- [ ] Did I verify every Critical/High (test run or traced code path)?
- [ ] Did I avoid claiming "all bugs found"?

If the answer to any is no, go back and complete it.

---

## PHASE 9: TURN FINDINGS INTO PROOF (OPTIONAL BUT RECOMMENDED)

Findings from reading code can be wrong. Prove them:

1. For each High/Critical finding, write a **failing test** that reproduces it.
2. Run the test. If it fails as predicted, the bug is **real**. If it passes,
   the finding was a false alarm. Mark it accordingly.
3. Fix the bug, re-run, confirm the test passes.
4. Keep the test permanently as a regression test.

Also recommended (tools that find bugs by actually running the code):

| Goal | Tools |
|---|---|
| Random weird inputs | Hypothesis (Python), fast-check (JS/TS), jqwik (Java), QuickCheck (Haskell/others), gopter (Go) |
| Fuzzing | AFL++, libFuzzer, Atheris (Python), Jazzer (Java), Go native fuzzing |
| API fuzzing | Schemathesis, RESTler, Dredd |
| Are my tests good? | Mutation testing: Stryker (JS/.NET), mutmut (Python), PIT (Java) |
| UI flows | Playwright, Cypress, Selenium, Appium (mobile) |
| Load/stress | k6, Locust, JMeter, Artillery |
| Chaos/failure injection | Toxiproxy (network faults), Chaos Mesh, Gremlin |
| Static analysis | Semgrep, CodeQL, SonarQube, Bandit (Python), ESLint security plugins |
| Dependency vulnerabilities | Dependabot, `npm audit`, `pip-audit`, Snyk, OSV-Scanner |
| Secret scanning | gitleaks, trufflehog |
| Security scanning of running app | OWASP ZAP, Burp Suite |
| Race/concurrency detection | Go `-race`, ThreadSanitizer, Java Pathfinder |
| Memory/resource problems | Valgrind, AddressSanitizer, heap profilers |

---

## APPENDIX A: NASTY INPUT LIBRARY

Use these to craft concrete scenarios and tests.

### Strings
```
""                              (empty)
" "                             (space)
"   padded   "                  (leading/trailing spaces)
"\t\n\r"                        (whitespace chars)
"null"  "None"  "undefined"  "NaN"  "true"  "false"   (magic words)
"0"  "-1"  "1e308"  "0x1F"  "007"                    (number-like strings)
"O'Brien"  "Robert'); DROP TABLE users;--"            (quotes/SQL)
"<script>alert(1)</script>"  "\"><img src=x onerror=alert(1)>"   (XSS)
"{{7*7}}"  "${7*7}"  "<%= 7*7 %>"                     (template injection)
"; ls -la"  "| cat /etc/passwd"  "$(whoami)"  "`id`"  (command injection)
"../../../etc/passwd"  "..\\..\\windows\\win.ini"     (path traversal)
"%00"  "\u0000"                                       (null byte)
"%2e%2e%2f"  "%252e%252e%252f"                        (encoded traversal)
"A" * 100000                                           (very long)
"é" vs "e\u0301"                                      (normalization)
"\u202E"  (RTL override)   "\u200B" (zero-width space)
"😀👨‍👩‍👧‍👦🏳️‍🌈"                                              (emoji/ZWJ sequences)
"İstanbul"  "ß"  "ǅ"                                   (case-mapping oddities)
"=1+1"  "@SUM(1)"  "+cmd|' /C calc'!A0"                (CSV/Excel injection)
"http://localhost"  "http://169.254.169.254/"  "file:///etc/passwd"   (SSRF)
"javascript:alert(1)"                                  (bad URL scheme)
"%s %s %s %n"  "{0}"  "{}"                             (format string)
"admin"  "root"  "administrator"  "Admin " (trailing space)  (reserved names)
"a@b"  "a@b.c"  "\"a b\"@x.com"  "a+tag@x.com"  "very.long...@x.com"   (emails)
```

### Numbers
```
0, -0, 1, -1, 0.1, 0.5, 1.5, 2.5 (rounding)
2147483647, 2147483648, -2147483648         (int32 limits)
9007199254740991, 9007199254740993          (JS safe integer limit)
9223372036854775807, 9223372036854775808    (int64 limits)
1e308, 1e309 (Infinity), 5e-324, NaN, Infinity, -Infinity
0.1 + 0.2, 1/3, 100/3 (money splitting)
"1,000"  "1.000,00"  "١٢٣" (Arabic-Indic digits)  "１２３" (full-width)
```

### Dates and times
```
1970-01-01, 1969-12-31, 2038-01-19, 9999-12-31, 0000-00-00
2024-02-29 (valid), 2023-02-29 (invalid), 2100-02-29 (invalid), 2000-02-29 (valid)
2024-03-10 02:30 America/New_York  (spring-forward: doesn't exist)
2024-11-03 01:30 America/New_York  (fall-back: happens twice)
23:59:59, 24:00:00, 23:59:60 (leap second)
Jan 31 + 1 month, Mar 31 - 1 month
Timezones: UTC, +14:00, -12:00, +05:30, +05:45 (Nepal), Asia/Kolkata, half-hour zones
Timestamp in seconds vs milliseconds, negative timestamps
Device clock set to year 2000 / year 2099
```

### Files
```
0-byte file, 1-byte file, 5GB file, file with no extension
.exe renamed to .jpg, .jpg with PHP code, .svg with <script>, .html upload
Corrupt PDF/image/zip, password-protected zip, zip bomb (42.zip), zip-slip entries
File name: "con", "nul", "aux", " .txt", "file.txt.exe", 300-char name, "名前.txt", "a/b.txt"
Symlink to /etc/passwd, directory instead of file, file deleted mid-read
CSV: BOM, wrong delimiter, embedded newlines, quotes, mixed line endings, ragged rows,
     header only, no header, duplicate headers, 1M rows
JSON: trailing commas, comments, duplicate keys, deep nesting (10,000 levels),
      huge numbers, null vs missing, "NaN", unpaired surrogates
XML: external entities (XXE), billion laughs, huge attributes
```

### HTTP / Web
```
Missing/duplicate/huge headers, wrong Content-Type, wrong Content-Length
GET with body, POST with query string only, HEAD/OPTIONS/TRACE methods
Same parameter twice (?id=1&id=2), array syntax (?id[]=1), (?id[$ne]=1)
Very long URL (10k chars), unicode in URL, encoded slashes
Cookie missing/expired/tampered/too large
Request replayed hours later; same request sent 100 times in parallel
Redirect to external host; redirect loop
Requests with no User-Agent, no Origin, no Referer
Chunked uploads that never finish; slow sending (slow-loris)
```

---

## APPENDIX B: COMMON LANGUAGE-SPECIFIC TRAPS

Check the ones that apply to your stack.

**Python:** mutable default arguments (`def f(x=[])`); late-binding closures in
loops; `except:` swallowing everything incl. KeyboardInterrupt; `is` vs `==`;
integer/float division; naive vs aware datetimes; `pickle`/`yaml.load` on
untrusted data; `eval`/`exec`; `subprocess` with `shell=True`; GIL assumptions
about thread safety; forgetting `await`; modifying list while iterating;
`open()` without encoding; `dict` ordering assumptions in old versions;
`str.split` edge cases; regex catastrophic backtracking; unclosed files.

**JavaScript / TypeScript:** `==` vs `===`; `null` vs `undefined`; `NaN !== NaN`;
floating point; `parseInt("08")`/missing radix; `Array.sort` default string
sort; unhandled promise rejections; missing `await`; `forEach` with async;
prototype pollution (`__proto__`); `this` binding; closures in loops (`var`);
`JSON.parse` throwing; Date month is 0-indexed; timezone parsing of date-only
strings; large numbers losing precision; `localStorage` quota/unavailability
(private mode); `innerHTML` with user data; event listener leaks; stale
closures in React hooks; missing dependency arrays; key props; setState race;
SSR/hydration mismatch; CORS preflight; Service Worker serving stale code.

**Java / Kotlin / C#:** NullPointerException/`NullReferenceException`; unchecked
casts; `equals`/`hashCode` mismatch; mutable shared state; `SimpleDateFormat`
not thread-safe; resource leaks without try-with-resources/`using`; integer
overflow silently wrapping; string `==`; `ConcurrentModificationException`;
unbounded thread pools; checked exceptions swallowed; deserialization attacks;
`finalize`; time zone default JVM; Kotlin `!!`; C# `async void`; deadlocks with
`.Result`/`.Wait()`; LINQ deferred execution surprises; `DateTime.Now` vs UTC.

**Go:** nil pointer/map writes to nil map; ignoring returned `error`; goroutine
leaks; unclosed `resp.Body`; data races on shared maps/slices; loop variable
capture (older versions); `defer` in loops; slice aliasing/append surprises;
integer overflow; `time.After` leaks; context cancellation not propagated; no
timeouts on `http.Client` (default has none).

**C / C++:** buffer overflows; use-after-free; double free; uninitialized
memory; signed overflow (UB); format string bugs; off-by-one in `strncpy`;
null terminator missing; memory leaks; race conditions; iterator invalidation;
integer conversions/sign issues; TOCTOU on files.

**PHP:** loose comparison (`"0e123" == "0e456"`); `include` with user input;
`unserialize` on user data; SQL via string concatenation; `extract()`;
type juggling; `strcmp` returning null on arrays; magic quotes legacy;
file upload handling; `$_REQUEST` ambiguity.

**Ruby / Rails:** mass assignment/strong params; `send` with user input;
`YAML.load`; N+1 queries; `find_by` vs `find` nil; callbacks with side effects;
race conditions in `find_or_create_by`; time zone handling.

**SQL:** `NOT IN` with NULL; `COUNT(*)` vs `COUNT(col)`; implicit type casts;
collation case-insensitivity; missing `WHERE` on `UPDATE/DELETE`; `LIMIT`
without `ORDER BY`; locking and isolation level assumptions; timezone of
`NOW()`; integer division; string truncation silently; `LIKE` wildcards in user
input (`%`, `_`).

**Mobile (Android/iOS/Flutter/React Native):** lifecycle (pause/resume/kill);
rotation destroying state; permission denial/revocation; background execution
limits; low memory kills; network type changes; deep link handling with bad
params; keyboard covering inputs; notch/safe-area; tiny and huge screens;
different OS versions; storage full; app update with old local data/migrations;
push token changes; offline queue duplicates; time/timezone change; battery
saver; interrupted downloads/uploads.

---

## APPENDIX C: "QUESTIONS TO ASK EVERY FUNCTION"

For **every** function/method/endpoint, quickly ask:

1. What are ALL the inputs (including hidden ones: globals, time, config, DB)?
2. What if each input is missing / null / empty / wrong type / huge / malicious?
3. What does it assume about the **caller** (already authenticated? validated?)
4. What does it assume about the **environment** (network up? file exists?)
5. What are ALL the ways it can fail? Which are handled? Which are silent?
6. What if it's called **twice**? Concurrently? Out of order? Recursively?
7. What if it's interrupted halfway? What state is left behind?
8. What side effects happen, and in what order? Which are irreversible?
9. What does it return on failure, and will the caller notice?
10. What resources does it acquire, and are they released on every path?
11. How does it behave with 0, 1, 2, many, and a huge number of items?
12. What would an attacker do with this function?
13. What would a confused user do with this function?
14. What changes if the clock, timezone, locale, or OS is different?
15. How would I know in production that this function is failing?

---

## APPENDIX D: READY-TO-USE PROMPTS

### D.0 RECOMMENDED: one command, fully automatic (copy-paste)
```
Follow the AUTOMATED EXECUTION PROTOCOL in USER_CHAOS_REVIEW.md on
<folder/file/feature>. Mode: REPORT ONLY.
Create/read reviews/BUG_LEDGER.md and reviews/REVIEW_PROGRESS.md. Inventory
every unit, run all sweeps (P3 to P5), verify Critical/High findings (P6b),
and keep going until the stopping rule (P6) is met or the 8-sweep cap is hit.
Do not stop after the first report. Do not re-report anything in the ledger.
If you run out of space, pause cleanly (P8) so I can reply "continue".
My app: <short description, users, stack>.
```

### D.0b Same, but also fix the bugs
```
Follow the AUTOMATED EXECUTION PROTOCOL in USER_CHAOS_REVIEW.md on <scope>.
Mode: FIX MODE ON (follow P7). For each Critical/High/Medium bug: failing test,
minimal fix, run tests, then a Regression Sweep on the diff. Continue until the
stopping rule is met. Keep the ledger updated.
```

### D.0c Resume after a pause or a new session
```
Continue the USER_CHAOS_REVIEW.md protocol. Read reviews/BUG_LEDGER.md and
reviews/REVIEW_PROGRESS.md and resume exactly where it stopped. Do not restart
and do not re-report ledger items.
```

### D.1 Full review (copy-paste)
```
Follow USER_CHAOS_REVIEW.md completely on the following code. Complete ALL
phases (1-8), use every persona, go through EVERY category in Phase 4, apply
the Phase 5 mutation table to each critical flow, and use the exact output
format from Phase 7. Do not skip categories. Do not report style issues.
Mark uncertain findings as UNSURE. My app is: <describe app, users, stack>.
Code: <paste or point to files>
```

### D.2 Focused review
```
Follow USER_CHAOS_REVIEW.md but focus ONLY on: <concurrency | security |
input validation | external API failures | data integrity | payments |
file handling | error handling | scale/performance>. Still use the Phase 7
output format.
```

### D.3 Change/PR review
```
Using USER_CHAOS_REVIEW.md, review ONLY this diff. For each changed line, ask:
what user behavior could now break that worked before, and what new
user behavior is not handled? Also check what the old code guaranteed that the
new code might not.
```

### D.4 Write tests for findings
```
For each High/Critical finding from the report, write a failing automated
test (<pytest | jest | JUnit | go test | ...>) that reproduces it. Then
propose the minimal fix and show the test passing.
```

### D.5 Second pass / red team
```
Review the bug report above. What did it MISS? Try again as: <Malicious User |
Unlucky User | Power User>. Focus on bugs not yet listed. Also challenge the
top 5 findings: are any false alarms?
```

### D.6 Review one user flow end to end
```
Using USER_CHAOS_REVIEW.md Phase 5, trace this flow step by step: <flow
description>. Apply every mutation (fails, repeats, skipped, reordered, slow,
stale, interrupted, concurrent, cancelled, wrong input, wrong user, reversed)
to each step. Report every unhandled case.
```

### D.7 Pre-release gate
```
Act as a release gatekeeper. Using USER_CHAOS_REVIEW.md, decide whether
this code is safe to ship. List blockers (must fix), risks (should fix), and
acceptable gaps (can ship). Give a go/no-go recommendation with reasons.
```

---

## APPENDIX E: HOW TO GET THE BEST RESULTS

1. **One module at a time.** Whole-repo reviews stay shallow. Review each
   feature/file separately, then do a final pass on the integration points.
2. **Give context.** The more the AI knows about users, scale, stack, and
   what is at stake, the better the scenarios.
3. **Run multiple passes** with different focus (security, concurrency,
   failure handling, data integrity). Each pass finds different bugs.
4. **Demand tests.** A finding without a reproducing test is a guess.
5. **Include the surroundings.** Share callers, DB schema, config, and
   API contracts. Many bugs live at boundaries between components.
6. **Feed real incidents.** Add past production bugs/support tickets as
   examples: "Here are bugs we had before. Find similar ones."
7. **Keep this file in the repo** (`/docs` or root) and re-run before every
   release and on every major PR.
8. **Track results.** Keep each report in `/reviews/` so you can see
   what was found, fixed, or accepted as risk.
9. **Combine with real tools** (fuzzers, property tests, load tests,
   chaos tests). AI finds the logic gaps you didn't think of; tools find the
   ones nobody would think of.
10. **Don't trust blindly.** Verify every High/Critical finding yourself.

---

## APPENDIX F: TEMPLATES FOR THE STATE FILES

Create these two files in a `reviews/` folder. The AI reads and updates them
on every run, which is what lets it resume and never repeat itself.

### F.1 `reviews/BUG_LEDGER.md`
```markdown
# Bug Ledger
Scope: <files/feature>
Last updated: <date> | Sweep: <n>

## Summary
| Status | Critical | High | Medium | Low |
|---|---|---|---|---|
| OPEN | 0 | 0 | 0 | 0 |
| CONFIRMED | 0 | 0 | 0 | 0 |
| FIXED | 0 | 0 | 0 | 0 |
| FALSE ALARM | 0 | 0 | 0 | 0 |
| UNSURE | 0 | 0 | 0 | 0 |

## Findings
### [BUG-001] <short title>
- Status: OPEN | CONFIRMED | FIXED | FIXED-UNTESTED | FALSE ALARM | UNSURE | REGRESSION
- Severity / Likelihood: High / Likely
- Category / Persona: Concurrency / Unlucky User
- Location: path/file.py:88 (function_name)
- Found in: Sweep 1, unit "function_name"
- Scenario: 1) ... 2) ... 3) ...
- Impact: ...
- Root cause (used for duplicate detection): ...
- Fix: ...
- Test: tests/test_x.py::test_name (or "not written")
- Verified: yes (test failed as predicted) | traced only | no
```

### F.2 `reviews/REVIEW_PROGRESS.md`
```markdown
# Review Progress
Scope: <files/feature>
Mode: REPORT ONLY | FIX MODE
Status: IN PROGRESS | PAUSED at Sweep <n>, unit <x>/<total> | COMPLETE

## Assumptions
- ...

## Unit Inventory (Units: 0/<total> done)
- [ ] src/auth/login.py :: login()
- [ ] src/auth/login.py :: logout()
- [ ] src/api/orders.py :: POST /orders
- ...

## Category Coverage (Phase 4)
- [ ] 4.1 Input validation
- [ ] 4.2 Strings/encoding
- ... (through 4.25)

## Critical Flows (Phase 5)
- [ ] Sign up -> verify -> login
- [ ] Checkout -> payment -> refund
- ...

## Sweep Log
| Sweep | Angle | New Critical | New High | New Medium | New Low |
|---|---|---|---|---|---|
| 1 | Unit-by-unit | | | | |
| 2 | Category-by-category | | | | |
| 3 | Flows | | | | |
| 4 | Adversarial re-read (reverse order) | | | | |

## Stopping rule check
- [ ] All units done and all categories done
- [ ] Two consecutive sweeps with 0 new Critical/High and <=2 new Medium
- [ ] All Critical/High verified
- [ ] Phase 8 self-check ticked
```

---

*End of USER_CHAOS_REVIEW.md*
