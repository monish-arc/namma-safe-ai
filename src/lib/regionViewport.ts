import { Habitation, RegionSelection } from '../types';

export interface RegionViewportFocus {
  lat: number;
  lng: number;
  zoom: number;
  /** South, West, North, East bounding box — preferred over center+zoom when present. */
  bounds?: [number, number, number, number];
  /** Monotonic key to force a re-fly even for identical targets. */
  key: string;
  label: string;
  /** Habitation id when the target is a known pilot habitation. */
  habitationId?: string;
}

interface GeoPoint {
  lat: number;
  lng: number;
  zoom: number;
}

// Approximate centroids for all 36 LGD states/UTs (offline, zoom ~6 pan target).
// Keyed by LGD state code — see src/data/regions/hierarchy.ts.
export const STATE_CENTROIDS: Record<number, GeoPoint> = {
  35: { lat: 11.74, lng: 92.66, zoom: 6 }, // Andaman And Nicobar Islands
  28: { lat: 15.91, lng: 79.74, zoom: 6 }, // Andhra Pradesh
  12: { lat: 28.22, lng: 94.73, zoom: 6 }, // Arunachal Pradesh
  18: { lat: 26.2, lng: 92.94, zoom: 6 }, // Assam
  10: { lat: 25.59, lng: 85.14, zoom: 6 }, // Bihar
  4: { lat: 30.73, lng: 76.78, zoom: 11 }, // Chandigarh
  22: { lat: 21.3, lng: 81.63, zoom: 6 }, // Chhattisgarh
  7: { lat: 28.61, lng: 77.21, zoom: 10 }, // Delhi
  30: { lat: 15.3, lng: 74.12, zoom: 9 }, // Goa
  24: { lat: 22.26, lng: 71.19, zoom: 6 }, // Gujarat
  6: { lat: 29.06, lng: 76.09, zoom: 7 }, // Haryana
  2: { lat: 31.1, lng: 77.17, zoom: 7 }, // Himachal Pradesh
  1: { lat: 33.78, lng: 76.58, zoom: 6 }, // Jammu And Kashmir
  20: { lat: 23.61, lng: 85.28, zoom: 6 }, // Jharkhand
  29: { lat: 15.32, lng: 75.71, zoom: 6 }, // Karnataka
  32: { lat: 10.5, lng: 76.34, zoom: 7 }, // Kerala
  37: { lat: 34.1, lng: 77.6, zoom: 6 }, // Ladakh
  31: { lat: 10.6, lng: 72.63, zoom: 8 }, // Lakshadweep
  23: { lat: 23.47, lng: 77.95, zoom: 6 }, // Madhya Pradesh
  27: { lat: 19.75, lng: 75.71, zoom: 6 }, // Maharashtra
  14: { lat: 24.82, lng: 93.94, zoom: 7 }, // Manipur
  17: { lat: 25.47, lng: 91.37, zoom: 7 }, // Meghalaya
  15: { lat: 23.16, lng: 92.94, zoom: 7 }, // Mizoram
  13: { lat: 26.16, lng: 94.56, zoom: 7 }, // Nagaland
  21: { lat: 20.95, lng: 85.1, zoom: 6 }, // Odisha
  34: { lat: 11.94, lng: 79.81, zoom: 9 }, // Puducherry
  3: { lat: 31.15, lng: 75.34, zoom: 7 }, // Punjab
  8: { lat: 27.39, lng: 73.43, zoom: 6 }, // Rajasthan
  11: { lat: 27.53, lng: 88.51, zoom: 8 }, // Sikkim
  33: { lat: 11.13, lng: 78.66, zoom: 6 }, // Tamil Nadu
  36: { lat: 18.11, lng: 79.02, zoom: 6 }, // Telangana
  38: { lat: 20.18, lng: 73.02, zoom: 9 }, // Dadra And Nagar Haveli And Daman And Diu
  16: { lat: 23.94, lng: 91.99, zoom: 7 }, // Tripura
  9: { lat: 26.85, lng: 80.95, zoom: 6 }, // Uttar Pradesh
  5: { lat: 30.07, lng: 79.02, zoom: 7 }, // Uttarakhand
  19: { lat: 22.99, lng: 87.86, zoom: 6 }, // West Bengal
};

// LGD code for the Chamoli pilot district (used for bounds-based fits).
export const PILOT_DISTRICT_CODE = 47;
export const PILOT_SUBDISTRICT_CODE = 284; // Joshimath

// Approximate bounds of the Chamoli pilot habitations (offline fit target).
const PILOT_CHAMOLI_BOUNDS: [number, number, number, number] = [
  30.01, 79.43, 30.78, 79.7,
];

