# freestuff-template Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a fork-base `freestuff-template` repo that reproduces the current Dartmouth site, with the four mechanical extractions (SQL CHECK-from-config, brand-color generator helper, OG generator, verifier externalization) in place and every school-specific value confined to a documented pack-file set.

**Architecture:** Copy the buildable Dartmouth site into a new repo at `/Users/sarakay/freestuff-template` (live Dartmouth repo untouched). Add small, on-demand generator scripts (run via `tsx`) that derive the SQL category constraint, the social card, and read the verifier's school config from a single source. No build-time machinery, no browser — generators run on demand; the deploy build is unchanged. Dartmouth's content stays in as the worked reference.

**Tech Stack:** Astro 5, TypeScript, vitest, `sharp` (PNG render, already in tree), `tsx` (run TS scripts from node), Python 3 (verifier).

**Spec:** `docs/superpowers/specs/2026-06-07-freestuff-template-extraction-design.md`. **Context:** `.cx/handoffs/2026-06-06-freestuff-template-extraction.md`.

> **Working directory:** Task 0 creates `/Users/sarakay/freestuff-template`. **Every task from Task 1 onward runs inside that new repo**, not the Dartmouth repo. All paths below are relative to the new repo unless prefixed with `DARTMOUTH:`.

---

## File Structure (what gets created/modified in the template repo)

| Path | Responsibility |
|---|---|
| `scripts/lib/oklch-to-hex.mts` | Pure helper: convert an `oklch(...)` string to an sRGB `#rrggbb` hex. Used by the OG generator so the brand color stays single-sourced in `tokens.css`. |
| `scripts/gen-schema-check.mts` | Read `CATEGORIES` from `src/site.config.ts`; rewrite the category `CHECK` block in `supabase/schema.sql` between sentinel markers. Kills the dual-source drift. |
| `scripts/gen-og.mts` | Read `SITE.name` (config) + `--color-accent` (tokens.css); render a 1200×630 `public/og.png` via an SVG → `sharp`. |
| `agents/verify.config.json` | Single source for the verifier's school name, link-recovery domains, and user-agent. |
| `agents/verify.py` | Modified to read `verify.config.json` instead of hardcoded Dartmouth values. |
| `supabase/schema.sql` | Category `CHECK` wrapped in sentinel markers; becomes generated, not hand-edited. |
| `src/site.config.ts` | Unchanged values; gains a header comment documenting the pack-file edit surface. |
| `recipes/` | `recipe-fork.md`, `recipe-colors.md`, `recipe-og.md`, `recipe-schema.md`, `recipe-verifier.md` — the edit-surface docs. |
| `README.md` | Rewritten as the template's front door (what it is, the pack-file list, how to fork). |
| `tests/gen/*.test.ts` | Vitest coverage for the generators and the color helper. |
| `agents/test_verify_config.py` | Pytest coverage for the verifier config loader. |

---

## Task 0: Seed the template repo and establish the reproduction baseline

**Files:**
- Create: `/Users/sarakay/freestuff-template/` (new git repo, seeded from the Dartmouth working tree)

- [ ] **Step 1: Create the new repo directory and copy only the site + tooling we want**

Run (from anywhere):

```bash
SRC=/Users/sarakay/freestuff-dartmouth-v2
DST=/Users/sarakay/freestuff-template
mkdir -p "$DST"
# Copy the buildable site, CI, agents, scripts, supabase, tests — NOT secrets, caches, or tooling.
rsync -a \
  --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude '.astro' \
  --exclude '.cx' --exclude '.construct' --exclude '.beads' --exclude '.hallmark' \
  --exclude '.claude' --exclude '.codex' --exclude '.cursor' --exclude '.opencode' --exclude '.vscode' \
  --exclude '.env' --exclude '.DS_Store' --exclude 'test-supabase.js' \
  --exclude 'CHANGELOG.md' --exclude 'DEPLOYMENT.md' --exclude 'QUICKSTART.md' \
  --exclude 'SETUP.md' --exclude 'construct_guide.md' --exclude 'plan.md' \
  --exclude 'verification-report.md' --exclude 'AGENTS.md' --exclude 'docs' \
  "$SRC/" "$DST/"
mkdir -p "$DST/docs/superpowers/specs" "$DST/docs/superpowers/plans"
cp "$SRC/docs/superpowers/specs/2026-06-07-freestuff-template-extraction-design.md" "$DST/docs/superpowers/specs/"
cp "$SRC/docs/superpowers/plans/2026-06-07-freestuff-template-extraction.md" "$DST/docs/superpowers/plans/"
```

