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
