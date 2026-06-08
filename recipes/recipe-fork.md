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
   - the map anchor constant `GREEN` in `src/pages/map.astro` (the campus center; rename freely).
4. Run the generators: `npm run gen:schema` (DB constraint) and `npm run og` (social card).
5. Apply `supabase/schema.sql` in the Supabase SQL editor, then `npm run seed`.
6. `npm run test && npm run typecheck && npm run build`, then deploy.

**Engine updates:** add this template as `upstream` and `git merge upstream/main`.
Pack files never conflict because the engine never edits them. **Do not edit engine
files in your fork** — if you need an engine change, send it upstream and merge it down.

**Coupling to know:** `astro.config.mjs` imports `src/site.config.ts`. Don't delete/rename it.
