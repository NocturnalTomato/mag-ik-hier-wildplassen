import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/pdok";
import { checkBebouwdeKom, heuristiekOpAfstand } from "@/lib/bebouwdeKom";
import exceptions from "@/data/exceptions.json";

export const runtime = "edge";

export interface CheckResponse {
  magHet: boolean;
  zekerheid: "hoog" | "middel" | "laag";
  gemeente: string | null;
  plaatsnaam: string | null;
  uitleg: string;
  bron: string;
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: "lat en lon zijn verplicht" },
      { status: 400 }
    );
  }

  const { result: adres, afstandMeter } = await reverseGeocode(lat, lon);

  let komResultaat = await checkBebouwdeKom(lat, lon);
  let zekerheid: CheckResponse["zekerheid"] = "hoog";

  if (komResultaat.binnenBebouwdeKom === null) {
    komResultaat = heuristiekOpAfstand(afstandMeter);
    zekerheid = "laag";
  }

  const gemeente = adres?.gemeentenaam ?? null;

  // Check gemeentelijke uitzondering: gemeente heeft de APV expliciet
  // uitgebreid naar (een deel van) het gebied buiten de kom.
  const uitzondering = exceptions.gemeentes.find(
    (g) => gemeente && g.gemeente.toLowerCase() === gemeente.toLowerCase()
  );

  let magHet: boolean;
  let uitleg: string;
  let bron: string;

  if (komResultaat.binnenBebouwdeKom === true) {
    magHet = false;
    uitleg =
      "Je bevindt je binnen de bebouwde kom. In vrijwel alle gemeentes verbiedt de APV (Algemene Plaatselijke Verordening) wildplassen binnen de bebouwde kom.";
    bron = "BRT TOP10NL (bebouwde-kom-polygonen)";
  } else if (komResultaat.binnenBebouwdeKom === false) {
    if (uitzondering) {
      magHet = false;
      zekerheid = uitzondering.geverifieerd ? "hoog" : "middel";
      uitleg = `Je bent buiten de bebouwde kom, maar in ${uitzondering.gemeente} verbiedt de APV dit ook expliciet in ${uitzondering.gebied}. ${uitzondering.reden}`;
      bron = uitzondering.bron;
    } else {
      magHet = true;
      uitleg =
        "Je bent buiten de bebouwde kom. De meeste gemeentelijke APV's beperken het verbod op wildplassen tot binnen de bebouwde kom — daarbuiten is het (op de meeste plekken) niet strafbaar.";
      bron = "BRT TOP10NL (bebouwde-kom-polygonen) + CVDR APV-check";
    }
  } else {
    magHet = false; // veiligste aanname als we het niet kunnen bepalen
    uitleg =
      "We konden niet met zekerheid bepalen of je binnen de bebouwde kom bent. Ga voor de zekerheid uit van 'nee'.";
    bron = "onbekend";
  }

  const response: CheckResponse = {
    magHet,
    zekerheid,
    gemeente,
    plaatsnaam: adres?.weergavenaam ?? komResultaat.plaatsnaam,
    uitleg,
    bron,
  };

  return NextResponse.json(response);
}
