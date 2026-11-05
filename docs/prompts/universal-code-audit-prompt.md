# Universal Code Audit & Cleanup Prompt

A single prompt that works on any project, in any language. Paste everything from
**"START OF PROMPT"** to **"END OF PROMPT"** into Claude Code, Cursor, or any AI tool that
can read and run your repository.

**Before you paste:** fill in the `PROJECT CONFIG` block (Section 0). Everything else adapts
automatically to the stack the AI detects.

**What it covers:**
unused files, unused functions, dead comments, dead config, line-by-line bugs, security
problems, data-loss risks, concurrency problems, dependency problems, performance waste,
long-running job safety, and test gaps.

---

## START OF PROMPT

You are a senior staff engineer, security reviewer, and QA lead doing a complete audit of this
codebase. Your goals, in priority order:

1. **Find every bug and every serious risk**, especially anything that could crash late, lose
   data, lose hours of work, corrupt output, or fail silently.
2. **Remove code that is not needed** (unused files, dead functions, dead comments, dead
   config) without changing behavior.
3. **Make the code reliable and efficient** with the smallest correct changes.

Nothing in this prompt gives you permission to guess. If you cannot verify something, say so
plainly and leave it alone.

---

### 0. PROJECT CONFIG (filled in by me)

```
Project name:
Main entry points / commands to run it:
How to run tests:
How to run lint / type check:
How to build:
Long-running jobs in this project (training, scraping, imports, batch jobs):
Public surfaces that must NOT be treated as unused
  (public API endpoints, CLI commands, exported library functions, webhooks, plugins):
Load-bearing logic that must NOT be touched
  (e.g. fraud/false-positive rules, billing calculations, legal text, print layouts):
Known targets / baselines a result must meet
  (e.g. "model precision must be >= 0.94", "report totals must match legacy output"):
Environment constraints (OS, Python/Node/Java version, GPU, DB, no internet, etc.):
Anything else I want you to focus on:
```

If any field is blank, detect it yourself from the repo (README, package files, CI config,
Makefile, Dockerfile) and tell me what you assumed.

---

### 1. GLOBAL RULES (apply to every phase)

1. **Work on a new git branch** named `audit/<date>`. Never work on main.
2. **Baseline first.** Run tests, lint, type checks, and build before changing anything and
   record the results. If the baseline already fails, stop and tell me before changing code.
3. **One commit per phase or per group of related changes**, with a clear message. After every
   commit, re-run tests, lint, and build. If anything fails, revert that commit, report why,
   and continue with the next group.
4. **Prove, don't assume.** Every removal needs evidence (what you searched, what you found).
   Every bug needs the exact file, line, and a description of how it fails.
5. **Smallest correct change.** Do not refactor, rename, reformat, or "improve" code that is
   not part of a finding. No style-only changes mixed into logic commits.
6. **Never change behavior silently.** If a fix changes output or behavior, say so explicitly in
   the report, even when the change is correct.
7. **When unsure, report instead of editing.** Use these labels: `FIXED`, `REMOVED`,
   `REPORTED (needs my decision)`, `COULD NOT VERIFY`.
8. **Respect the "must NOT touch" list** in Section 0, and anything marked as public.
9. **Never hide a failure.** Do not add `try/except: pass`, do not weaken tests, do not delete a
   failing test to make things pass, do not lower a threshold to make a check pass.
10. **No secrets in output.** If you find a real secret (key, token, password), report its
    location but do not print its value.
11. **Read every file completely.** Do not sample, skim, or stop at the first few findings.
    If the repo is too large for one pass, work folder by folder and keep a running checklist
    of files reviewed. State clearly which files you did and did not review.

---

### 2. PHASE 0: Discovery and baseline

Before touching anything, produce:

- Detected languages, frameworks, runtime versions, package managers
- Project structure summary (main folders and what each does)
- All entry points: main files, CLI commands, web routes, scheduled jobs, workers, scripts
- All external dependencies the code talks to: databases, APIs, queues, file systems,
  third-party services, hardware (GPU, printers)
