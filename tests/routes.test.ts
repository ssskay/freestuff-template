import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(__dirname, '../src/pages');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const pageFiles = walk(pagesDir).filter((f) => f.endsWith('.astro'));

/** Does an internal route resolve to a page file? */
function routeExists(route: string): boolean {
  const clean = route.split('?')[0].split('#')[0].replace(/\/$/, '');
  if (clean === '' || clean === '/') return existsSync(join(pagesDir, 'index.astro'));
  const rel = clean.replace(/^\//, '');
  return (
    existsSync(join(pagesDir, `${rel}.astro`)) ||
    existsSync(join(pagesDir, rel, 'index.astro'))
  );
}

// Collect every internal href across all pages.
const hrefRe = /href=["'](\/[^"'#?][^"']*)["']/g;
const internalLinks: { route: string; file: string }[] = [];
for (const file of pageFiles) {
  const src = readFileSync(file, 'utf-8');
  for (const m of src.matchAll(hrefRe)) {
    internalLinks.push({ route: m[1], file: relative(pagesDir, file) });
  }
}

describe('internal links resolve to real pages', () => {
  it('found internal links to check', () => {
    expect(internalLinks.length).toBeGreaterThan(0);
  });

  it('every internal href points to an existing route (catches /scenarios-class 404s)', () => {
    const broken = internalLinks.filter((l) => !routeExists(l.route));
    expect(broken, `broken links: ${JSON.stringify(broken, null, 2)}`).toEqual([]);
  });

  it('the /scenarios hub page exists', () => {
    expect(routeExists('/scenarios')).toBe(true);
  });
});

describe('/map page', () => {
  it('the /map route exists', () => {
    expect(routeExists('/map')).toBe(true);
  });

  it('renders a config-driven hero and inline map data + config blobs', () => {
    const src = readFileSync(join(pagesDir, 'map.astro'), 'utf-8');
    // Hero copy and the anchor model are school config (MAP.*), not hardcoded here.
    expect(src).toContain('MAP.title');
    expect(src).toContain('id="map-data"');
    expect(src).toContain('id="map-config"');
  });
});
