/**
 * Helpers around the PDOK Locatieserver (BZK) — a free, keyless public API
 * for Dutch address geocoding / reverse geocoding.
 * Docs: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
 */

const LOCATIESERVER_BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

export interface GeocodeResult {
  weergavenaam: string;
  gemeentenaam: string;
  lat: number;
  lon: number;
}

/**
 * Free-text search, used for the manual "typ je adres" fallback.
 * Returns the single best match.
 */
export async function geocodeAddress(
  query: string
): Promise<GeocodeResult | null> {
  const url = `${LOCATIESERVER_BASE}/free?q=${encodeURIComponent(
    query
  )}&rows=1&fq=type:(adres OR woonplaats OR postcode)&fl=weergavenaam,gemeentenaam,centroide_ll`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data?.response?.docs?.[0];
  if (!doc?.centroide_ll) return null;

  // centroide_ll comes back as "POINT(lon lat)"
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc.centroide_ll);
  if (!match) return null;

  return {
    weergavenaam: doc.weergavenaam,
    gemeentenaam: doc.gemeentenaam ?? "",
    lon: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  };
}

/**
 * Reverse geocode a lat/lon into the nearest address + gemeente.
 * Used to (a) show the user where we think they are, and (b) as a
 * fallback "how built-up is it around here" signal — the distance to
 * the nearest address is a decent proxy for "in bebouwde kom" when the
 * primary polygon check (bebouwdeKom.ts) is unavailable.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ result: GeocodeResult | null; afstandMeter: number | null }> {
  const url = `${LOCATIESERVER_BASE}/reverse?lat=${lat}&lon=${lon}&rows=1&fl=weergavenaam,gemeentenaam,centroide_ll,afstand`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return { result: null, afstandMeter: null };
  const data = await res.json();
  const doc = data?.response?.docs?.[0];
  if (!doc) return { result: null, afstandMeter: null };

  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc.centroide_ll ?? "");

  return {
    result: {
      weergavenaam: doc.weergavenaam,
      gemeentenaam: doc.gemeentenaam ?? "",
      lon: match ? parseFloat(match[1]) : lon,
      lat: match ? parseFloat(match[2]) : lat,
    },
    afstandMeter: doc.afstand ?? null,
  };
}