// Fixed centroid for the Joshimath sub-district.
const JOSHIMATH_CENTROID: GeoPoint = { lat: 30.5575, lng: 79.565, zoom: 12 };

const GEO_CACHE_KEY = 'namsafe-region-geocode-cache';

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function habitationBounds(habitations: Habitation[]): [number, number, number, number] {
  const lats = habitations.map((h) => h.latitude);
  const lngs = habitations.map((h) => h.longitude);
  return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)];
}

interface GeocodeCacheEntry {
  lat: number;
  lng: number;
  zoom: number;
  bounds?: [number, number, number, number];
}

function readGeocodeCache(): Record<string, GeocodeCacheEntry> {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GeocodeCacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeGeocodeCache(cache: Record<string, GeocodeCacheEntry>) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / private-mode failures
  }
}

async function geocodeRegion(query: string, zoom: number): Promise<GeocodeCacheEntry | null> {
  const cache = readGeocodeCache();
  const cached = cache[query];
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(query);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      boundingbox: [string, string, string, string];
    }>;
    if (!results.length) return null;

    const item = results[0];
    const entry: GeocodeCacheEntry = {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      zoom,
      bounds: [
        parseFloat(item.boundingbox[0]),
        parseFloat(item.boundingbox[2]),
        parseFloat(item.boundingbox[1]),
        parseFloat(item.boundingbox[3]),
      ],
    };
    cache[query] = entry;
    writeGeocodeCache(cache);
    return entry;
  } catch {
    return null;
  }
}

function makeFocus(
  point: { lat: number; lng: number; zoom: number; bounds?: [number, number, number, number] },
  label: string,
  habitationId?: string
): RegionViewportFocus {
  return {
    lat: point.lat,
    lng: point.lng,
    zoom: point.zoom,
    bounds: point.bounds,
    key: '',
    label,
    habitationId,
  };
}

// Resolves the current region selection to a map target (offline-first).
// Returns null when nothing can be resolved (e.g. offline and no cached geocode).
export async function resolveRegionViewport(
  region: RegionSelection,
  habitations: Habitation[]
): Promise<RegionViewportFocus | null> {
  const stateName = region.state?.name ?? '';
  const districtName = region.district?.name ?? '';

  // 1. Place / Village → match a pilot habitation by name first.
  if (region.place) {
    const placeName = normalizeName(region.place[1]);
    const match = habitations.find(
      (h) => normalizeName(h.village_name) === placeName || normalizeName(h.village_name).includes(placeName)
    );
    if (match) {
      return makeFocus(
        { lat: match.latitude, lng: match.longitude, zoom: 14 },
        match.village_name,
        match.id
      );
    }
  }

  // 2. Sub-district.
  if (region.subDistrict) {
    const code = region.subDistrict.code;
    if (code === PILOT_SUBDISTRICT_CODE) {
      return makeFocus(JOSHIMATH_CENTROID, region.subDistrict.name);
    }
    if (region.district?.code === PILOT_DISTRICT_CODE) {
      return makeFocus(
        { lat: (30.01 + 30.78) / 2, lng: (79.43 + 79.7) / 2, zoom: 11, bounds: PILOT_CHAMOLI_BOUNDS },
        region.subDistrict.name
      );
    }
    // Geocode fallback.
    const query = districtName
      ? `${region.subDistrict.name}, ${districtName}, ${stateName}, India`
      : `${region.subDistrict.name}, ${stateName}, India`;
    const geo = await geocodeRegion(query, 12);
    if (geo) {
      return makeFocus(
        { lat: geo.lat, lng: geo.lng, zoom: geo.zoom, bounds: geo.bounds },
        region.subDistrict.name
      );
    }
    return null;
  }

  // 3. District.
  if (region.district) {
    if (region.district.code === PILOT_DISTRICT_CODE && habitations.length > 0) {
      const b = habitationBounds(habitations);
      return makeFocus(
        { lat: (b[0] + b[2]) / 2, lng: (b[1] + b[3]) / 2, zoom: 10, bounds: b },
        region.district.name
      );
    }
    const query = districtName
      ? `${districtName}, ${stateName}, India`
      : `${stateName}, India`;
    const geo = await geocodeRegion(query, 10);
    if (geo) {
      return makeFocus(
        { lat: geo.lat, lng: geo.lng, zoom: geo.zoom, bounds: geo.bounds },
        region.district.name
      );
    }
  }

  // 4. State → offline centroid table.
  if (region.state) {
    const centroid = STATE_CENTROIDS[region.state.code];
    if (centroid) {
      return makeFocus(centroid, region.state.name);
    }
  }

  return null;
}