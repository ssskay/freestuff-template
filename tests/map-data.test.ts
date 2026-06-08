import { describe, it, expect } from 'vitest';
import { buildMapData } from '../src/lib/map-data';
import type { Resource } from '../src/lib/catalog';

function res(partial: Partial<Resource>): Resource {
  return {
    id: 'x', slug: 'x', name: 'X', description: '', url: 'https://e.com',
    category: 'software', eligibility: ['student'], last_verified: '2026-01-01',
    notes: null, source: null, added_at: '2026-01-01', added_by: 'human',
    upvotes: 0, is_active: true, annual_value: null, date_added: null,
    hidden_gem: false, lat: null, lng: null, place: null,
    ...partial,
  } as Resource;
}

describe('buildMapData', () => {
  it('routes resources without coordinates to the Green', () => {
    const data = buildMapData([res({ id: 'm365', name: 'Microsoft 365' })]);
    expect(data.green.map((r) => r.id)).toEqual(['m365']);
    expect(data.places).toEqual([]);
  });

  it('groups co-located resources into a single place pin', () => {
    const data = buildMapData([
      res({ id: 'hop-perf', name: 'Performances', lat: 43.7035, lng: -72.2876, place: 'Hopkins Center' }),
      res({ id: 'hop-wood', name: 'Woodworking', lat: 43.7035, lng: -72.2876, place: 'Hopkins Center' }),
    ]);
    expect(data.places).toHaveLength(1);
    expect(data.places[0].place).toBe('Hopkins Center');
    expect(data.places[0].lat).toBe(43.7035);
    expect(data.places[0].resources.map((r) => r.id)).toEqual(['hop-perf', 'hop-wood']);
  });

  it('keeps distinct places separate and excludes inactive resources', () => {
    const data = buildMapData([
      res({ id: 'gym', name: 'Gym', lat: 43.7022, lng: -72.2885, place: 'Alumni Gym' }),
      res({ id: 'hood', name: 'Hood', lat: 43.7037, lng: -72.2872, place: 'Hood Museum of Art' }),
      res({ id: 'dead', name: 'Dead', is_active: false }),
    ]);
    expect(data.places.map((p) => p.place).sort()).toEqual(['Alumni Gym', 'Hood Museum of Art']);
    expect(data.green).toEqual([]);
  });

  it('emits only the trimmed fields the map needs', () => {
    const data = buildMapData([res({ id: 'm365', name: 'Microsoft 365', annual_value: 70 })]);
    expect(data.green[0]).toEqual({ id: 'm365', name: 'Microsoft 365', category: 'software', url: 'https://e.com', annual_value: 70 });
  });

  it('routes a resource with coordinates but no place to the Green', () => {
    const data = buildMapData([res({ id: 'orphan', name: 'Orphan', lat: 43.7035, lng: -72.2876, place: null })]);
    expect(data.places).toEqual([]);
    expect(data.green.map((r) => r.id)).toEqual(['orphan']);
  });

  it('routes a resource with a place but no coordinates to the Green', () => {
    const data = buildMapData([res({ id: 'noloc', name: 'No Loc', place: 'Hopkins Center' })]);
    expect(data.places).toEqual([]);
    expect(data.green.map((r) => r.id)).toEqual(['noloc']);
  });
});
