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
| `GREEN` constant in `src/pages/map.astro` | map center |
| narrative copy in `src/pages/*.astro` | school-specific body prose (titles already wired to SITE) |

## Generators
- `npm run gen:schema` — regenerate the DB category CHECK from `CATEGORIES`.
- `npm run og` — regenerate `public/og.png` from name + brand color.

## Develop
`npm ci && npm run dev`. Test: `npm run test`. Typecheck: `npm run typecheck`.
