import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CATEGORIES, ELIGIBILITY } from '../src/site.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resources = JSON.parse(
  readFileSync(join(__dirname, '../src/content/resources.json'), 'utf-8')
) as any[];

// Catalog schema contract: every authored entry must satisfy these invariants.
describe('resources.json data integrity', () => {
  it('has at least one resource', () => {
    expect(resources.length).toBeGreaterThan(0);
  });

  it('every entry has the required non-empty fields', () => {
    for (const r of resources) {
      expect(r.id, `id on ${JSON.stringify(r.name)}`).toBeTruthy();
      expect(typeof r.id).toBe('string');
      expect(r.name, `name on ${r.id}`).toBeTruthy();
      expect(r.description, `description on ${r.id}`).toBeTruthy();
      expect(r.link, `link on ${r.id}`).toBeTruthy();
      expect(r.category, `category on ${r.id}`).toBeTruthy();
      expect(r.last_verified, `last_verified on ${r.id}`).toBeTruthy();
      expect(Array.isArray(r.eligibility), `eligibility on ${r.id}`).toBe(true);
      expect(r.eligibility.length, `eligibility on ${r.id}`).toBeGreaterThan(0);
    }
  });

  it('ids, names, and urls are unique', () => {
    const dupes = (arr: string[]) =>
      arr.filter((v, i) => arr.indexOf(v) !== i);
    expect(dupes(resources.map((r) => r.id))).toEqual([]);
    expect(dupes(resources.map((r) => r.name))).toEqual([]);
    expect(dupes(resources.map((r) => r.link))).toEqual([]);
  });

  it('every link is a valid https URL', () => {
    for (const r of resources) {
      let url: URL | undefined;
      expect(() => (url = new URL(r.link)), `link on ${r.id}`).not.toThrow();
      expect(url!.protocol, `protocol on ${r.id}`).toBe('https:');
    }
  });

  it('category and eligibility values are within the configured vocabulary', () => {
    for (const r of resources) {
      expect(CATEGORIES, `category on ${r.id}`).toContain(r.category);
      for (const e of r.eligibility) {
        expect(ELIGIBILITY, `eligibility "${e}" on ${r.id}`).toContain(e);
      }
    }
  });

  it('annual_value is a number or null (never NaN/undefined)', () => {
    for (const r of resources) {
      const v = r.annual_value;
      const ok = v === null || (typeof v === 'number' && Number.isFinite(v));
      expect(ok, `annual_value on ${r.id} is ${v}`).toBe(true);
    }
  });

  it('last_verified is a parseable date', () => {
    for (const r of resources) {
      expect(Number.isNaN(Date.parse(r.last_verified)), `last_verified on ${r.id}`).toBe(false);
    }
  });
});

// Hanover/Upper-Valley bounding box. Any pinned resource must fall inside it.
const HANOVER_BOUNDS = { minLat: 43.69, maxLat: 43.72, minLng: -72.31, maxLng: -72.27 };

describe('resources.json map invariants', () => {
  it('every pinned resource has numeric lat+lng inside the Hanover box and a place', () => {
    for (const r of resources) {
      const hasLat = r.lat !== undefined;
      const hasLng = r.lng !== undefined;
      expect(hasLat, `lat/lng must be paired on ${r.id}`).toBe(hasLng);
      if (!hasLat) continue;
      expect(typeof r.lat, `lat type on ${r.id}`).toBe('number');
      expect(typeof r.lng, `lng type on ${r.id}`).toBe('number');
      expect(r.lat, `lat range on ${r.id}`).toBeGreaterThanOrEqual(HANOVER_BOUNDS.minLat);
      expect(r.lat, `lat range on ${r.id}`).toBeLessThanOrEqual(HANOVER_BOUNDS.maxLat);
      expect(r.lng, `lng range on ${r.id}`).toBeGreaterThanOrEqual(HANOVER_BOUNDS.minLng);
      expect(r.lng, `lng range on ${r.id}`).toBeLessThanOrEqual(HANOVER_BOUNDS.maxLng);
      expect(r.place, `place required on pinned ${r.id}`).toBeTruthy();
    }
  });

  it('each place label maps to exactly one coordinate', () => {
    const coordsByPlace = new Map<string, string>();
    for (const r of resources) {
      if (r.place === undefined || r.lat === undefined) continue;
      const key = `${r.lat},${r.lng}`;
      const seen = coordsByPlace.get(r.place);
      if (seen === undefined) coordsByPlace.set(r.place, key);
      else expect(seen, `place "${r.place}" has conflicting coords on ${r.id}`).toBe(key);
    }
  });

  it('has at least 10 pinned resources (the map is not empty)', () => {
    expect(resources.filter((r) => r.lat !== undefined).length).toBeGreaterThanOrEqual(10);
  });
});