Expected: `$DST` contains `src/ public/ supabase/ agents/ scripts/ tests/ .github/ astro.config.mjs package.json package-lock.json tsconfig.json vitest.config.ts vercel.json tailwind.config.mjs .gitignore README.md` and the two `docs/superpowers/*` files. It does **not** contain `.env`, `.cx`, `node_modules`, or the Dartmouth narrative docs.

- [ ] **Step 2: Initialise git and install dependencies in the new repo**

Run:

```bash
cd /Users/sarakay/freestuff-template
git init -q && npm ci
```

Expected: `npm ci` completes; `node_modules/` populated.

- [ ] **Step 3: Verify the seeded repo reproduces the site (baseline must be green BEFORE any extraction)**

Run:

```bash
cd /Users/sarakay/freestuff-template
npm run test && npm run typecheck && npm run build
```

Expected: 40 vitest tests PASS; `astro check` reports 0 errors; `astro build` completes and writes `dist/` with the route set. If any of these fail, STOP — the seed is wrong; fix the copy before proceeding. This green result is the "reproduces the current site" baseline we protect through every later task.

- [ ] **Step 4: Add `tsx` and pin `sharp` as explicit devDependencies (generators need them directly)**

Run:

```bash
cd /Users/sarakay/freestuff-template
npm install -D tsx sharp
```

Expected: `package.json` devDependencies now list `tsx` and `sharp` (sharp was only transitive before; the generator depends on it directly).

- [ ] **Step 5: Commit the baseline**

```bash
cd /Users/sarakay/freestuff-template
git add -A
git commit -q -m "Seed freestuff-template from Dartmouth (reproduction baseline)

Buildable site + CI + agents + scripts + supabase + tests, copied from the
Dartmouth working tree minus secrets, caches, editor/agent tooling, and
Dartmouth-specific narrative docs. Tests + typecheck + build green.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 1: SQL CHECK generated from config

**Files:**
- Modify: `supabase/schema.sql:17-21` (wrap the category list in sentinel markers)
- Create: `scripts/gen-schema-check.mts`
- Create: `tests/gen/schema-check.test.ts`
- Modify: `package.json` (add `gen:schema` script)

- [ ] **Step 1: Add sentinel markers around the category list in `schema.sql`**

Change `supabase/schema.sql` lines 17-21 from:

```sql
  category text not null check (category in (
    'software', 'news', 'library', 'outdoor', 'money', 'health',
    'career', 'campus-life', 'alumni-only', 'tuck', 'transportation',
    'off-campus'
  )),
```

to:

```sql
  -- <category-check:start> GENERATED from CATEGORIES in src/site.config.ts — run `npm run gen:schema`
  category text not null check (category in (
    'software', 'news', 'library', 'outdoor', 'money', 'health',
    'career', 'campus-life', 'alumni-only', 'tuck', 'transportation',
    'off-campus'
  )),
  -- <category-check:end>
```

- [ ] **Step 2: Write the failing test**

Create `tests/gen/schema-check.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../../src/site.config';
import { renderCategoryCheck } from '../../scripts/gen-schema-check.mts';

const schemaPath = fileURLToPath(new URL('../../supabase/schema.sql', import.meta.url));

