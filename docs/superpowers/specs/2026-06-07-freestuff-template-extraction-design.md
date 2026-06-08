# Design — `freestuff-template` extraction (mechanical pass)

**Date:** 2026-06-07
**Author:** Construct (Dartmouth → template session)
**Source of truth for context:** `.cx/handoffs/2026-06-06-freestuff-template-extraction.md` (forkability boundary, approach C, risks, do-not-touch).
**Scope:** This session only — stand up the template repo, extract the *mechanical* config, move Dartmouth in as the reference. The CMU build and all *conceptual* abstractions are out of scope (see Deferred).

---

## 1. Goal

Turn the Dartmouth site into a school-agnostic **fork-base template** that reproduces the current Dartmouth site exactly, with every school-specific value confined to a small, documented set of "pack" files. This is the Track B engine: a GitHub *"Use this template"* repo that any school can fork into its own repo + Supabase + Vercel.

Success = the template, built with Dartmouth's content, is byte-for-byte the current site's behavior (40 vitest tests pass, typecheck + build clean, 15 routes render, map shows 12 pins + 10 footprints).

## 2. Composition model — DECIDED: fork-base

The template is a complete, buildable Astro site. Each real school does GitHub *"Use this template"* → its own repo, Supabase, and Vercel; edits only pack files; runs the generators. Engine fixes flow downstream via `git merge upstream/main`.

**Chosen over a monorepo** (`engine/` + `school/<name>/` packs selected at build time) because, against the three stated priorities:

- **Maintenance:** weekly work is content edits (identical in both models); fork-base adds *zero* new build machinery, the monorepo adds a compose step that can itself break.
- **Popularity:** "Use this template" is a self-serve growth loop — the "Fork this for your school" funnel requires it. A monorepo only grows as fast as we personally onboard schools.
- **Reliability:** each school is an isolated failure domain (own Vercel + Supabase + build). A monorepo couples every school's deploy to one repo — one bad engine commit takes down the whole fleet, including the Dartmouth reference.

The handoff's monorepo *structure sketch* is treated as superseded by its own CMU-deployment requirement ("new repo + new Supabase + new Vercel"), which is fork-shaped.

**Accepted cost:** engine-fix propagation is by convention + `merge upstream`, not by structure. Mitigated by the engine/pack partition (§4) — school edits never touch engine files, so engine merges don't conflict. The discipline rule: *engine changes land in the template first, then schools merge down; never fork the engine in a school repo.*

## 3. Where the work lives