- All long-running or irreversible operations (training, migrations, bulk deletes, bulk
  sends, imports, exports, scrapes)
- All **dynamic usage patterns** present in this codebase (reflection, `getattr`, string-based
  imports, decorators that register things, dependency injection, plugin loaders, framework
  auto-loading, template engines calling functions by name, ORM magic). These decide how
  careful you must be when judging something "unused".
- Static analysis tools available for this stack. Run the ones that are installed and use
  them as **evidence, not as the final word**. Examples:
  - Python: `ruff`, `vulture`, `mypy`, `pyflakes`, `bandit`, `pip-audit`
  - JS/TS: `eslint`, `tsc --noEmit`, `knip`, `ts-prune`, `depcheck`, `npm audit`
  - Java/Kotlin: IDE inspections, SpotBugs, Checkstyle, `mvn dependency:analyze`
  - Go: `go vet`, `staticcheck`, `deadcode`, `govulncheck`
  - PHP: `phpstan`, `psalm`, `composer audit`
  - C#/.NET: Roslyn analyzers, `dotnet list package --vulnerable`
  - Rust: `cargo clippy`, `cargo udeps`, `cargo audit`
  - Any: `gitleaks` or `trufflehog` for secrets, `semgrep` for patterns
  If a tool is not installed, you may install it for this audit only (do not add it to the
  project's dependency files unless I ask).

Output a short "audit plan" listing which phases apply to this project and why.

---

### 3. PHASE 1: Remove unused files (APPLY CHANGES)

Find files that are not used anywhere. Before removing any file, check ALL of these:

- Static and dynamic imports (`import()`, `require(variable)`, lazy loading, `importlib`)
- String-path references in: config files, package manifests, build tools (webpack, vite,
  tsconfig, gradle, maven, Makefile), CI/CD YAML, Dockerfiles, env files, scripts, docs
- Framework auto-loaded files (routes, pages, migrations, fixtures, seeders, glob-matched
  tests, plugins, middleware, management commands, templates)
- Static assets referenced from other files (CSS `url()`, `<img src>`, manifests, fonts,
  email templates, report templates)
- Entry points and files launched by scheduled tasks, cron, systemd, or shell scripts
- Files referenced by other repos or deployed separately (ask me if you see signs of this)

Also look for, and report or remove when proven safe:

- Backup and copy files (`file_old.py`, `file_copy.js`, `file (1).txt`, `*.bak`, `*.orig`)
- Leftover experiments, scratch scripts, one-off migration scripts already applied
- Empty files, empty directories, placeholder files with no purpose
- Build artifacts and caches committed by mistake (`__pycache__`, `node_modules`, `dist`,
  `.DS_Store`, `*.log`, `*.pyc`, large temporary data dumps)
- Duplicate files (identical content in two places)
- Large binary or data files that nothing reads

Remove only if proven unreferenced by every check above. Commit file removals separately.
For each file log: path, what you searched, why it is safe.

---

### 4. PHASE 2: Identify unused functions (REPORT ONLY, do not modify)

Identify functions and methods with **zero use**, meaning deleting them changes nothing in
behavior, output, or performance. A function qualifies only if ALL are true:

1. It is never called directly (app code, tests, scripts, migrations, config, templates).
2. It is not referenced indirectly: callbacks, routes, handlers, event listeners, scheduled
   jobs, decorators, reflection, dependency injection, `getattr`, string-based lookup,
   framework auto-wiring, serializers, signals, lifecycle hooks, abstract/interface methods.
3. It is not part of a public API, `__all__`, package entry point, or exported surface.
4. It is not referenced in docs, README, or comments as an entry point.
5. Removing it needs no other change, and nothing relies on its side effects (logging,
   caching, registering something at import time, mutating shared state).

Verify each candidate by searching the whole project for its name as: a call, an import, a
string, a decorator target, and inside comments/docs. Check `git log` briefly: a recently
added function may be mid-integration.

Also report:
- Unused classes, constants, variables, parameters, enum members, type definitions
- Unused exports and unused re-exports
- Wrapper functions that only forward to another function
- Duplicate functions that do the same thing as another function
- Functions only called by other unused functions (list them as one removal group)

**Output for each function:** file:line, name, one-line signature, evidence of zero use,
confidence, impact of removal ("None").

- **High confidence:** thorough search, no dynamic patterns could reach it.
- **Medium confidence:** looks unused, but this codebase uses dynamic patterns elsewhere.
- **Low confidence:** put in a separate "needs manual check" section with the reason.

Exclude any function that has even one caller, live or dead (that is a chain to review
separately; mention it in a separate "dead call chains" list). End with totals by confidence
and total lines.

---

### 5. PHASE 3: Remove dead commented-out code and dead config (APPLY CHANGES)

**3A. Commented-out code.** In remaining files, find commented-out CODE (not prose) and remove
it when it is:
- Old logic clearly replaced by active code nearby
- Debug prints, `console.log`, `print`, `debugger`, test calls left commented out
- Whole disabled blocks with no explanation and no recent activity (check `git blame`)

Keep and flag (do not remove):
- Explanatory prose comments, license headers, docstrings, API documentation
- Relevant `TODO` / `FIXME` / `NOTE` / `HACK` (list them in the report with file:line)
- Comments that look mid-work or recent
- Deliberate on/off toggle patterns used throughout a file (ask me first, since the file
  may be maintained that way on purpose, e.g. legacy report/layout scripts where `*` or `//`
  lines are kept as quick switches)

**3B. Dead configuration.** Find and remove when proven unused:
- Environment variables defined (in `.env.example`, config files, docs) but never read
- Config options and feature flags that are never read, or are always the same value
- Constants and settings no code references
- Dead entries in manifests, route tables, menu definitions, permission lists
- Unused database columns, tables, indexes, models, serializers, migrations that were
  superseded (**report only** for anything that touches a live database)

**3C. Pointless hardcoded logic.** Find code that transforms, forces, or assumes something the
project never needs:
- Forced prefixes/suffixes (e.g. prepending `https://` when no downstream code needs it),
  redundant trimming, lowercasing, normalizing of already-normalized values
- Magic numbers, fixed strings, and default values with no purpose and no reader
- Duplicate lines, repeated statements, copy-paste leftovers
- Workarounds for problems that no longer exist
- Steps whose output is never used

For each: trace the value **forward** (does anything behave differently because of it?) and
**backward** (can the input ever be in the form this code "fixes"?). Remove only when both
traces prove it inert. Defensive code inside public/shared helpers is **reported, not removed**.

Log file:line, a brief description, and the rule applied.

---

### 6. PHASE 4: Line-by-line bug review (APPLY FIXES)

Read **every line of every file**. For each file, check all of the categories below. Skip
categories that do not apply to the language.

#### 6.1 Correctness and logic
- Wrong operators (`=` vs `==`, `and` vs `or`, `&` vs `&&`, `is` vs `==`, bitwise vs logical)
- Inverted or impossible conditions, always-true / always-false conditions, unreachable code
- Off-by-one errors in loops, slices, ranges, pagination, indexes, boundaries
- Wrong variable used (copy-paste errors, shadowed names, stale variable after a loop)
- Mutating a collection while iterating over it
- Mutable default arguments (Python), shared mutable class attributes
- Wrong order of operations (e.g. casting or moving a model/object **after** other objects
  that depend on its type or device were already created)
- Floating-point equality checks, rounding errors, integer overflow, integer division surprises
- Money handled as floats instead of decimals or integer minor units
- Incorrect sorting, comparison, or equality (comparing strings to numbers, wrong key
  function, unstable assumptions)
- Missing `return`, missing `await`, missing `break` in switch/case fallthrough
- Copy vs reference mistakes (shallow copy where deep copy is needed)
- Operator precedence mistakes, missing parentheses
- State that is initialized once but should reset per run/request/iteration

#### 6.2 Types, shapes, and data mismatches
- Type mismatches: `int` vs `float`, `str` vs `bytes`, `str` vs `int` from user/env/CSV input
- Numeric dtype mismatches (fp16 vs fp32, int64 vs int32, float vs double)
- Device mismatches (CPU vs GPU tensors, model on one device and data on another)
- Tensor/array/dataframe shape mismatches, wrong axis, broadcasting surprises
- Wrong column names, wrong key names, wrong field names (typos, renamed fields not updated)
- Implicit type coercion bugs (JavaScript `==`, string concatenation vs addition,
  `"10" < "9"`)
- Date/time bugs: timezone-naive vs aware, local vs UTC, daylight saving, wrong date format,
  month index off-by-one, comparing dates as strings
- Encoding bugs: UTF-8 vs other encodings, BOM, unicode normalization, `latin1` fallbacks
  that corrupt text, line endings (`\r\n` vs `\n`)
- JSON/serialization problems: non-serializable types, key type changes, precision loss for
  large integers, `NaN`/`Infinity`
- Null handling in data formats (empty string vs `None` vs `NaN` vs missing key)

#### 6.3 Null, empty, and boundary handling
- Dereferencing `None` / `null` / `undefined` without checks
- Empty list, empty string, empty dataframe, zero-row query results not handled
- Division by zero, `log(0)`, `sqrt(negative)`, empty `max()` / `min()` / `mean()`
- Unguarded dictionary/array access (`KeyError`, `IndexError`, out-of-range)
- Optional values assumed to always exist
- Boundary values: 0, 1, -1, max int, very long strings, very large files, very large result sets
- Unicode, emoji, very long text, special characters in user input and filenames

#### 6.4 Error handling
- Bare `except:`, `except Exception: pass`, empty `catch {}` that swallow real errors
- Errors caught and logged but then execution continues with invalid state
- Catching too broadly (hiding programmer errors) or too narrowly (missing real failures)
- `finally` blocks that can themselves raise and hide the original error
- Missing error handling around: file I/O, network calls, DB calls, subprocesses, parsing,
  external APIs, user input
- Error messages that lose the original exception/stack trace
- Functions that return `None`/`false`/`-1` on failure while callers ignore it
- Promise rejections not handled, `async` functions called without `await`, fire-and-forget
  tasks whose failures vanish
- Retry loops with no limit, no backoff, or that retry non-idempotent operations
- Timeouts missing on network calls, DB calls, subprocesses, locks (can hang forever)
- Silent fallbacks that produce wrong-but-plausible output instead of failing loudly

#### 6.5 Resource and lifecycle problems
- Unclosed files, sockets, DB connections, cursors, browser instances, processes, threads
- Missing `with` / `using` / `try-with-resources` / `defer` / `finally` cleanup
- Connection pools exhausted, new connection per request/iteration
- Memory leaks: ever-growing lists/dicts/caches, listeners never removed, closures holding
  large objects, loading an entire huge file/table into memory
- Temporary files and directories never cleaned up, or written to unsafe/shared locations
- Zombie subprocesses, threads that never terminate, background tasks never cancelled
- Missing graceful shutdown (signals, flushing buffers, committing/rolling back transactions)
- Disk space, file-descriptor, or memory exhaustion risks in long runs

#### 6.6 Concurrency and async
- Race conditions on shared state, check-then-act bugs (TOCTOU), unprotected counters
- Missing locks, wrong lock scope, potential deadlocks, locks held during slow I/O
- Thread-unsafe use of shared objects (clients, sessions, random generators, caches)
- `async`/`await` mistakes: missing `await`, blocking calls inside async code, un-awaited
  coroutines/promises, `forEach` with async callbacks
- Unbounded concurrency (spawning thousands of tasks/requests/threads at once)
- Event-loop or main-thread blocking (UI freezes, server stalls)
- Duplicate processing from retries or overlapping scheduled runs; missing idempotency
- Race between "read then write" in databases without transactions or unique constraints
- Global mutable state shared between requests/workers

#### 6.7 Data integrity and database
- Writes that can partially succeed (no transaction, no rollback)
- Missing unique constraints / duplicate-insert risks; upsert logic that creates duplicates
- `UPDATE` / `DELETE` without a proper `WHERE`, or with a `WHERE` built from unvalidated input
- N+1 query patterns, queries inside loops, missing indexes on filtered/joined columns
- Unbounded queries (no `LIMIT`, no pagination) on large tables
- Migrations that are destructive, irreversible, or lock large tables
- Wrong join types, accidental cartesian products, wrong `GROUP BY`, NULL comparison bugs
- Schema drift: code expects columns/fields that do not exist (or vice versa)
- Stale cache after writes; cache keys that collide or never expire
- Reading and writing the same data in conflicting formats

#### 6.8 Security
- **Injection:** SQL, NoSQL, shell/command, LDAP, template, XPath, log, header, and eval
  injection. Any `eval`, `exec`, `os.system`, `shell=True`, string-built queries or commands
- **XSS and output encoding:** unescaped user input in HTML, `innerHTML`, `dangerouslySetInnerHTML`
- **CSRF, CORS, and open redirects:** wildcard CORS with credentials, missing CSRF protection,
  redirects built from user input
- **Authentication/authorization:** endpoints missing auth checks, missing ownership checks
  (IDOR), client-side-only permission checks, weak or hardcoded credentials, default admin
  passwords, tokens that never expire
- **Secrets:** API keys, passwords, tokens, private keys, connection strings committed in code,
  config, docs, tests, notebooks, or git history (report location only, never the value)
- **Cryptography:** MD5/SHA1 for passwords, unsalted hashes, `random` instead of a
  cryptographic RNG for tokens, hardcoded IVs/keys, disabled TLS verification
  (`verify=False`, `rejectUnauthorized: false`)
- **Unsafe deserialization:** `pickle`, `yaml.load` without safe loader, `eval` on data,
  untrusted `ObjectInputStream`
- **File handling:** path traversal (`../`), unvalidated upload types/sizes, writing user-named
  files, serving files from user-supplied paths, unsafe temp files
- **SSRF:** fetching URLs supplied by users without allow-lists
- **Sensitive data exposure:** passwords/tokens/personal data in logs, error messages, URLs,
  analytics, responses; stack traces shown to users; debug mode enabled in production
- **Missing rate limiting, input size limits, and validation** on public endpoints
- **Dependencies with known vulnerabilities** (run the stack's audit tool)
- **Insecure defaults:** world-readable files, permissive file modes, open ports, `0.0.0.0`
  binds, default credentials

#### 6.9 External calls: APIs, network, subprocesses
- Missing timeouts, missing retries with backoff, retries on non-idempotent calls
- Rate limits ignored; no handling for HTTP 429/5xx; pagination not followed
- Response structure assumed without validation (missing keys, null fields, changed schema)
- Hardcoded URLs, hosts, ports, API versions that should be configuration
- Webhooks without signature verification or idempotency
- Subprocess calls with unescaped arguments, no timeout, output not read (pipe fills and
  hangs), exit codes ignored
- Dependence on a service that may be unavailable with no graceful degradation

#### 6.10 Configuration, environment, and paths
- Environment variables read without defaults or validation; wrong type (string used as number
  or bool: `"false"` is truthy)
- Config keys referenced that do not exist; wrong env var names; `.env` values committed
- Hardcoded absolute paths, drive letters, usernames, machine names
- OS-specific assumptions: path separators, case sensitivity, line endings, shell syntax,
  file locks, long-path limits, permissions
- Relative paths that depend on the current working directory
- Differences between dev and production config that can break production only
- Missing output directories (not created before writing), no write-permission check
- Timezone, locale, and encoding assumptions in the runtime environment

#### 6.11 Dependencies and build health
- Imports of packages not listed in the dependency file (works only on the developer's machine)
- Packages listed but unused (report; remove only if proven unused and not dynamically loaded)
- Unpinned or loosely pinned versions that can break on a fresh install; conflicting versions
- Deprecated or abandoned packages; APIs called that were removed in the pinned version
- Version-specific syntax/features that do not match the declared runtime version
- Circular imports, import-time side effects (network calls, DB connections, heavy work at
  import)
- Lockfile out of sync with the manifest
- Build/CI steps that reference files or scripts that no longer exist
- Docker issues: missing files in the image, running as root, huge images, secrets baked in

#### 6.12 Performance (only changes that cannot alter results)
- Work inside loops that can be moved out (repeated parsing, compiling regex, opening
  connections, recomputing constants)
- Quadratic algorithms where a set/dict/index would do; repeated list `in` checks on large lists
- Reading whole files/tables into memory when streaming or batching works
- Repeated identical network/DB calls that can be cached or batched
- String concatenation in large loops; unnecessary copies of large objects
- Loading large models/resources repeatedly instead of once
- Blocking sleep/polling where an event or callback works
- Missing indexes, missing `LIMIT`, `SELECT *` on wide tables, unneeded joins
- Unneeded serialization/deserialization round trips
- **Rule:** only apply a performance change when output is provably identical. Anything
  that might change results is reported, not applied.

#### 6.13 Frontend and UI (if present)
- State updates on unmounted components, stale closures, missing dependency arrays, infinite
  re-render loops, effects without cleanup
- Missing loading and error states; unhandled empty data; unvalidated forms
- Memory leaks (event listeners, intervals, subscriptions never cleared)
- Keys missing/unstable in lists; direct state mutation
- Accessibility problems that break use (missing labels, keyboard traps)
- Hardcoded text/URLs/colors that should be configuration
- Large bundles, unoptimized images, blocking scripts
- Browser-compat issues; `localStorage` assumed available; data trusted from the client

#### 6.14 Machine learning, data science, and data pipelines (if present)
- **Data leakage:** test/validation data seen during training, scaling/encoding fit on the full
  dataset, duplicates across splits, time-series split done randomly
- Train/serve skew: preprocessing differs between training and inference
- Class imbalance ignored or handled inconsistently; wrong metric for the task; threshold
  chosen on the test set
- Wrong label encoding/order, shuffled labels vs features, misaligned indexes after filtering
- Random seeds not set or set inconsistently; non-reproducible results
- dtype/device/precision mismatches (fp16 vs fp32, CPU vs GPU, loss weights vs logits dtype)
- Custom loss/trainer/callback code paths that differ from the standard path and were never
  executed in testing
- Metric computation errors (averaging method, zero-division, wrong positive class)
- NaN/inf in features or loss; exploding/vanishing values; missing normalization
- Saving only at the very end; saving weights without tokenizer/config/preprocessor/label map;
  save formats that cannot be reloaded; not testing reload + predict after saving
- Evaluating a model but deploying a different artifact; wrong model path/version loaded
- Memory blow-ups: loading the whole dataset, no batching, no gradient accumulation, no
  mixed-precision handling, no cleanup of GPU memory between runs
- Hardcoded hyperparameters, paths, and thresholds scattered through the code
- Results below a known baseline treated as success

#### 6.15 Logging, observability, and operability
- Missing logs around critical failures; logs that hide the real error
- Sensitive data in logs; log spam that fills the disk; no log rotation
- No progress output on long jobs; no way to tell if a job is stuck
- No health checks, no exit codes (script exits 0 on failure), failures not surfaced to
  callers/schedulers
- No alerting hooks for important failures when the project has any monitoring

#### 6.16 Tests
- Tests that always pass (no assertions, asserting constants, mocked-away logic)
- Tests that depend on order, external services, the clock, or random data
- Tests that never run (wrong naming/pattern, skipped/disabled without reason)
- Critical paths with no test at all (list them; do not invent tests unless I ask)
- Mocks that hide real behavior differences (the mock accepts what the real call would reject)

#### 6.17 Legacy and domain-specific scripts (if present)
For report layouts, print formats, or DSL/script files (for example ERP print formats,
FoxPro/dBase scripts, VBA macros, Excel formulas, shell scripts, SQL stored procedures):
- Missing/duplicate variable or field names, coordinates that overlap or overflow the page
- Commented-out lines kept as toggles (flag the pattern; ask before removing)
- Fields referenced that do not exist in the data source
- Conditional blocks whose conditions can never be true
- Hardcoded company/user/tax values that should come from data
- Duplicated blocks across near-identical variants (report the differences)

**For every issue found, do exactly one of:**
- **FIX** it with the smallest correct change, if the code is relevant to the project.
- **REMOVE** it, if the code is irrelevant (no references, no effect on output) and is causing
  or hiding bugs.
- **REPORT** it, if you are unsure whether it is relevant, if the fix changes behavior, if
  the fix needs a design decision, or if it touches the "must NOT touch" list.

Log each as: `file:line | severity | category | what is wrong | how it fails | action taken`.

---

### 7. PHASE 5: Long-running job safety (APPLY CHANGES)

For any job that can run longer than a few minutes (training, scraping, bulk imports/exports,
migrations, batch emails, report generation, data pipelines), **no failure may be allowed to
destroy hours of work.** Do all of the following.

1. **End-to-end dry run on the REAL code path.**
   Run the actual production path on a tiny dataset (about 20 to 50 items, 1 epoch or a few
   steps). It must execute **every stage in order**: load config, load data, preprocess,
   process/train, intermediate evaluation, final evaluation, save, **reload the saved output
   from disk**, and run one real prediction/use of it. It must include custom classes (custom
   loss, trainer subclasses, callbacks, hooks), dtype/device casts, optimizer/scheduler steps,
   and the final save/export. **A bare forward pass or a unit test of one function does NOT
   count as verification.**
2. **Fail early.** Anything that can crash at the end must be exercised at the start:
   output directory creation and write permission, free disk space, credentials and
   connectivity, required files and columns, saving a dummy artifact, metric code, export
   code, final report code. Validate all inputs and config before the first expensive step.
3. **Checkpoint and resume.** Save progress regularly (every epoch, or every N records or
   batches), keep a limited number of checkpoints, and support resuming from the latest one.
   **Never** allow a configuration where the only save happens once at the very end
   (e.g. `save_strategy="no"`).
4. **Save before risky steps.** Write the main output (trained model, processed data, export)
   to disk **before** final evaluation, conversion, upload, or post-processing, so a crash
   there cannot erase the main result.
5. **Protect final stages.** Wrap final evaluation/export/cleanup in `try/except` that logs the
   full error and still keeps the saved output. Never use `except: pass`.
6. **Atomic writes.** Write results to a temporary file and rename it when complete, so a
   crash never leaves a half-written output that looks valid.
7. **Idempotent and resumable batch work.** Re-running a failed job must not duplicate
   records, re-send messages, or redo finished work. Track progress per item.
8. **Progress and metric guards.** Log progress, elapsed time, ETA, and key metrics regularly.
   If a metric is clearly worse than the known baseline in Section 0 (for example precision
   far below the model already in production), print a visible warning and stop early or ask
   for confirmation instead of burning hours on a result that will not be used.
9. **Resource guards.** Monitor memory, GPU memory, and disk; clean up between phases; cap
   batch sizes; handle out-of-memory with a clear message.
10. **Interruption safety.** Handle Ctrl+C/termination signals by saving a checkpoint and
    exiting cleanly.
11. **Reproducibility.** Set and log random seeds, library versions, config, and data
    version/hash with every run output.
12. **Estimate runtime** from the dry run's timing, scaled to full size, and report it.

If the dry run fails at any stage, fix the cause and **re-run the whole dry run from the
beginning** until it passes cleanly end to end. Do not report success until it does.

---

### 8. PHASE 6: Final verification

1. Re-run the complete test suite, lint, type check, and build. Compare with the baseline.
2. Run the main entry points of the project at least once (a smoke test) and confirm they
   start and behave as before.
3. Re-run the unused-code tools after your changes. Removing code often exposes new dead code.
   **Repeat Phases 1 to 3 until a full pass finds nothing new** (maximum three passes), then
   tell me whether another pass is worthwhile.
4. Produce a diff summary: files changed, lines added/removed.
5. List manual tests I should run myself for anything the automated tests do not cover
   (for example a payment flow, a printed document, an email send, a backup button).

---

### 9. SEVERITY RUBRIC (use for every finding)

| Severity | Meaning | Examples |
|---|---|---|
| **CRITICAL** | Data loss, security breach, crash of the main flow, wrong money/legal output, loss of long-run work | SQL injection, `DELETE` with no filter, model never saved, hardcoded production secret |
| **HIGH** | Feature broken or silently wrong, resource exhaustion, race conditions | Missing import hidden by `except: pass`, off-by-one in billing, unclosed connections in a loop |
| **MEDIUM** | Wrong in edge cases, poor error handling, notable performance waste | Unhandled empty result, missing timeout, N+1 queries |
| **LOW** | Minor correctness, maintainability, small waste | Unused variable, duplicate line, dead config |
| **INFO** | Observation, no action needed | Style notes, suggestions |

Order every list by severity, highest first.

---

### 10. DO NOT TOUCH (reminder)

- Everything listed under "must NOT touch" and "public surfaces" in Section 0
- Test files, except to fix a genuinely broken test (and say so)
- Generated files, vendored/third-party code, lock files (unless a finding requires it)
- Database contents, production data, and any live system
- Anything you could not verify

---

### 11. FINAL REPORT FORMAT

Deliver the report in this order:

1. **Executive summary:** 5 to 10 lines. Overall health, the top 5 most dangerous findings,
   and what I must decide.
2. **Tech stack and structure detected**, and which files were reviewed vs. not reviewed.
3. **Baseline vs. final results:** tests, lint, type check, build (a small table).
4. **Phase 1, files removed:** path, evidence.
5. **Phase 2, unused functions (report only):** High/Medium list, Low "needs manual check"
   list, dead call chains, totals.
6. **Phase 3, dead comments, config, and hardcoded logic removed:** file:line, rule applied.
7. **Phase 4, bugs:** table sorted by severity with
   `file:line | severity | category | problem | how it fails | FIXED / REMOVED / REPORTED`.
8. **Phase 5, long-run safety:** what changed, dry-run results for **each stage**, estimated
   runtime, anything that still could lose work.
9. **Security findings** (without secret values), sorted by severity.
10. **Dependency findings:** missing, unused, vulnerable, outdated.
11. **Flagged but NOT changed**, with the reason and a recommended action.
12. **Could not verify:** stated plainly, with what would be needed to verify it.
13. **Manual tests I should run**, and whether a further audit pass is worthwhile.
14. **Commit list** with the test/lint/build result for each commit.

## END OF PROMPT

---

## Quick usage notes

- **Run order for best results:** run the whole prompt once, review the report, merge the
  branch, then run it again. A second pass often finds items exposed by the first.
- **Large projects:** run it one folder or module at a time and say so in Section 0
  ("Review only `api/` this run"). AI tools miss more when the context is huge.
- **Long jobs:** always run Phase 5's dry run before starting a multi-hour job, even after a
  small code change.
- **Pair it with real tools:** the prompt tells the AI to run static analyzers, but run them
  yourself in CI as well so problems are caught continuously.
- **Review the diffs of Phase 4 yourself.** It edits real logic, and tests may not cover
  everything it touches.
- **No prompt can guarantee zero bugs.** This one reduces risk by forcing proof, full-file
  reading, and real end-to-end execution instead of partial checks.
