/**
 * Shape the catalog into map data: co-located physical resources become one
 * "place" pin (grouped by the `place` label); everything without coordinates
 * belongs to the Green anchor. Pure and deterministic — unit-tested in isolation.
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

/** The full data set the map page emits: physical places + the Green cluster. */
export interface MapData {
  places: MapPlace[];
  green: MapResource[];
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
  const green: MapResource[] = [];

  for (const r of resources) {
    if (r.is_active === false) continue;
    const hasCoords = typeof r.lat === 'number' && typeof r.lng === 'number';
    // A pin requires BOTH coordinates and a place label. Anything missing either
    // (coords-only, place-only, or neither) belongs to the Green anchor.
    if (hasCoords && r.place) {
      let pin = byPlace.get(r.place);
      if (!pin) {
        pin = { place: r.place, lat: r.lat as number, lng: r.lng as number, resources: [] };
        byPlace.set(r.place, pin);
      }
      pin.resources.push(trim(r));
    } else {
      green.push(trim(r));
    }
  }

  return { places: [...byPlace.values()], green };
}
