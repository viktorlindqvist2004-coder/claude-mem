/* =============================================================
   Dagsholm Golfklubb — innehållsdata
   -------------------------------------------------------------
   REGEL FÖR DEN HÄR FILEN: här står bara uppgifter klubben själv
   kan intyga. Inga uppskattade priser, inga påhittade hålnamn,
   inga exempeltexter som kan läsas som fakta.

   Allt nedan är antingen hämtat från offentliga uppgifter om
   klubben eller neutralt formulerat. Poster som ska fyllas i av
   klubben ligger som tomma listor med instruktion — så länge de
   är tomma göms motsvarande sektion helt i stället för att visa
   platshållare.
   ============================================================= */

export const CLUB = {
  name: 'Dagsholm Golfklubb',
  short: 'Dagsholm',
  legal: 'Dagsholm Golfklubb',
  formerly: 'Färgelanda Golfklubb',
  tagline: '18 hål i Färgelanda',
  founded: 1991,
  architect: 'Åke Persson',
  holes: 18,
  par: 72,
  type: 'Skogs- och parkbana',
  address: 'Dagsholm 12, 458 92 Färgelanda',
  region: 'Färgelanda · Dalsland',
  phone: '076-866 89 10',
  phoneHref: '+46768668910',
  phoneLabel: 'Reception & restaurang',
  phoneAlt: '0528-203 77',
  phoneAltHref: '+4652820377',
  phoneAltLabel: 'Kansli',
  email: 'info@dagsholmgolf.se',
  site: 'dagsholmgolf.se',
};

/* --- Nyckeltal --------------------------------------------- */
export const STATS = [
  { value: 18, suffix: '', label: 'Hål' },
  { value: 72, suffix: '', label: 'Par' },
  { value: 1991, suffix: '', label: 'Invigd' },
];

/* --- Banguide ---------------------------------------------
   TOM MED FLIT. Fyll i från klubbens officiella scorekort.

   Så länge listan är tom visas banöversikten nedan. Så fort den
   innehåller hål renderas den interaktiva banguiden och hela
   scorekortet automatiskt.

   Format per hål:
     nr    hålnummer 1–18
     name  hålets namn, eller '' om hålet inte har något
     par   3, 4 eller 5
     idx   hcp-index 1–18
     gul   längd i meter från gul tee
     rod   längd i meter från röd tee
     blurb valfri spelbeskrivning, eller '' för ingen text

   Exempel:
     { nr: 1, name: '', par: 4, idx: 11, gul: 320, rod: 278, blurb: '' },
                                                              */
export const HOLES = [];

/* Banöversikt – enbart uppgifter som går att belägga. */
export const COURSE = {
  intro: 'Arton hål, par 72. En skogs- och parkbana som Åke Persson ritade in i det dalsländska landskapet, spelad sedan 1991.',
  points: [
    { k: 'Hål',      v: '18' },
    { k: 'Par',      v: '72' },
    { k: 'Karaktär', v: 'Skogs- och parkbana' },
    { k: 'Terräng',  v: 'Lätt kuperad' },
    { k: 'Arkitekt', v: 'Åke Persson' },
    { k: 'Invigd',   v: '1991' },
  ],
};

/* --- Greenfee ----------------------------------------------
   PRISER ÄR MEDVETET INTE ANGIVNA. Dagsholm tillämpar
   heldagsgreenfee – det är en princip klubben själv beskriver –
   men de faktiska beloppen har vi inte bekräftade.

   Fyll i listan nedan med årets prislista så visas en pristabell
   automatiskt. Så länge den är tom hänvisar sidan till receptionen.

   Format:
     { name: 'Heldagsgreenfee', sub: 'Måndag–torsdag', price: 000 },
                                                              */
export const GREENFEE = [];

export const GREENFEE_NOTE =
  'Dagsholm tillämpar heldagsgreenfee: du betalar en gång och spelar hela dagen. ' +
  'Spela arton hål på förmiddagen, ät i restaurangen och gå ut igen på eftermiddagen.';

