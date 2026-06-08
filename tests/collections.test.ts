import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CURATED_COLLECTIONS, SCENARIOS } from '../src/site.config';
import { normalizeStaticResource } from '../src/lib/catalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resources = (
  JSON.parse(readFileSync(join(__dirname, '../src/content/resources.json'), 'utf-8')) as any[]
).map(normalizeStaticResource);

// A curated collection or scenario that matches nothing is almost always a
// rename that silently dropped its members (see M2). Fail loudly instead.
describe('curated collections', () => {
  for (const group of CURATED_COLLECTIONS) {
    it(`"${group.label}" matches at least one resource`, () => {
      expect(resources.filter(group.match).length).toBeGreaterThan(0);
    });
  }
});

describe('scenario filters', () => {
  for (const [slug, def] of Object.entries(SCENARIOS)) {
    it(`scenario "${slug}" matches at least one resource`, () => {
      expect(resources.filter(def.match).length).toBeGreaterThan(0);
    });
  }
});
