# Mag ik hier wildplassen?

Eén grote vraag, één simpel antwoord: op basis van je locatie (GPS of
handmatig adres) checkt deze app of je je binnen de bebouwde kom bevindt,
en of de gemeente daar een uitzondering op heeft gemaakt.

Zie [ARCHITECTURE.md](./ARCHITECTURE.md) voor de volledige uitleg van de
juridische achtergrond, databronnen en beperkingen.

## Stack

- Next.js 14 (App Router), TypeScript
- Edge API routes
- PDOK Locatieserver (geocoding) + PDOK BRT TOP10NL WFS (bebouwde-kom-check)
- Deploy: Vercel, automatisch bij elke push naar `main`

## Lokaal draaien

```bash
npm install
npm run dev
```

## Disclaimer

Geen juridisch advies. Zie de beperkingen in ARCHITECTURE.md.
