# Recipe: fork this template for your school

This is a GitHub template. To stand up a site for your school:

1. **Use this template** → create `freestuff-<yourschool>` (your own repo).
2. Create a Supabase project and a Vercel project pointed at the repo.
   Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in Vercel + a local `.env`.
3. Edit the **pack files** (the entire school-specific surface):
   - `src/content/resources.json` — your catalog (the real work; see recipe-schema).
   - `src/content/building-footprints.json` — campus map polygons.
   - `public/tokens.css` `--color-accent` — your brand color (see recipe-colors).
   - `src/site.config.ts` — `SITE`, `MAP` (map center + anchor + copy), categories, collections, scenarios.
   - `agents/verify.config.json` — your school name + domains (see recipe-verifier).
   - The map model lives in `MAP` in `src/site.config.ts` (see recipe-map) — set the
     center, and either keep a single anchor or set `anchor: null` for an urban campus.
   - **Narrative copy to rewrite:** the hero/body prose in `src/pages/about.astro`,
     `for-alumni.astro`, `for-students.astro`, `privacy.astro`, `terms.astro`, and the
     `index.astro` hero contain school-specific wording. Titles, email placeholders, the
     homepage school name, and all map copy are already wired to `SITE`/`MAP`; the body
     paragraphs of those pages are not — rewrite them for your school.
4. Run the generators: `npm run gen:schema` (DB constraint) and `npm run og` (social card).
5. Apply `supabase/schema.sql` in the Supabase SQL editor, then `npm run seed`.
6. `npm run test && npm run typecheck && npm run build`, then deploy.

**Engine updates:** add this template as `upstream` and `git merge upstream/main`.
Pack *content* (resources, tokens, copy) never conflicts because the engine never
edits it. The one exception: when the engine adds a **new `site.config.ts` knob**
(e.g. the `MAP` block was added when the anchor model moved out of `map.astro`), that
line conflicts on merge — keep your value, take the engine's surrounding shape.
**Do not edit engine files in your fork** — if you need an engine change, send it
upstream and merge it down.

**Coupling to know:** `astro.config.mjs` imports `src/site.config.ts`. Don't delete/rename it.
