# Architectuur — Mag ik hier wildplassen?

## Juridische kern (het "waarom" van dit ontwerp)

In Nederland bestaat er **geen landelijk wettelijk verbod** op wildplassen.
Het wordt vrijwel overal geregeld via de gemeentelijke **APV** (Algemene
Plaatselijke Verordening), en de standaardbepaling (VNG-modelverordening,
overgenomen door bijna elke gemeente) verbiedt het alleen **binnen de
bebouwde kom**. Buiten de bebouwde kom is het op de meeste plekken dus
gewoon toegestaan — tenzij een specifieke gemeente de APV heeft uitgebreid
naar een met naam genoemd gebied (bijv. een park of natuurgebied) dat buiten
de kerngrens ligt.

Dit betekent dat we **niet** 342 gemeentes stuk voor stuk hoeven te
doorzoeken. We hebben twee lagen nodig:

1. **Landelijke bebouwde-kom-grens** — een geografische check: ligt dit punt
   binnen of buiten de bebouwde kom?
2. **Een kleine, groeibare lijst van gemeentelijke uitzonderingen** — voor de
   gemeentes die de APV specifiek hebben uitgebreid.

## Databronnen

| Doel | Bron | Type |
|---|---|---|
| Adres/locatie zoeken (handmatig) | PDOK Locatieserver `free` endpoint | Gratis publieke REST API, geen key nodig |
| Reverse geocoding (van coördinaat naar adres/gemeente) | PDOK Locatieserver `reverse` endpoint | Gratis publieke REST API |
| Bebouwde-kom-polygonen | BRT TOP10NL, laag `plaats`, via PDOK WFS | Gratis publieke WFS (live spatial query) |
| Gemeentelijke APV-uitzonderingen | CVDR / lokaleregelgeving.overheid.nl (handmatig onderzocht) + `data/exceptions.json` | Statisch, in de repo, uitbreidbaar |

## Requestflow

```
Gebruiker → (geolocation of handmatig adres)
  → /api/geocode  (alleen bij handmatige invoer, zet adres om naar lat/lon)
  → /api/check?lat=&lon=
      1. reverseGeocode()      → gemeente + adres (voor weergave)
      2. checkBebouwdeKom()    → binnen/buiten de kom (PDOK WFS point-in-polygon)
         └─ faalt de WFS-call? → heuristiekOpAfstand() als fallback
      3. check exceptions.json → is er voor déze gemeente een uitzondering?
      4. → JA / NEE + uitleg + bron
```

## Bekende beperkingen (bewust, voor een MVP)

- **Komgrens-definitie kan afwijken.** De meeste gemeentes gebruiken de
  Wegenverkeerswet-definitie (art. 20a) in hun APV, maar sommigen verwijzen
  naar de Wegenwet (art. 27) of een eigen "aanwijzingsbesluit uniforme
  bebouwde kom". De TOP10NL-polygoon is de beste landelijke proxy die
  bestaat, maar is niet in 100% van de gevallen exact gelijk aan de
  APV-definitie van elke individuele gemeente.
- **`exceptions.json` is niet uitputtend.** Het is een startpunt met een
  paar voorbeelden; uitbreiden gebeurt door CVDR-teksten na te lopen op
  zinnen als "ook van toepassing buiten de bebouwde kom in [gebied]".
- **De PDOK WFS-call is nog niet live getest** vanuit de ontwikkelomgeving
  waarin dit gebouwd is (geen netwerktoegang tot pdok.nl in die sandbox).
  Test dit als eerste na deployment — zie `lib/bebouwdeKom.ts`.
- Dit is informatief, geen juridisch advies.

## Mogelijke vervolgstappen

- Automatiseer het doorzoeken van CVDR-teksten (volltext search) op
  "buiten de bebouwde kom" + gebiedsnamen, om `exceptions.json` te vullen/
  valideren voor alle 342 gemeentes.
- Cache de TOP10NL "plaats"-polygonen lokaal (bijv. in Cloudflare D1/KV,
  net als bij Autolier) i.p.v. elke request live tegen PDOK te bevragen —
  scheelt latency en afhankelijkheid van PDOK-uptime.
- Voeg een kaartweergave toe die de bebouwde-kom-grens laat zien.
