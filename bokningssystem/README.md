# Bokningssystem

Bokning med adminpanel, att lägga in i vilken React-sida som helst. Kunden
väljer tjänst, dag och tid och ser direkt vilka tider som är tagna. Ägaren
får en panel med dagens bokningar, kundernas nummer, avbokning, spärrad tid
och ett schema för öppettider och semester.

Fristående: ingen Tailwind, inget CSS-ramverk, inga krav på hur din sida är
byggd. Enda beroendet är React.

## Lägg in det

Kopiera in mappen `src/` i ditt projekt, t.ex. som `src/bokning/`.

```tsx
import { BookingSection, AdminPanel, createBookingConfig } from './bokning'
import './bokning/booking.css'

// En config per sida. Skicka samma till båda komponenterna — de räknar ut
// lediga tider från de här siffrorna, och olika siffror ger dubbelbokningar.
export const bokning = createBookingConfig({
  businessName: 'Salong Nord',
  phone: '070-123 45 67',
  services: [
    { id: 'klipp',  name: 'Klippning', price: 400, duration: 30 },
    { id: 'fard',   name: 'Färgning',  price: 950, duration: 90 },
  ],
})
```

På din sida:

```tsx
<BookingSection config={bokning} />
```

Och på adressen du vill ha panelen, t.ex. `/admin`:

```tsx
<AdminPanel config={bokning} />
```

Har du ingen router räcker det med en koll i `main.tsx`:

```tsx
const isAdmin = location.pathname.replace(/\/+$/, '') === '/admin'
createRoot(el).render(isAdmin ? <AdminPanel config={bokning} /> : <App />)
```

Ligger sidan på Vercel eller Netlify: se till att alla vägar skickas till
`index.html`, annars ger `/admin` en 404 vid omladdning.

## Prova först

```bash
npm run demo
```

Öppnar en demosida på `localhost:5300`, panelen på `/admin` med lösenord
`demo`.

## Två lägen

| | Testläge | Skarpt läge |
|---|---|---|
| Var bokningar sparas | I besökarens webbläsare | I en delad databas |
| Ser ägaren kundernas bokningar | **Nej** | Ja |
| Kan två kunder ta samma tid | Ja | Nej |
| Inloggning | Lösenord i koden | Riktig inloggning |

Utan databas kör systemet i testläge. Det är bra för att prova flödet men
**tar inte emot riktiga bokningar** — en kund som bokar i sin telefon skriver
till sin egen webbläsare, och ägaren ser den aldrig. Båda vyerna visar en
varning så länge det läget är aktivt.

## Koppla en databas (ca 10 min)

1. Skapa ett gratisprojekt på [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, klistra in `supabase-schema.sql`, kör.
3. **Authentication → Users → Add user** — e-post och lösenord, bekräftad.
   Det är inloggningen till panelen.
4. **Project Settings → API** — kopiera *Project URL* och *anon public*.
5. Lägg dem som miljövariabler där sidan byggs:

   ```
   VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

6. Bygg om. Varningen försvinner.

Installera även `@supabase/supabase-js` i projektet. Den laddas bara när
nycklarna finns, så sidor i testläge skickar aldrig ut den till besökaren.

`anon`-nyckeln är gjord för att ligga öppet — det är rättighetsreglerna i
steg 2 som skyddar datan, inte nyckeln.

### Vad reglerna gör

Vem som helst får boka och får se **vilka tider** som är upptagna. Ingen utom
den inloggade kan läsa **vem** som bokat: namn och telefonnummer ligger i en
tabell som är stängd, och bokningsformuläret läser i stället vyn `busy_slots`
med bara datum, tid och längd.

Ett unikt index hindrar två bokningar på samma starttid. Trycker två kunder
samtidigt får den ena tiden, den andra ett meddelande om att välja ny.

Flera sidor kan dela ett Supabase-projekt bara om de ska dela samma
kalender. Ska de ha varsin, skapa ett projekt per sida.

## Inställningar

Allt i `createBookingConfig`:

| | |
|---|---|
| `businessName` | Visas i panelen. Namnger även lagringen i testläge |
| `phone` | Erbjuds som alternativ till att boka online. Tomt döljer det |
| `currency` | `'kr'` |
| `services` | Namn, pris och **längd** i minuter |
| `defaultWeek` | Öppettider tills ett schema sparats i panelen |
| `slotInterval` | Hur tätt starttider ligger, 15 min |
| `bufferMinutes` | Paus mellan kunder, 5 min |
| `minAdvanceHours` | Hur nära inpå någon får boka, 2 h |
| `maxAdvanceDays` | Hur långt fram kalendern öppnar, 60 dagar |
| `localPassword` | Panelens lösenord i testläge |

Längden styr vilka tider som erbjuds: en behandling på 90 minuter dyker inte
upp en timme före stängning, och bufferten läggs på mellan bokningar.

Öppettider och semester ändras sedan i panelen, inte i koden.

## Utseende

Färger och kanter styrs av CSS-variabler på `.bk`. Sätt dem på din sida:

```css
.bk {
  --bk-accent: #2f6f4f;   /* knappar, valda tider, rubriker */
  --bk-fg: #14110c;       /* text */
  --bk-line: rgba(0,0,0,.15);
  --bk-radius: 6px;       /* 0 ger raka hörn */
  --bk-font: 'Inter', sans-serif;
}
```

Standard är mörkt tema. Längst ned i `booking.css` finns ett ljust att
kopiera in.

## Efter en bokning

`onBooked` kör när bokningen är sparad — haka på bekräftelsemail här:

```tsx
<BookingSection config={bokning} onBooked={(b) => sendMail(b)} />
```

## Att veta

- Texterna är på svenska och ligger i komponenterna.
- Systemet räknar med **en resurs**, alltså en stol. Två frisörer som kan ta
  varsin kund samtidigt kräver att `bookings` får en kolumn för resurs och
  att kontrollen görs per resurs.
- Tider är lokal tid utan tidszon. Det håller så länge verksamheten och
  kunderna är i samma zon.
