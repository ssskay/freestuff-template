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

/** Matches the marker-bounded category block (markers included), with leading indent. */
export const CATEGORY_CHECK_RE = new RegExp(`[ \\t]*${START}[\\s\\S]*?${END}`);

/**
 * Render the marker-bounded SQL block (markers included), indented to match the
 * two-space column context inside the `create table` body.
 *
 * NOTE: category values must be simple kebab-case slugs (no single quotes) —
 * they are interpolated into SQL without escaping.
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
  if (!CATEGORY_CHECK_RE.test(schema)) throw new Error('category-check markers not found in schema.sql');
  const next = schema.replace(CATEGORY_CHECK_RE, renderCategoryCheck([...CATEGORIES]));
  writeFileSync(schemaPath, next);
  console.log(`gen:schema — wrote ${CATEGORIES.length} categories into ${schemaPath}`);
}

// Run main() only when executed directly, not when imported by the test.
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
