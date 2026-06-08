import { describe, it, expect } from 'vitest';
import { normalizeStaticResource } from '../src/lib/catalog';

const base = {
  id: 'microsoft-365',
  name: 'Microsoft 365 (Office)',
  category: 'software',
  description: 'Full Office suite.',
  link: 'https://example.com/m365',
  eligibility: ['student', 'faculty'],
  source: 'services.dartmouth.edu',
  last_verified: '2026-05-27',
  status: 'active',
  notes: 'note',
  added_by: 'human',
  annual_value: 70,
  date_added: '2025-09-01',
};

describe('normalizeStaticResource', () => {
  it('exposes the slug as the stable id (C2)', () => {
    expect(normalizeStaticResource(base).id).toBe('microsoft-365');
  });

  it('maps link -> url', () => {
    expect(normalizeStaticResource(base).url).toBe('https://example.com/m365');
  });

  it('produces a valid Resource shape for the UI', () => {
    const r = normalizeStaticResource(base);
    expect(r.upvotes).toBe(0);
    expect(r.is_active).toBe(true);
    expect(r.hidden_gem).toBe(false);
    expect(r.annual_value).toBe(70);
  });

  it('treats a missing annual_value as null, not NaN', () => {
    const r = normalizeStaticResource({ ...base, annual_value: undefined });
    expect(r.annual_value).toBeNull();
  });

  it('hides only broken/inactive; needs_review stays visible (L4)', () => {
    expect(normalizeStaticResource({ ...base, status: 'broken' }).is_active).toBe(false);
    expect(normalizeStaticResource({ ...base, status: 'inactive' }).is_active).toBe(false);
    expect(normalizeStaticResource({ ...base, status: 'needs_review' }).is_active).toBe(true);
    expect(normalizeStaticResource({ ...base, status: 'active' }).is_active).toBe(true);
  });

  it('passes geo fields through when present', () => {
    const r = normalizeStaticResource({ ...base, lat: 43.7035, lng: -72.2876, place: 'Hopkins Center' });
    expect(r.lat).toBe(43.7035);
    expect(r.lng).toBe(-72.2876);
    expect(r.place).toBe('Hopkins Center');
  });

  it('leaves geo fields null when absent', () => {
    const r = normalizeStaticResource(base);
    expect(r.lat).toBeNull();
    expect(r.lng).toBeNull();
    expect(r.place).toBeNull();
  });
});