/* Övriga avgifter – fyll i vid behov, t.ex.
     { name: 'Hyrklubbor', price: '000 kr' },                 */
export const EXTRAS = [];

/* --- Medlemskap --------------------------------------------
   Endast kategorinamnen är angivna. Avgifter och förmåner fylls
   i av klubben; lämna 'price' tom så visas ingen siffra.

   Format:
     { name: 'Senior', price: '', unit: 'kr / år', note: '' },
                                                              */
export const MEMBERSHIPS = [
  { name: 'Senior',            price: '', unit: '', note: 'Fullt spel' },
  { name: 'Senior vardag',     price: '', unit: '', note: 'Vardagar' },
  { name: 'Ungdom 22–29 år',   price: '', unit: '', note: 'Fullt spel' },
  { name: 'Junior t.o.m. 21',  price: '', unit: '', note: 'Fullt spel' },
];

export const MEMBERSHIP_NOTE =
  'Aktuella medlemsavgifter och vad som ingår får du av kansliet. ' +
  'Vi hjälper dig också med byte av hemmaklubb.';

/* --- Anläggningen -------------------------------------------
   Endast det som går att belägga. Lägg till fler poster när ni
   vill – de renderas i samma ordning som listan.             */
export const FACILITIES = [
  { icon: 'flag',   title: '18-hålsbana',       text: 'Lätt kuperad skogs- och parkbana, par 72, ritad av Åke Persson och invigd 1991.', size: 'lg' },
  { icon: 'target', title: 'Driving range',     text: 'Range med 14 utslagsplatser.' },
  { icon: 'circle', title: 'Träningsområden',   text: 'Puttinggreen och område för närspel.' },
  { icon: 'fork',   title: 'Restaurang',        text: 'Restaurang på anläggningen. Bord och öppettider via receptionen.', size: 'lg' },
  { icon: 'play',   title: 'Träning',           text: 'Lektioner för både nybörjare och van spelare.' },
  { icon: 'bed',    title: 'Övernattning',      text: 'Möjlighet till boende i anslutning till anläggningen — hör av dig för besked.' },
];

/* --- Ordningsregler ----------------------------------------- */
export const RULES = [
  { k: 'Skor',   v: 'Softspikes' },
  { k: 'Hund',   v: 'Tillåten kopplad' },
  { k: 'GPS',    v: 'Tillåtet' },
  { k: 'Gäster', v: 'Välkomna alla dagar' },
];

/* --- Vanliga frågor -----------------------------------------
   Håll svaren till sådant klubben faktiskt kan stå för.      */
export const FAQ = [
  {
    q: 'Vad innebär heldagsgreenfee?',
    a: 'Du betalar en gång och spelar hela dagen i stället för per runda. Många spelar arton hål på förmiddagen, äter i restaurangen och går ut igen på eftermiddagen.',
  },
  {
    q: 'Vad kostar det att spela?',
    a: 'Aktuell prislista får du av receptionen på 076-866 89 10 eller via info@dagsholmgolf.se. Priserna sätts inför varje säsong.',
  },
  {
    q: 'Behöver jag boka starttid?',
    a: 'Ring receptionen på 076-866 89 10 så får du besked om vad som gäller för din dag.',
  },
  {
    q: 'Får jag ta med hund?',
    a: 'Ja, hund är välkommen på banan så länge den hålls kopplad.',
  },
  {
    q: 'Vilka skor gäller?',
    a: 'Softspikes gäller på banan.',
  },
  {
    q: 'Får jag använda avståndsmätare?',
    a: 'Ja, GPS och avståndsmätare är tillåtna.',
  },
];

/* --- Nyheter ------------------------------------------------
   TOM MED FLIT. Sektionen göms helt tills klubben lägger in
   riktiga inlägg.

   Format:
     { date: '2026-08-12', tag: 'Tävling', title: '…', text: '…' },
                                                              */
export const NEWS = [];
