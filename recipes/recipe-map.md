# Recipe: the campus map

The map has two moving parts: **pins** (real buildings, from the catalog) and the
**anchor model** (how online / no-location resources are shown). Both are pack data —
the map engine (`src/lib/map-data.ts`, `src/pages/map.astro`) is school-agnostic and
should not be edited in a fork.

## 1. Pins — geocode your buildings

A resource becomes a pin when it has **both** `lat` + `lng` and a `place` label in
`resources.json`. Co-located resources that share an identical `place` string collapse
into one pin. Everything else is "available anywhere" (see the anchor model below).

Get coordinates two ways (used to build both Dartmouth and CMU):

- **Named campus buildings — Overpass** (reliable where Nominatim's POI search isn't):
  ```
  [out:json][timeout:25];
  ( way["building"]["name"](<minLat>,<minLng>,<maxLat>,<maxLng>);
    node["amenity"]["name"](<minLat>,<minLng>,<maxLat>,<maxLng>); );
  out center tags;
  ```
  Each result carries a centroid (`center.lat/lon`) — grep it for your building names.
- **Addresses / venues — Nominatim**: `GET /search?q=<name>, <City>, <ST>&format=json&limit=1`
  (`curl -G --data-urlencode`, send a real `User-Agent`, ≤1 req/sec).

Normalize each resource's `place` to the **building** name (put room/floor detail in
`notes`) so co-located resources share one pin. Set `CAMPUS_BOUNDS` in `site.config.ts`
to a box that contains every pin — the `catalog-data` test enforces it.

## 2. The anchor model — `MAP` in `site.config.ts`

Resources with no fixed location (software, databases, the alumni email) are the
"available anywhere" set. Two ways to surface them:

- **Single anchor** (Dartmouth's Green): one central marker holds the whole anywhere
  set — the "sit on one bench, all the campus WiFi" conceit. Set:
  ```ts
  anchor: { lat, lng, label: 'The Green', glyph: 'WiFi', blurb: '…' }
  ```
- **No anchor** (an urban / multi-campus school like CMU): set `anchor: null`. The
  anywhere set then carries **no fake pin** — it's listed under `anywhereHeading`
  below the map, and the map frames purely on your real building pins.

Also set `MAP.center` (initial view + framing fallback), `MAP.title`/`MAP.deck`/
`MAP.description` (the page hero — formerly hardcoded), and `MAP.anywhereHeading`/
`MAP.anywhereBlurb`.

## 3. Building footprints (optional)

`src/content/building-footprints.json` softly tints building polygons under the pins.
It's decorative — an empty `{ "type": "FeatureCollection", "features": [] }` is fine.
To populate it, fetch polygon geometry from Overpass (`out geom;` instead of `out center;`)
and key each feature to the matching `place` label.
