# Free Stuff @ &lt;School&gt; — template

A school-agnostic, agent-maintained catalog of free student/alumni perks: searchable
list, campus map, scenario guides, and a weekly link verifier. Astro + Supabase,
deploys to Vercel. Dartmouth is the reference implementation shipped in this template.

The one rule the whole project is built on: **a listing only qualifies if a student can
get it without paying money.** See [`docs/quality-guidelines.md`](docs/quality-guidelines.md);
it's enforced by `tests/free-bar.test.ts` and surfaced by `agents/audit_free.py`.

## Bring this to your campus

1. **Use this template** → "Use this template" on GitHub (or clone), giving you your own
   repo. Keeping `upstream` pointed here lets you `git merge upstream/main` to pull engine
   fixes later.
2. **Install and run:** `npm ci && npm run dev` → http://localhost:4321 with the reference
   (Dartmouth) data, so you can see what you're editing.
3. **Make it yours** — edit only the pack files below. Start with `src/site.config.ts`
   (name, brand, categories, scenarios, map center) and `src/content/resources.json`
   (your perks). Localize the body prose in `src/pages/*.astro`. Regenerate the social
   card with `npm run og`.
4. **Verify before you ship:** `npm run test` (catalog + free-bar gate), `npm run typecheck`,
   `npm run build`. The free-bar gate will fail if a paid/discount entry slips in — that's
   the point.
5. **Provision the backend (free tiers):** create a Supabase project and a Vercel project,
   set `PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (+ the public anon key), run the schema
   migration in the Supabase SQL editor, then `npm run seed` to load your catalog.
6. **Deploy:** push to your repo and connect it to Vercel (or `vercel --prod`). Point a
   subdomain at it. Done — your campus has a catalog.

> Note: the catalog renders from Supabase at build time and falls back to
> `resources.json` if the DB is empty/unreachable. After editing the catalog, **re-run
> `npm run seed` and redeploy** or the live site won't reflect your changes.

## Pack files — the entire school-specific surface

Everything else is the shared engine. Full walkthrough: [`recipes/recipe-fork.md`](recipes/recipe-fork.md).

| Pack file | What it controls |
|---|---|
| `src/content/resources.json` | the catalog (source of record) |
| `src/content/building-footprints.json` | campus map polygons |
| `public/tokens.css` `--color-accent` | brand color → also drives the OG card |
| `public/og.png` | social card (generated: `npm run og`) |
| `src/site.config.ts` | name/branding, categories, collections, scenarios, **map center + optional anchor** (`MAP` block) |
| `agents/verify.config.json` | verifier school + domains + UA |
| narrative copy in `src/pages/*.astro` | school-specific body prose (titles already wired to SITE) |

## Generators
- `npm run gen:schema` — regenerate the DB category CHECK from `CATEGORIES`.
- `npm run og` — regenerate `public/og.png` from name + brand color.

## Develop
`npm ci && npm run dev`. Test: `npm run test`. Typecheck: `npm run typecheck`.