- New repo at `/Users/sarakay/freestuff-template` (fresh `git init`; later pushed to `github.com/ssskay/freestuff-template`), seeded from the current Dartmouth repo state.
- **The live `freestuff-dartmouth-v2` repo is NOT touched** — it keeps deploying as-is (handoff DO-NOT-TOUCH).
- The template ships **with Dartmouth's real content** as the worked reference (not a neutral placeholder) — this is how we prove reproduction and keeps "Dartmouth = the clean reference" true inside the template.
- **Open item (do not resolve this session):** Dartmouth content now lives in two repos (the live one and the template's reference copy). Whether to later re-point the live deploy at the template is a future decision; the handoff forbids touching the live deploy now.

## 4. The engine/pack partition (the core deliverable)

A **pack** is the complete, documented set of files a forking school edits. Everything else is **engine** — never school-edited; the surface across which `merge upstream` stays clean.

**Pack files (school-specific):**
1. `src/content/resources.json` — the catalog (source of record).
2. `src/content/building-footprints.json` — map polygons.
3. `public/tokens.css` — only the `--color-accent` value (single branding knob).
4. `public/og.png` — generated artifact (see §5.2).
5. `src/site.config.ts` — the `SITE` block, the category taxonomy (`CATEGORIES` / `CATEGORY_LABELS`), `CURATED_COLLECTIONS`, `SCENARIOS`, `SCENARIO_CARDS`. (Copy stays here this session; data-shape refactor is deferred.)
6. The map anchor constant (`GREEN` in `src/pages/map.astro`) — stays a constant; anchor-model abstraction deferred.
7. `verify.config` — new file holding the verifier's school name, domains, and user-agent (see §5.4).
8. Per-instance plumbing already env/config-driven: `SITE.url`, `package.json` name, `robots.txt` host, Supabase env vars.

**Engine files (never school-edited):** `src/lib/**` (incl. `map-data.ts` — stays generic, not coupled to any school), all `src/components/**`, `src/layouts/**`, the page *structure* in `src/pages/**`, the generator scripts, CI, tests.

Deliverable: a `recipes/` skeleton + a section in `README`/`about` enumerating exactly these pack files, so a forker knows the entire edit surface.

## 5. The four mechanical extractions

### 5.1 Theme — one branding knob
`--color-accent` in `public/tokens.css` is the single source for brand color. The OG generator (§5.2) reads the same value so brand color never drifts between CSS and the social card. No new abstraction beyond documenting it as *the* knob.

### 5.2 OG generator — `scripts/gen-og.mjs`
Replace the hand-made static `public/og.png` with a script that renders a 1200×630 PNG from `SITE.name` + `--color-accent` via headless Chrome and an inline HTML template. Output overwrites `public/og.png`. Runs on demand (`npm run og`), not in the deploy build (keeps the build dependency-light and deterministic). Dependency choice (Playwright vs puppeteer-core vs an already-present headless Chrome) is a plan-level detail; pick the lightest that's reliable on macOS + CI.

### 5.3 SQL CHECK from config — `scripts/gen-schema-check.mjs`
Kill the dual-source drift between `CATEGORIES` (`src/site.config.ts`) and the `category ... check (category in (...))` constraint (`supabase/schema.sql:17-21`). A script reads `CATEGORIES` and writes the constraint list into `schema.sql` between sentinel markers (e.g. `-- <category-check:start>` / `-- <category-check:end>`), so the schema is generated, not hand-edited. `npm run gen:schema` regenerates; document that editing categories means editing `site.config.ts` then running it. This is mechanical only — it does **not** redesign how categories work per-school (that's deferred).

### 5.4 Verifier externalization — `verify.config` + `verify.py`
`agents/verify.py` is Dartmouth-locked in three spots:
- `:22` `USER_AGENT = "Dartmouth-Verifier/1.0 ..."`
- `:107` prompt `... for Dartmouth {eligibility}`
- `:157-163` `domain_map` whitelisting only `*.dartmouth.edu` (so link-recovery silently no-ops for any other school).

Externalize school name, the domain list/map, and the user-agent into a `verify.config` (JSON, co-located with the agent or read from a shared config). `verify.py` reads from it. After this, a fork's link-recovery actually works once they set their domains — before relying on it for CMU.

## 6. Deferred (NOT this session — abstracting against N=1 is the handoff's explicit risk)
- Map **anchor model** redesign — stays an optional constant; let CMU's urban/multi-campus reality force the interface.
- Scenario **copy → data** shape — hero/bullet copy stays hardcoded in the scenario pages.
- Category **taxonomy reshape** (`tuck` → `tepper`) — Dartmouth keeps `tuck`; CMU forces the generalization later.
- Narrative-copy rewrite (`about`, `for-students`, `for-alumni`).
- Curated collections as a reusable shape.

## 7. Do-not-touch (from the handoff)
- `src/lib/map-data.ts` — generic, unit-tested; do not couple to a school.
- The live `freestuff-dartmouth-v2` `main` / its deploy.
- The four traps fixed in `b6d56f4` — do not re-fix.
- `.cx/` telemetry.

## 8. Risks
- **Engine drift across forks** — handled by the §4 partition + the upstream-merge discipline rule. If a school edits an engine file, merges will conflict — that's the signal it should have been a pack file or an upstream change.
- **Over-fitting the map to Dartmouth** — keep the anchor optional; resist re-coupling `map-data.ts`.
- **Two-Dartmouth drift** — the template's reference content can go stale vs the live site; acceptable for a reference, flagged as the §3 open item.
- **`astro.config.mjs` imports `src/site.config.ts`** — a real coupling; a fork that deletes/renames it breaks the build. Document in the recipes.
- **Two consumers ≠ proven product** — post-CMU the template is a *candidate*; school #3 (a paying customer) is the real validation. Cap spend at template + 2 packs + recipes.

## 9. Success criteria (this session's definition of done)
1. `freestuff-template` repo exists, buildable, reproduces the Dartmouth site (tests + typecheck + build pass; routes/map behavior unchanged).
2. The four extractions are in place: theme documented as one knob; `gen-og.mjs` produces `og.png`; `gen-schema-check.mjs` generates the category CHECK; `verify.py` reads `verify.config`.
3. The pack file set is documented (recipes skeleton + edit-surface list).
4. Nothing in the live Dartmouth repo changed; `map-data.ts` uncoupled; deferred items left alone.
