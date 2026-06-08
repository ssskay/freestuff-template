import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../../src/site.config';
import { renderCategoryCheck, CATEGORY_CHECK_RE } from '../../scripts/gen-schema-check.mts';

const schemaPath = fileURLToPath(new URL('../../supabase/schema.sql', import.meta.url));

describe('gen-schema-check', () => {
  it('renders a CHECK block listing exactly the config CATEGORIES', () => {
    const block = renderCategoryCheck([...CATEGORIES]);
    for (const cat of CATEGORIES) expect(block).toContain(`'${cat}'`);
    const quoted = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect(new Set(quoted)).toEqual(new Set(CATEGORIES));
  });

  it('the committed schema.sql matches the generated block (no drift)', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const match = schema.match(CATEGORY_CHECK_RE);
    expect(match, 'category-check markers not found in schema.sql').not.toBeNull();
    const current = match![0];
    expect(current.trimEnd()).toBe(renderCategoryCheck([...CATEGORIES]).trimEnd());
  });
});
