# Ringlista – företag utan egen eller med utdaterad webbplats

Fil: `Ringlista_foretag_utan_webbplats.xlsx`

Område: Brålanda · Frändefors · Mellerud · Vänersborg/Vargön · Trollhättan
Sammanställd 2026-08-10 från öppna webbkällor.

## Innehåll

107 företag i ett enda ark (`Ringlista`), med kolumner för att bocka av samtal.

| Lead | Antal | Betydelse |
|---|---|---|
| A | 51 | Ingen egen webbplats, eller trasig/nedlagd sida. Ring först. |
| B | 20 | Svag eller utdaterad närvaro – kedjesida, gammal CMS, http utan TLS, gratis mallsida, domän utan sajt. |
| C | 36 | Har fungerande egen webbplats. Lägst prioritet, med i listan för fullständighet. |

## Kolumner att fylla i (gulmarkerade)

- **Ringd** – rullgardin `✓`
- **Fick svar** – `Ja` / `Nej` / `Röstbrevlåda` / `Fel nummer`
- **Intresserad** – `Ja` / `Kanske` / `Nej`
- **Återkoppling** – datum för nästa kontakt
- **Anteckningar** – fritext

Raden blir grön när Intresserad = Ja och gråas ut när Intresserad = Nej.
Räknarna högst upp (rad 6–7) uppdateras automatiskt: totalt, A-leads, ringda, fick svar,
intresserade och kvar att ringa.

## Läs det här innan du ringer

**Kolumnen Tel-säkerhet är viktig.**

- `Hög` – fullständigt nummer bekräftat i flera källor.
- `Medel` – fullständigt nummer men bara ett uppslag.
- `Låg` – numret är **ofullständigt eller motstridigt** i källan (syns som `??` i telefonkolumnen).
  Dessa måste slås upp innan du ringer, annars ringer du fel person.
- `Saknas` – inget nummer hittat i öppna källor.

Fördelning: `Hög` 44 · `Medel` 23 · `Låg` 22 · `Saknas` 18. De 40 raderna med `Låg`/`Saknas`
är kvar i listan eftersom företaget och adressen är verifierade – bara numret fattas.

Fördelning per ort: Mellerud 31 · Brålanda 25 · Vänersborg 22 · Trollhättan 16 ·
Frändefors 10 · Vargön 3.

## Om räknarna i rad 7

De sex räknarna är riktiga formler (`COUNTA`/`COUNTIF`) så att de uppdateras när du bockar av.
De har däremot inga förberäknade värden i filen – omräkningen kunde inte köras i miljön där
filen skapades. Cellerna kan därför se tomma ut i en snabbförhandsvisning, men fylls i så fort
du öppnar filen i Excel, LibreOffice eller Google Sheets.

## Metod och begränsningar

Uppgifterna kommer från sökmotorträffar mot svenska företagskataloger (hitta.se, eniro.se,
allabolag.se, merinfo.se, bolagsfakta.se, ratsit.se, proff.se, cylex m.fl.) samt företagens
egna sidor där sådana finns.

Två begränsningar att känna till:

1. **Webbplatsstatus är bedömd utifrån sökträffar, inte genom att öppna sidorna.** Kolumnen
   `Webbstatus` säger om det gick att hitta en egen domän eller inte, och flaggar tecken på
   eftersatt underhåll (gratis mallsajter som Webnode och n.nu, nedlagda Google Business
   Sites, `index.php`-strukturer, numrerade `.html`-sidor, http utan TLS). Att en sida är
   *grafiskt* utdaterad går inte att avgöra på det sättet – kolla live innan säljsamtalet.
2. **Täckningen är ojämn.** Brålanda, Frändefors och Mellerud är väl täckta. Trollhättan är
   underrepresenterat i förhållande till sin storlek – dels för att fler företag där har
   webbplats, dels för att katalogsökningarna i första hand lyfte fram kedjeanslutna företag.

## Starkaste leads

Företag som bevisligen hade en webbnärvaro som inte längre fungerar, eller ligger på en
gratis mallplattform:

- **Forsane Snickeri**, Frändefors – hade endast Google Business Site, som Google lade ner 2024. Länken är död.
- **Brålanda Veterinärpraktik AB** – kör på gratis Webnode-mall trots att egen domän finns i e-postadressen.
- **Buxåsen Småbruk**, Brålanda – webbplatsen är lösenordsskyddad och når inte kunder.
- **Salong Kristin Björk AB**, Vänersborg – gratis n.nu-sida utan egen domän.
- **Peter Svensson Plåtslageri**, Mellerud – sajt med numrerade html-sidor, orörd i många år.
- **Mikaels Bilservice**, Mellerud – ingen sajt, kontaktadress är en privat live.se-adress.
- **Wargöns Plåtslageri AB**, Vargön – http utan TLS.
