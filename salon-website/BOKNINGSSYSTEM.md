# Bokningssystem

Kunder bokar på `/` (sektionen **Välj din tid**). Du ser bokningarna på `/admin`.

## Två lägen

Systemet kör i ett av två lägen, beroende på om det finns en databas kopplad.

| | Testläge (nu) | Skarpt läge |
|---|---|---|
| Var sparas bokningar | I besökarens egen webbläsare | I en delad databas |
| Ser du kundernas bokningar | **Nej** | Ja |
| Kan två kunder boka samma tid | Ja | Nej |
| Inloggning till `/admin` | Lösenord i koden | Riktig inloggning |

Testläget är till för att prova flödet. **Det tar inte emot riktiga bokningar** —
en kund som bokar i sin telefon skriver till sin egen webbläsare, och du ser
den aldrig. Både bokningssidan och adminpanelen visar en varning så länge
det läget är aktivt.

## Koppla på riktigt (ca 10 minuter)

1. Skapa ett gratiskonto på [supabase.com](https://supabase.com) och ett nytt projekt.
2. Gå till **SQL Editor → New query**, klistra in hela `supabase-schema.sql` och kör.
3. Gå till **Authentication → Users → Add user**. Ange din e-post och ett
   lösenord, och bocka i att den är bekräftad. Det är den inloggningen du
   använder på `/admin`.
4. Gå till **Project Settings → API** och kopiera *Project URL* och
   *anon public*-nyckeln.
5. I Vercel: **Settings → Environment Variables**, lägg till

   ```
   VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

6. **Redeploy**. Varningen försvinner och systemet är skarpt.

`anon`-nyckeln är gjord för att ligga öppet i webbläsaren — det är
rättighetsreglerna i steg 2 som skyddar datan, inte nyckeln.

## Vad reglerna gör

Vem som helst får lägga till en bokning och får se **vilka tider** som är
upptagna. Ingen utom du kan läsa **vem** som bokat. Kundernas namn och
telefonnummer ligger i en tabell som är stängd för alla utan inloggning;
bokningssidan läser i stället vyn `busy_slots`, som bara innehåller datum,
tid och längd.

Ett unikt index hindrar två bokningar på samma starttid. Trycker två kunder
samtidigt får den ena tiden och den andra ett meddelande om att välja en ny.

## Ändra tider och tjänster

Allt sitter i `src/booking/config.ts`:

- `SERVICES` — namn, pris och **hur lång tid** varje behandling tar
- `OPENING_HOURS` — öppettider per veckodag, `null` betyder stängt
- `SLOT_INTERVAL` — hur tätt starttiderna ligger (15 min)
- `BUFFER_MINUTES` — paus mellan två kunder (5 min)
- `MIN_ADVANCE_HOURS` — hur nära inpå någon får boka (2 timmar)
- `MAX_ADVANCE_DAYS` — hur långt fram kalendern öppnar (60 dagar)

Längden styr vilka tider som går att välja: en behandling på 60 minuter
erbjuds inte en timme före stängning.

## Adminpanelen

- **Dagsremsan** högst upp visar två veckor med antal bokningar per dag
- **Dagen** visar hela dagen tidslinje, med vem som sitter i stolen när
- **Bokningar** listar kunderna med telefonnummer — tryck × för att avboka
- **Spärra** tar bort tid ur kalendern: lunch, ärende, ledig dag

## Om testlägets lösenord

I testläge är lösenordet `gentlemens`, eller det du sätter i
`VITE_ADMIN_PASSWORD`. Det ligger i den publika koden och går att läsa för
den som letar — det håller nyfikna besökare borta, inget mer. I skarpt läge
finns inget sådant lösenord: då krävs riktig inloggning, och databasen
lämnar inte ut något utan den.
