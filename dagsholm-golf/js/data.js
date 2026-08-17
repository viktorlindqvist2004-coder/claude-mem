/* =============================================================
   Dagsholm Golfklubb — innehållsdata
   -------------------------------------------------------------
   All redaktionell text samlad på ett ställe. Byt värden här –
   ingen HTML behöver röras.
   ============================================================= */

export const CLUB = {
  name: 'Dagsholm Golfklubb',
  short: 'Dagsholm',
  legal: 'Dagsholm Golfklubb',
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
  phoneAlt: '0528-203 77',
  phoneAltHref: '+4652820377',
  email: 'info@dagsholmgolf.se',
  site: 'dagsholmgolf.se',
  coords: { lat: 58.5486, lon: 12.0669 },
};

/* --- Nyckeltal i hero/intro -------------------------------
   Endast verifierade uppgifter. Lägg till banlängd här när ni
   har den bekräftad från scorekortet:
     { value: 5730, suffix: ' m', label: 'Gul tee' },          */
export const STATS = [
  { value: 18, suffix: '', label: 'Hål' },
  { value: 72, suffix: '', label: 'Par' },
  { value: 1991, suffix: '', label: 'Invigd' },
];

/* --- Banguide ---------------------------------------------
   TOM MED FLIT. Fyll i från klubbens officiella scorekort.

   Så fort listan innehåller hål renderas den interaktiva
   banguiden och scorekortet automatiskt på sidan. Är listan tom
   visas i stället en banöversikt utan hålspecifika uppgifter –
   inget påhittat hamnar alltså aldrig i publik text.

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

/* Banöversikt – visas när HOLES är tom. Endast verifierade fakta. */
export const COURSE = {
  intro: 'Arton hål, par 72. En lätt kuperad skogs- och parkbana som Åke Persson ritade in i det dalsländska landskapet, spelad sedan 1991.',
  points: [
    { k: 'Hål',       v: '18' },
    { k: 'Par',       v: '72' },
    { k: 'Karaktär',  v: 'Skogs- och parkbana' },
    { k: 'Terräng',   v: 'Lätt kuperad' },
    { k: 'Arkitekt',  v: 'Åke Persson' },
    { k: 'Invigd',    v: '1991' },
  ],
  notes: [
    {
      title: 'Landskapet bestämmer',
      text: 'Banan följer markens naturliga fall i stället för att tvinga sig på den. Öppna partier växlar med skogsdungar, och hålen byter karaktär flera gånger under rundan.',
    },
    {
      title: 'Vänlig men inte snäll',
      text: 'Tillgänglig nog för den som spelar sin första runda, tillräckligt krävande för att du ska vilja tillbaka. Ingen kö på första tee.',
    },
    {
      title: 'Hela dagen på en greenfee',
      text: 'Heldagsgreenfee gäller: arton hål på förmiddagen, lunch i restaurangen och nio till innan solen går ner — till samma pris.',
    },
  ],
};

/* --- Greenfee ---------------------------------------------- */
/* Dagsholm tillämpar heldagsgreenfee: samma pris oavsett om du
   spelar 18 eller 9 hål – du kan spela, äta och spela igen.     */
export const GREENFEE = {
  low: {
    label: 'Lågsäsong',
    period: 'April–maj & september–oktober',
    rows: [
      { name: 'Heldagsgreenfee', sub: 'Måndag–torsdag', price: 350 },
      { name: 'Heldagsgreenfee', sub: 'Fredag–söndag & helgdag', price: 400 },
      { name: '9 hål', sub: 'Alla dagar', price: 190 },
      { name: 'Junior t.o.m. 21 år', sub: 'Alla dagar', price: 175 },
    ],
  },
  high: {
    label: 'Högsäsong',
    period: 'Juni–augusti',
    rows: [
      { name: 'Heldagsgreenfee', sub: 'Måndag–torsdag', price: 450 },
      { name: 'Heldagsgreenfee', sub: 'Fredag–söndag & helgdag', price: 500 },
      { name: '9 hål', sub: 'Alla dagar', price: 250 },
      { name: 'Junior t.o.m. 21 år', sub: 'Alla dagar', price: 225 },
    ],
  },
};

export const EXTRAS = [
  { name: 'Golfbil', price: '350 kr / runda' },
  { name: 'Vagn', price: '50 kr' },
  { name: 'Hyrklubbor', price: '250 kr' },
  { name: 'Bollkort, range', price: 'från 40 kr' },
  { name: 'Ställplats husbil, med el', price: '250 kr / dygn' },
];

