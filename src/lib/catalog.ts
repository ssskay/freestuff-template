/**
 * Catalog data access — the single place that resolves the resource list.
 *
 * Source-of-truth policy:
 *   - `src/content/resources.json` is the human-authored source of record.
 *   - Supabase is a serving projection of it (populated by scripts/seed-supabase.js).
 *   - At build time we read from Supabase and fall back to the JSON if the
 *     database is empty or unreachable, so the catalog never renders blank.
 *
 * Identity policy (see construct-review.md, C2):
 *   - Every resource exposes a stable, human-readable `id` (the slug). In the
 *     JSON this is the `id` field; in the DB it is the `slug` column. The UUID
 *     primary key stays internal to the database. Upvotes, reports, and curated
 *     collections all key on this slug so the JSON and DB representations agree.
 */

import type { Database } from './database.types';
import { getAllResources as getAllResourcesFromDb } from './supabase';

type ResourceRow = Database['public']['Tables']['resources']['Row'];

/** A catalog resource as consumed by the UI. `id` is always the stable slug. */
export interface Resource extends Omit<ResourceRow, 'id'> {
  /** Stable, human-readable slug. Used for data-resource-id, votes, reports. */
  id: string;
  annual_value: number | null;
  date_added: string | null;
  hidden_gem: boolean;
  /** Present only on DB-sourced rows: the internal UUID primary key. */
  uuid?: string;
  /** Geographic pin latitude. Null for online / access-anywhere resources. */
  lat?: number | null;
  /** Geographic pin longitude. Null for online / access-anywhere resources. */
  lng?: number | null;
  /** Building/landmark label used to group co-located resources into one pin. */
  place?: string | null;
}

/** Shape of an entry in resources.json (the authored source of record). */
interface StaticResource {
  id: string;
  name: string;
  category: string;
  description: string;
  link: string;
  eligibility: string[];
  source?: string | null;
  last_verified: string;
  status?: string;
  notes?: string | null;
  added_by?: string;
  annual_value?: number | null;
  date_added?: string;
  hidden_gem?: boolean;
  lat?: number;
  lng?: number;
  place?: string;
}

/**
 * Map an authored JSON entry to the UI Resource shape. `id` (the slug) is kept
 * as-is; `link` becomes `url`; upvotes default to 0 for static fallback.
 */
export function normalizeStaticResource(r: StaticResource): Resource {
  return {
    id: r.id,
    slug: r.id,
    name: r.name,
    description: r.description,
    url: r.link,
    category: r.category,
    eligibility: r.eligibility ?? [],
    last_verified: r.last_verified,
    notes: r.notes ?? null,
    source: r.source ?? null,
    added_at: r.date_added ?? r.last_verified,
    added_by: r.added_by ?? 'human',
    upvotes: 0,
    // Only 'broken'/'inactive' hide a resource; 'needs_review' stays visible
    // (flagged for follow-up) so a content mismatch is not silently dropped.
    is_active: r.status ? !['broken', 'inactive'].includes(r.status) : true,
    annual_value: r.annual_value ?? null,
    date_added: r.date_added ?? null,
    hidden_gem: r.hidden_gem ?? false,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    place: r.place ?? null,
  };
}

/**
 * Map a DB row to the UI Resource shape. Exposes `slug` as `id` (falling back to
 * the UUID if the slug column has not been backfilled yet), keeping the internal
 * UUID available as `uuid`.
 */
function normalizeDbResource(row: ResourceRow & { slug?: string | null }): Resource {
  return {
    ...row,
    id: row.slug || row.id,
    uuid: row.id,
    annual_value: (row as any).annual_value ?? null,
    date_added: (row as any).date_added ?? null,
    hidden_gem: (row as any).hidden_gem ?? false,
  };
}

/** Load and normalize the authored JSON catalog. Shared by both loaders below. */
async function loadJsonResources(): Promise<Resource[]> {
  const staticResources = await import('../content/resources.json');
  return (staticResources.default as StaticResource[]).map(normalizeStaticResource);
}

/**
 * Resolve the catalog. Tries Supabase first; falls back to the authored JSON if
 * the database is empty or the call fails. Always returns normalized resources.
 *
 * Drift risk: this (DB-first) and loadStaticResources (JSON-only) can disagree
 * if a resource is added to resources.json without re-running the Supabase seed
 * (scripts/seed-supabase.js) — the homepage would show the DB set while the map
 * shows the JSON set. resources.json is the source of record; always re-seed
 * after editing it so the two stay in sync.
 */
export async function loadResources(): Promise<Resource[]> {
  try {
    const rows = await getAllResourcesFromDb();
    if (rows.length > 0) {
      return rows.map((r) => normalizeDbResource(r as any));
    }
  } catch (error) {
    console.error('Error fetching from Supabase, using static data:', error);
  }
  return loadJsonResources();
}

/**
 * Resolve the catalog from the authored JSON only (never Supabase). The map view
 * uses this because geo fields (lat/lng/place) are authored solely in the JSON
 * and are not part of the Supabase projection.
 */
export async function loadStaticResources(): Promise<Resource[]> {
  return loadJsonResources();
}