describe('gen-schema-check', () => {
  it('renders a CHECK block listing exactly the config CATEGORIES', () => {
    const block = renderCategoryCheck([...CATEGORIES]);
    for (const cat of CATEGORIES) expect(block).toContain(`'${cat}'`);
    // No category in the block that is not in config:
    const quoted = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect(new Set(quoted)).toEqual(new Set(CATEGORIES));
  });

  it('the committed schema.sql matches the generated block (no drift)', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const re = /[ \t]*-- <category-check:start>[\s\S]*?-- <category-check:end>/;
    const current = schema.match(re)![0];
    expect(current.trimEnd()).toBe(renderCategoryCheck([...CATEGORIES]).trimEnd());
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/sarakay/freestuff-template && npx vitest run tests/gen/schema-check.test.ts`
Expected: FAIL — `scripts/gen-schema-check.mts` has no export `renderCategoryCheck`.

- [ ] **Step 4: Write the generator**

Create `scripts/gen-schema-check.mts`:

```ts
/**
 * Generate the resources.category CHECK constraint in supabase/schema.sql from
 * the CATEGORIES list in src/site.config.ts. Single source: edit CATEGORIES,
 * then run `npm run gen:schema`. Run via tsx so it can import the TS config.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../src/site.config.ts';

const START = '-- <category-check:start>';
const END = '-- <category-check:end>';

/**
 * Render the marker-bounded SQL block (markers included), indented to match the
 * two-space column context inside the `create table` body.
 */
export function renderCategoryCheck(categories: string[]): string {
  const quoted = categories.map((c) => `'${c}'`).join(', ');
  return [
    `  ${START} GENERATED from CATEGORIES in src/site.config.ts — run \`npm run gen:schema\``,
    `  category text not null check (category in (`,
    `    ${quoted}`,
    `  )),`,
    `  ${END}`,
  ].join('\n');
}

function main(): void {
  const schemaPath = fileURLToPath(new URL('../supabase/schema.sql', import.meta.url));
  const schema = readFileSync(schemaPath, 'utf8');
  const re = /[ \t]*-- <category-check:start>[\s\S]*?-- <category-check:end>/;
  if (!re.test(schema)) throw new Error('category-check markers not found in schema.sql');
  const next = schema.replace(re, renderCategoryCheck([...CATEGORIES]));
  writeFileSync(schemaPath, next);
  console.log(`gen:schema — wrote ${CATEGORIES.length} categories into ${schemaPath}`);
}

// Run main() only when executed directly, not when imported by the test.
if (process.argv[1] && process.argv[1].endsWith('gen-schema-check.mts')) main();
```

> Note on indentation: keep `renderCategoryCheck` output aligned to the surrounding two-space SQL column indent. After writing, Step 6 regenerates the file so the committed schema is exactly what the generator emits — the test's "no drift" assertion is the guard.

- [ ] **Step 5: Add the npm script**

In `package.json` `scripts`, add:

```json
    "gen:schema": "tsx scripts/gen-schema-check.mts",
```

- [ ] **Step 6: Run the generator, then run tests to verify they pass**

Run:

```bash
cd /Users/sarakay/freestuff-template
npm run gen:schema
npx vitest run tests/gen/schema-check.test.ts
```

Expected: generator prints `wrote 12 categories`; both tests PASS. If the "no drift" test fails, the committed block and generator output differ — inspect `schema.sql` and align `renderCategoryCheck`'s indentation, regenerate, re-run.

- [ ] **Step 7: Confirm the full suite + build still green, then commit**

```bash
cd /Users/sarakay/freestuff-template
npm run test && npm run build
git add scripts/gen-schema-check.mts tests/gen/schema-check.test.ts supabase/schema.sql package.json
git commit -q -m "Generate SQL category CHECK from config (kill dual-source drift)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

Expected: 42 tests PASS (40 + 2 new); build green.

---

## Task 2: Brand-color helper (`oklch` → hex), so OG stays single-sourced on `tokens.css`

**Files:**
- Create: `scripts/lib/oklch-to-hex.mts`
- Create: `tests/gen/oklch-to-hex.test.ts`

Why: `public/tokens.css` defines the brand color as `--color-accent: oklch(39% 0.11 155)`. `sharp`'s SVG renderer does not understand `oklch()`, so the OG generator must convert it to an sRGB hex. Keeping this a pure, tested helper lets the brand color stay single-sourced in `tokens.css` (no second color constant).

- [ ] **Step 1: Write the failing test**

Create `tests/gen/oklch-to-hex.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { oklchToHex } from '../../scripts/lib/oklch-to-hex.mts';

describe('oklchToHex', () => {
  it('converts Dartmouth green oklch to its documented sRGB hex', () => {
    // tokens.css: oklch(39% 0.11 155) is the wide-gamut form of #00693E.
    expect(oklchToHex('oklch(39% 0.11 155)').toLowerCase()).toBe('#00693e');
  });

  it('clamps out-of-gamut values to valid #rrggbb', () => {
    const hex = oklchToHex('oklch(50% 0.37 30)'); // beyond sRGB
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('parses percent and unitless lightness equivalently', () => {
    expect(oklchToHex('oklch(0.39 0.11 155)').toLowerCase()).toBe(
      oklchToHex('oklch(39% 0.11 155)').toLowerCase()
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/sarakay/freestuff-template && npx vitest run tests/gen/oklch-to-hex.test.ts`
Expected: FAIL — module/export missing.

- [ ] **Step 3: Implement the converter (OKLCH → OKLab → linear sRGB → gamma sRGB, clamped)**

Create `scripts/lib/oklch-to-hex.mts`:

```ts
/**
 * Convert a CSS `oklch(L C H)` string to an sRGB `#rrggbb` hex.
 * L accepts `39%` or `0.39`; C is unitless; H is degrees.
 * Pure, dependency-free — implements the OKLab→linear-sRGB matrix (Björn Ottosson).
 */
export function oklchToHex(input: string): string {
  const m = input.trim().match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
  if (!m) throw new Error(`Not an oklch() string: ${input}`);
  const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const Hdeg = parseFloat(m[3]);
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab -> LMS (cube of l'm's')
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3;

  // LMS -> linear sRGB
  const lr = +4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;

  const toGamma = (x: number): number => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  const hx = (x: number): string =>
    Math.round(toGamma(x) * 255).toString(16).padStart(2, '0');
  return `#${hx(lr)}${hx(lg)}${hx(lb)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/sarakay/freestuff-template && npx vitest run tests/gen/oklch-to-hex.test.ts`
Expected: PASS. If the green assertion is off by ±1 in a channel, the math rounding differs slightly — adjust the test to `#00693e`/`#00693d` tolerance only if the conversion is provably correct; prefer fixing rounding to hit the documented `#00693e`.

- [ ] **Step 5: Commit**

```bash
cd /Users/sarakay/freestuff-template
git add scripts/lib/oklch-to-hex.mts tests/gen/oklch-to-hex.test.ts
git commit -q -m "Add oklch->hex helper for the OG generator (brand color single-sourced)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: OG image generator

**Files:**
- Create: `scripts/gen-og.mts`
- Create: `tests/gen/og.test.ts`
- Modify: `package.json` (add `og` script)
- Modify (overwrite, generated): `public/og.png`

- [ ] **Step 1: Write the failing test**

Create `tests/gen/og.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderOgSvg } from '../../scripts/gen-og.mts';
import sharp from 'sharp';

describe('gen-og', () => {
  it('renders an SVG that includes the school name and a hex fill', () => {
    const svg = renderOgSvg({ name: 'Free Stuff @ Dartmouth', accentHex: '#00693e' });
    expect(svg).toContain('Free Stuff @ Dartmouth');
    expect(svg).toContain('#00693e');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it('sharp rasterises the SVG to a 1200x630 PNG', async () => {
    const svg = renderOgSvg({ name: 'Free Stuff @ Dartmouth', accentHex: '#00693e' });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/sarakay/freestuff-template && npx vitest run tests/gen/og.test.ts`
Expected: FAIL — `renderOgSvg` not exported.

- [ ] **Step 3: Write the generator**

Create `scripts/gen-og.mts`:

```ts
/**
 * Generate public/og.png (1200x630) from SITE.name and the brand color in
 * public/tokens.css. On-demand only (`npm run og`); not part of the deploy build.
 * Run via tsx so it can import the TS config.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SITE } from '../src/site.config.ts';
import { oklchToHex } from './lib/oklch-to-hex.mts';

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!)
  );
}

/** Read --color-accent from tokens.css and normalise to an sRGB hex. */
export function accentHexFromTokens(css: string): string {
  const m = css.match(/--color-accent:\s*([^;]+);/);
  if (!m) throw new Error('--color-accent not found in tokens.css');
  const val = m[1].trim();
  return val.startsWith('oklch') ? oklchToHex(val) : val;
}

export function renderOgSvg(opts: { name: string; accentHex: string }): string {
  const name = escapeXml(opts.name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${opts.accentHex}"/>
  <rect x="0" y="0" width="1200" height="12" fill="#ffffff" opacity="0.25"/>
  <text x="80" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="84" font-weight="700" fill="#ffffff">${name}</text>
  <text x="80" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="#ffffff" opacity="0.85">Your complete catalog of free perks</text>
</svg>`;
}

async function main(): Promise<void> {
  const tokensPath = fileURLToPath(new URL('../public/tokens.css', import.meta.url));
  const outPath = fileURLToPath(new URL('../public/og.png', import.meta.url));
  const accentHex = accentHexFromTokens(readFileSync(tokensPath, 'utf8'));
  const svg = renderOgSvg({ name: SITE.name, accentHex });
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`og — wrote ${outPath} (${SITE.name}, ${accentHex})`);
}

if (process.argv[1] && process.argv[1].endsWith('gen-og.mts')) main();
```

> The tagline is intentionally static copy here; if a school changes `SITE.tagline`, swap the second `<text>` to `escapeXml(SITE.tagline)` — left literal now to avoid coupling OG to an unproven config field at N=1.

- [ ] **Step 4: Add the npm script**

In `package.json` `scripts`, add:

```json
    "og": "tsx scripts/gen-og.mts",
```

- [ ] **Step 5: Run the test to verify it passes, then regenerate the real card**

Run:

```bash
cd /Users/sarakay/freestuff-template
npx vitest run tests/gen/og.test.ts
npm run og
```

Expected: both tests PASS; `npm run og` overwrites `public/og.png` and prints the name + `#00693e`. Open `public/og.png` and eyeball it: green field, white wordmark, 1200×630.

- [ ] **Step 6: Confirm suite + build, then commit**

```bash
cd /Users/sarakay/freestuff-template
npm run test && npm run build
git add scripts/gen-og.mts tests/gen/og.test.ts package.json public/og.png
git commit -q -m "Add OG generator (SVG -> sharp), brand color read from tokens.css

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

Expected: 47 tests PASS (42 + 2 og + 3 oklch already counted in Task 2 → adjust mentally; the gate is simply 'all green').

---

## Task 4: Externalise the verifier's school/domains/user-agent

**Files:**
- Create: `agents/verify.config.json`
- Modify: `agents/verify.py` (`:22` USER_AGENT, `:107` prompt, `:157-163` domain_map)
- Create: `agents/test_verify_config.py`
- Modify: `agents/requirements.txt` (ensure `pytest`)

- [ ] **Step 1: Create the config file**

Create `agents/verify.config.json`:

```json
{
  "school": "Dartmouth",
  "user_agent": "Dartmouth-Verifier/1.0 (freestuff-dartmouth; link verification)",
  "recovery_domains": [
    "library.dartmouth.edu",
    "services.dartmouth.edu",
    "alumni.dartmouth.edu",
    "outdoors.dartmouth.edu",
    "students.dartmouth.edu"
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `agents/test_verify_config.py`:

```python
import importlib

verify = importlib.import_module("verify")


def test_config_loads_school_and_domains():
    cfg = verify.load_config()
    assert cfg["school"] == "Dartmouth"
    assert "library.dartmouth.edu" in cfg["recovery_domains"]


def test_domain_map_is_built_from_config():
    cfg = verify.load_config()
    dm = verify.build_domain_map(cfg)
    # Identity map keyed by each recovery domain.
    for d in cfg["recovery_domains"]:
        assert dm[d] == d


def test_user_agent_comes_from_config():
    cfg = verify.load_config()
    assert cfg["user_agent"].startswith("Dartmouth-Verifier/")
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/sarakay/freestuff-template/agents && python -m pytest test_verify_config.py -v`
Expected: FAIL — `verify` has no `load_config` / `build_domain_map` (install pytest first if missing: `pip install -r requirements.txt`).

- [ ] **Step 4: Add the loader and refactor the three hardcoded spots in `verify.py`**

Near the top of `agents/verify.py` (replacing the `USER_AGENT` constant at `:22`), add:

```python
import json
import os

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "verify.config.json")


def load_config():
    """School-specific config (name, domains, UA). The single fork seam for the verifier."""
    with open(_CONFIG_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def build_domain_map(cfg):
    """Identity map of recovery domains; replaces the hardcoded Dartmouth whitelist."""
    return {d: d for d in cfg["recovery_domains"]}


_CONFIG = load_config()
USER_AGENT = _CONFIG["user_agent"]
SCHOOL = _CONFIG["school"]
```

At `:107`, change the prompt line from:

```python
- Expected content: A page about "{resource['name']}" for Dartmouth {', '.join(resource['eligibility'])}
```

to:

```python
- Expected content: A page about "{resource['name']}" for {SCHOOL} {', '.join(resource['eligibility'])}
```

At `:157-163`, replace the hardcoded `domain_map = { ... }` literal with:

```python
    domain_map = build_domain_map(_CONFIG)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/sarakay/freestuff-template/agents && python -m pytest test_verify_config.py -v`
Expected: 3 tests PASS.

- [ ] **Step 6: Smoke-check the module still imports and the JS suite is unaffected**

Run:

```bash
cd /Users/sarakay/freestuff-template/agents && python -c "import verify; print(verify.SCHOOL, verify.USER_AGENT)"
cd /Users/sarakay/freestuff-template && npm run test
```

Expected: prints `Dartmouth Dartmouth-Verifier/1.0 ...`; vitest suite still green (unchanged).

- [ ] **Step 7: Ensure pytest is declared, then commit**

If `pytest` is not already in `agents/requirements.txt`, append it:

```
pytest>=8
```

Then:

```bash
cd /Users/sarakay/freestuff-template
git add agents/verify.config.json agents/verify.py agents/test_verify_config.py agents/requirements.txt
git commit -q -m "Externalise verifier school/domains/UA into verify.config.json

Link-recovery now works for any fork that sets its domains, instead of
silently no-opping outside *.dartmouth.edu.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Document the pack-file edit surface (recipes + README)

**Files:**
- Create: `recipes/recipe-fork.md`, `recipes/recipe-colors.md`, `recipes/recipe-og.md`, `recipes/recipe-schema.md`, `recipes/recipe-verifier.md`
- Modify: `README.md` (rewrite as the template front door)
- Modify: `src/site.config.ts` (header comment listing the pack files)

- [ ] **Step 1: Write the recipes**

Create `recipes/recipe-fork.md`:

```markdown
# Recipe: fork this template for your school

This is a GitHub template. To stand up a site for your school:

1. **Use this template** → create `freestuff-<yourschool>` (your own repo).
2. Create a Supabase project and a Vercel project pointed at the repo.
   Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in Vercel + a local `.env`.
3. Edit the **pack files** (the entire school-specific surface):
   - `src/content/resources.json` — your catalog (the real work; see recipe-schema).
   - `src/content/building-footprints.json` — campus map polygons.
   - `public/tokens.css` `--color-accent` — your brand color (see recipe-colors).
   - `src/site.config.ts` — `SITE`, categories, collections, scenarios.
   - `agents/verify.config.json` — your school name + domains (see recipe-verifier).
   - the map anchor constant in `src/pages/map.astro`.
4. Run the generators: `npm run gen:schema` (DB constraint) and `npm run og` (social card).
5. Apply `supabase/schema.sql` in the Supabase SQL editor, then `npm run seed`.
6. `npm run test && npm run typecheck && npm run build`, then deploy.

**Engine updates:** add this template as `upstream` and `git merge upstream/main`.
Pack files never conflict because the engine never edits them. **Do not edit engine
files in your fork** — if you need an engine change, send it upstream and merge it down.

**Coupling to know:** `astro.config.mjs` imports `src/site.config.ts`. Don't delete/rename it.
```

Create `recipes/recipe-colors.md`:

```markdown
# Recipe: brand color

The brand color is single-sourced: `--color-accent` in `public/tokens.css`.
It may be any CSS color. If you use `oklch(...)`, the OG generator converts it to
sRGB automatically (`scripts/lib/oklch-to-hex.mts`). After changing it, run
`npm run og` to regenerate the social card so it matches.
```

Create `recipes/recipe-og.md`:

```markdown
# Recipe: social (OG) image

`public/og.png` (1200×630) is generated, not hand-made.
Run `npm run og`. It reads `SITE.name` from `src/site.config.ts` and the brand
color from `public/tokens.css`, renders an SVG, and rasterises it with sharp.
To restyle the card, edit `renderOgSvg` in `scripts/gen-og.mts`.
```

Create `recipes/recipe-schema.md`:

```markdown
# Recipe: categories + database schema

Categories live in **one** place: `CATEGORIES` in `src/site.config.ts`.
The `category` CHECK constraint in `supabase/schema.sql` is generated from it —
never hand-edit the block between `-- <category-check:start>` and `:end>`.
After changing `CATEGORIES`, run `npm run gen:schema`, then re-apply the schema
in Supabase. The `schema-check` test fails if the file drifts from the config.
```

Create `recipes/recipe-verifier.md`:

```markdown
# Recipe: the link verifier

The weekly verifier (`agents/verify.py`) reads `agents/verify.config.json`:
- `school` — used in the verification prompt.
- `recovery_domains` — link-recovery only searches these; **set yours or recovery no-ops.**
- `user_agent` — sent on verification requests.

Needs `ANTHROPIC_API_KEY` as a GitHub secret to run in CI; it skips cleanly without one.
```

- [ ] **Step 2: Rewrite `README.md` as the template front door**

Replace `README.md` with:

```markdown
# Free Stuff @ <School> — template

A school-agnostic, agent-maintained catalog of free student/alumni perks: searchable
list, campus map, scenario guides, and a weekly link verifier. Astro + Supabase,
deploys to Vercel. Dartmouth is the reference implementation shipped in this template.

## Fork it for your school
See [`recipes/recipe-fork.md`](recipes/recipe-fork.md). The entire school-specific
surface is a small set of **pack files**; everything else is the shared engine.

| Pack file | What it controls |
|---|---|
| `src/content/resources.json` | the catalog (source of record) |
| `src/content/building-footprints.json` | campus map polygons |
| `public/tokens.css` `--color-accent` | brand color → also drives the OG card |
| `public/og.png` | social card (generated: `npm run og`) |
| `src/site.config.ts` | name/branding, categories, collections, scenarios |
| `agents/verify.config.json` | verifier school + domains + UA |
| anchor constant in `src/pages/map.astro` | map center |

## Generators
- `npm run gen:schema` — regenerate the DB category CHECK from `CATEGORIES`.
- `npm run og` — regenerate `public/og.png` from name + brand color.

## Develop
`npm ci && npm run dev`. Test: `npm run test`. Typecheck: `npm run typecheck`.
```

- [ ] **Step 3: Add the pack-file pointer comment to `site.config.ts`**

At the top of `src/site.config.ts`, immediately after the existing module docstring (before the `import`), add:

```ts
/**
 * PACK FILES (the full per-school edit surface — see recipes/recipe-fork.md):
 *   src/content/resources.json, src/content/building-footprints.json,
 *   public/tokens.css (--color-accent), public/og.png (generated),
 *   this file (SITE + taxonomy + collections + scenarios),
 *   agents/verify.config.json, and the anchor constant in src/pages/map.astro.
 * Everything else is shared engine — do not edit it in a fork; send changes upstream.
 */
```

- [ ] **Step 4: Verify build still green (docs/comment changes are non-breaking), then commit**

```bash
cd /Users/sarakay/freestuff-template
npm run typecheck && npm run build
git add recipes README.md src/site.config.ts
git commit -q -m "Document the pack-file edit surface (recipes + README + config header)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Final reproduction verification

**Files:** none (verification only)

- [ ] **Step 1: Full green gate from a clean install**

Run:

```bash
cd /Users/sarakay/freestuff-template
rm -rf node_modules dist .astro
npm ci
npm run test && npm run typecheck && npm run build
```

Expected: all generator + helper + existing tests PASS; `astro check` 0 errors; build writes the full route set to `dist/`. This proves the template reproduces the Dartmouth site from a cold checkout.

- [ ] **Step 2: Confirm the live Dartmouth repo was never touched**

Run:

```bash
cd /Users/sarakay/freestuff-dartmouth-v2 && git status --short && git log --oneline -1
```

Expected: only the spec/plan docs from the brainstorming session appear (already committed); no engine/site changes. The live repo's `main` is intact.

- [ ] **Step 3: Confirm the deferred items were left alone**

Manually verify (no code change expected):
- `src/lib/map-data.ts` is byte-identical to the Dartmouth copy (not coupled to a school).
- Scenario page copy in `src/pages/scenarios/*.astro` is unchanged (no copy→data refactor).
- `CATEGORIES` still contains `tuck` (no `tuck`→`tepper` reshape).

Run: `diff /Users/sarakay/freestuff-dartmouth-v2/src/lib/map-data.ts /Users/sarakay/freestuff-template/src/lib/map-data.ts && echo "map-data identical"`
Expected: `map-data identical`.

- [ ] **Step 4: Tag the reproduction milestone**

```bash
cd /Users/sarakay/freestuff-template
git tag -a v0.1.0-template -m "Mechanical extraction complete; reproduces Dartmouth site"
git log --oneline
```

Expected: a clean commit history (baseline → schema → oklch → og → verifier → recipes) and the tag.

---

## Done criteria (maps to spec §9)
1. `freestuff-template` exists, builds cold, reproduces the site (Task 0 + Task 6).
2. Four extractions in place: SQL CHECK-from-config (Task 1), brand-color helper + OG generator (Tasks 2–3), verifier externalization (Task 4).
3. Pack file set documented (Task 5).
4. Live Dartmouth repo untouched; `map-data.ts` uncoupled; deferred items left alone (Task 6).

## Out of scope (defer to the CMU pass — spec §6)
Map anchor-model redesign, scenario copy→data, `tuck`→`tepper` taxonomy reshape, narrative-copy rewrite, curated-collections reshape, and the actual CMU pack + its new Supabase/Vercel.