/* --- Medlemskap -------------------------------------------- */
export const MEMBERSHIPS = [
  {
    name: 'Senior',
    price: '4 900',
    unit: 'kr / år',
    note: 'Fullt spel alla dagar',
    perks: ['Fritt spel hela säsongen', 'Boka tider 14 dagar i förväg', 'Greenfeesamarbeten i Dalsland & Bohuslän', 'Rabatt på range och shop'],
    featured: true,
  },
  {
    name: 'Senior vardag',
    price: '3 400',
    unit: 'kr / år',
    note: 'Måndag–fredag',
    perks: ['Fritt spel vardagar', 'Helgspel till reducerad greenfee', 'Full tillgång till träningsområden', 'Klubbtävlingar på vardagar'],
  },
  {
    name: 'Ungdom 22–29',
    price: '2 200',
    unit: 'kr / år',
    note: 'Fullt spel alla dagar',
    perks: ['Fritt spel hela säsongen', 'Fri tillgång till range', 'Träningsgrupper', 'Rabatt på lektioner'],
  },
  {
    name: 'Junior t.o.m. 21',
    price: '900',
    unit: 'kr / år',
    note: 'Fullt spel alla dagar',
    perks: ['Fritt spel hela säsongen', 'Fria rangebollar', 'Juniorträning varje vecka', 'Läger och juniortour'],
  },
];

/* --- Anläggningen ------------------------------------------ */
export const FACILITIES = [
  { icon: 'flag',   title: '18-hålsbana',        text: 'Lätt kuperad skogs- och parkbana, par 72, ritad av Åke Persson och invigd 1991.', size: 'lg' },
  { icon: 'target', title: 'Driving range',      text: '14 utslagsplatser med generöst rangeområde och mål på alla avstånd.' },
  { icon: 'circle', title: 'Närspel & putting',  text: 'Eget närspelsområde med bunker samt stor puttinggreen intill klubbhuset.' },
  { icon: 'fork',   title: 'Restaurang & café',  text: 'Dagens lunch, à la carte och fika på terrassen med utsikt över hål 18.', size: 'lg' },
  { icon: 'cart',   title: 'Golfbilar & vagnar', text: 'Golfbilar, drag- och elvagnar samt hyrklubbor bokas i receptionen.' },
  { icon: 'bed',    title: 'Övernattning',       text: 'Boende på anläggningen – perfekt för golfhelgen eller sällskapsresan.' },
  { icon: 'van',    title: 'Ställplats',         text: 'Ställplatser för husbil med el, dusch och omklädningsrum på plats.' },
  { icon: 'play',   title: 'Pay & Play',         text: 'Ingen etablerad hcp? Spela ändå – pay & play för nybörjare och nyfikna.' },
];

/* --- Årstider ----------------------------------------------- */
export const SEASONS = [
  { name: 'Vår',    months: 'April–maj',         color: '#7FB069', text: 'Banan vaknar. Snabba greener, låg sol och fairways helt för dig själv.' },
  { name: 'Sommar', months: 'Juni–augusti',      color: '#E2C88E', text: 'Ljusa kvällar långt efter nio. Spela 18 hål, ät middag, spela nio till.' },
  { name: 'Höst',   months: 'September–oktober', color: '#D98060', text: 'Dalsland i guld och rost. Många säger att det är årets vackraste golf.' },
  { name: 'Vinter', months: 'November–mars',     color: '#7FA8C9', text: 'Vinterspel på provisoriska greener när vädret tillåter. Rangen är öppen.' },
];

/* --- Nyheter ------------------------------------------------ */
export const NEWS = [
  { date: '2026-08-12', tag: 'Tävling', title: 'Dagsholm Open avgörs 6 september', text: 'Årets största klubbtävling går av stapeln första helgen i september. Anmälan öppen i Min Golf.' },
  { date: '2026-07-28', tag: 'Banan',   title: 'Nya bunkrar färdigställda på hål 7 och 15', text: 'Renoveringen är klar och bunkrarna spelas nu som ordinarie hinder med ny dränering och nytt sand.' },
  { date: '2026-06-15', tag: 'Klubben', title: 'Juniorträningen rullar hela sommaren', text: 'Varje tisdag och torsdag samlas juniorerna på rangen. Nya deltagare är alltid välkomna.' },
];

/* --- Vanliga frågor ----------------------------------------- */
export const FAQ = [
  { q: 'Behöver jag boka starttid?', a: 'Vi rekommenderar att du bokar via Min Golf eller ringer receptionen på 076-866 89 10. Under lågsäsong går det ofta bra att komma direkt.' },
  { q: 'Vad ingår i heldagsgreenfee?', a: 'Du betalar en gång och spelar hela dagen. Många spelar 18 hål på förmiddagen, äter lunch i restaurangen och går ut igen på eftermiddagen.' },
  { q: 'Krävs etablerad handicap?', a: 'Nej. Vi har pay & play för dig utan hcp, och våra tränare hjälper dig gärna igång med grönt kort.' },
  { q: 'Får jag ta med hund?', a: 'Ja, hund är välkommen på banan så länge den hålls kopplad och du plockar upp efter den.' },
  { q: 'Finns golfbil att hyra?', a: 'Ja, vi har golfbilar för uthyrning. Boka gärna i förväg, särskilt under högsäsong och vid tävlingar.' },
  { q: 'Kan vi övernatta på anläggningen?', a: 'Ja. Vi har boende på plats samt ställplatser för husbil med el – hör av dig för paketpris på golf och logi.' },
];
