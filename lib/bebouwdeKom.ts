/**
 * Bepaalt of een punt binnen de "bebouwde kom" ligt.
 *
 * Bron: BRT TOP10NL, laag "plaats" (objectklasse Plaats, typeNederzetting =
 * bebouwde kom / woonkern), ontsloten via de PDOK WFS.
 * https://www.pdok.nl/introductie/-/article/basisregistratie-topografie-brt-
 *
 * LET OP (zie README "Bekende beperkingen"): dit is de Wegenverkeerswet-achtige,
 * feitelijke bebouwingsgrens uit de topografische registratie. Sommige gemeentes
 * hanteren in hun APV een net andere formele komgrens (bijv. via de Wegenwet of
 * een eigen "aanwijzingsbesluit uniforme bebouwde kom"). Dit endpoint is dus een
 * sterke proxy, geen waterdichte juridische bron.
 *
 * Deze WFS-call is nog niet live getest tegen PDOK vanuit deze sandbox (het
 * netwerk hier staat pdok.nl niet toe) — test 'm na deployment als eerste.
 */

const WFS_URL = "https://service.pdok.nl/brt/top10nl/wfs/v1_0";

export interface BebouwdeKomResult {
  binnenBebouwdeKom: boolean | null; // null = kon niet worden bepaald
  plaatsnaam: string | null;
  bron: "top10nl-wfs" | "afstand-heuristiek" | "onbekend";
}

/**
 * Vraagt PDOK of het gegeven punt binnen een "plaats"-polygoon (bebouwde kom)
 * valt, via een live spatial WFS-query (CQL_FILTER INTERSECTS).
 */
export async function checkBebouwdeKom(
  lat: number,
  lon: number
): Promise<BebouwdeKomResult> {
  const cql = `INTERSECTS(geometrie,POINT(${lon} ${lat}))`;
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: "top10nl:plaats",
    outputFormat: "application/json",
    srsName: "urn:ogc:def:crs:EPSG::4326",
    count: "1",
    cql_filter: cql,
  });

  try {
    const res = await fetch(`${WFS_URL}?${params.toString()}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return { binnenBebouwdeKom: null, plaatsnaam: null, bron: "onbekend" };
    }
    const data = await res.json();
    const feature = data?.features?.[0];

    if (feature) {
      return {
        binnenBebouwdeKom: true,
        plaatsnaam: feature.properties?.naamnl ?? feature.properties?.naam ?? null,
        bron: "top10nl-wfs",
      };
    }
    // Geen "plaats"-polygoon op dit punt => buiten de bebouwde kom
    return { binnenBebouwdeKom: false, plaatsnaam: null, bron: "top10nl-wfs" };
  } catch {
    return { binnenBebouwdeKom: null, plaatsnaam: null, bron: "onbekend" };
  }
}

/**
 * Fallback als de WFS-call faalt: gebruik de afstand tot het dichtstbijzijnde
 * adres (uit PDOK Locatieserver) als grove indicator. Binnen ~75m van een
 * geregistreerd adres = waarschijnlijk bebouwd gebied.
 */
export function heuristiekOpAfstand(afstandMeter: number | null): BebouwdeKomResult {
  if (afstandMeter === null) {
    return { binnenBebouwdeKom: null, plaatsnaam: null, bron: "onbekend" };
  }
  return {
    binnenBebouwdeKom: afstandMeter < 75,
    plaatsnaam: null,
    bron: "afstand-heuristiek",
  };
}
