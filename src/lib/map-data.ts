/**
 * Shape the catalog into map data: co-located physical resources become one
 * "place" pin (grouped by the `place` label); everything without coordinates is
 * "available anywhere" (online / access-from-anywhere) and carries no pin. How a
 * school surfaces that anywhere-set on the map is a per-school choice (an optional
 * anchor marker — see MAP.anchor in site.config). Pure and deterministic —
 * unit-tested in isolation.
 */
import type { Resource } from './catalog';

/** The trimmed resource shape the map UI consumes (no description/notes/etc.). */
export interface MapResource {
  id: string;
  name: string;
  category: string;
  url: string;
  annual_value: number | null;
}

/** A grouped geographic pin: one building/landmark holding 1+ resources. */
export interface MapPlace {
  place: string;
  lat: number;
  lng: number;
  resources: MapResource[];
}

/** The full data set the map page emits: physical place pins + the set of
 *  resources that have no fixed location ("available anywhere"). */
export interface MapData {
  places: MapPlace[];
  anywhere: MapResource[];
}

function trim(r: Resource): MapResource {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    url: r.url,
    annual_value: r.annual_value ?? null,
  };
}

export function buildMapData(resources: Resource[]): MapData {
  const byPlace = new Map<string, MapPlace>();
  const anywhere: MapResource[] = [];

  for (const r of resources) {
    if (r.is_active === false) continue;
    const hasCoords = typeof r.lat === 'number' && typeof r.lng === 'number';
    // A pin requires BOTH coordinates and a place label. Anything missing either
    // (coords-only, place-only, or neither) is "available anywhere" — no pin.
    if (hasCoords && r.place) {
      let pin = byPlace.get(r.place);
      if (!pin) {
        pin = { place: r.place, lat: r.lat as number, lng: r.lng as number, resources: [] };
        byPlace.set(r.place, pin);
      }
      pin.resources.push(trim(r));
    } else {
      anywhere.push(trim(r));
    }
  }

  return { places: [...byPlace.values()], anywhere };
}
