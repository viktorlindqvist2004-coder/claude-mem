/* =============================================================
   Dagsholm Golf — innehållsdata
   -------------------------------------------------------------
   All redaktionell data samlad på ett ställe. Byt värden här –
   ingen HTML behöver röras.

   ⚠ OBS för klubben: banguiden (HOLES) och prislistorna nedan är
   ifyllda med rimliga utgångsvärden. Ersätt dem med siffrorna från
   det officiella scorekortet och aktuell prislista innan sajten
   går live.
   ============================================================= */

export const CLUB = {
  name: 'Dagsholm Golf',
  legal: 'Dagsholm Golfklubb',
  tagline: '18 hål i södra Dalsland',
  founded: 1991,
  architect: 'Åke Persson',
  holes: 18,
  par: 72,
  type: 'Skogs- och parkbana',
  address: 'Dagsholm 12, 458 92 Färgelanda',
  region: 'Ellenö · Färgelanda · Dalsland',
  phone: '076-866 89 10',
  phoneHref: '+46768668910',
  phoneAlt: '0528-203 77',
  phoneAltHref: '+4652820377',
  email: 'info@dagsholmgolf.se',
  site: 'dagsholmgolf.se',
  coords: { lat: 58.5486, lon: 12.0669 },
};

/* --- Nyckeltal i hero/intro ------------------------------- */
export const STATS = [
  { value: 18, suffix: '', label: 'Hål' },
  { value: 72, suffix: '', label: 'Par' },
  { value: 5730, suffix: ' m', label: 'Gul tee' },
  { value: 1991, suffix: '', label: 'Invigd' },
];

/* --- Banguide --------------------------------------------- */
/* len: längd i meter från respektive tee. idx = hcp-index.     */
export const HOLES = [
  { nr: 1,  name: 'Öppningen',     par: 4, idx: 11, gul: 320, rod: 278, blurb: 'En generös inledning. Fairwayn öppnar sig mellan björkarna och ger dig utrymme att hitta rytmen innan banan börjar ställa frågor.' },
  { nr: 2,  name: 'Björkallén',    par: 4, idx: 5,  gul: 348, rod: 303, blurb: 'Smalnar av mot green. Håll bollen på högersidan – därifrån ligger inspelet öppet mot en green som lutar bakifrån och fram.' },
  { nr: 3,  name: 'Sjöglimten',    par: 3, idx: 17, gul: 152, rod: 132, blurb: 'Kort par 3 med utsikt över vattnet. Vinden ovanför trädtopparna är svårare att läsa än den ser ut från tee.' },
  { nr: 4,  name: 'Ekbacken',      par: 5, idx: 3,  gul: 458, rod: 398, blurb: 'Nåbar på två för den som vågar. Gamla ekar ramar in landningsytan och greenen ligger skyddad bakom en mjuk kulle.' },
  { nr: 5,  name: 'Ravinen',       par: 4, idx: 9,  gul: 335, rod: 291, blurb: 'Doglegg vänster över en sänka. Ett välplacerat utslag lämnar bara en kort järn kvar – ett dåligt lämnar allt kvar att önska.' },
  { nr: 6,  name: 'Tallskogen',    par: 4, idx: 15, gul: 296, rod: 258, blurb: 'Kort men trång. Tallarna står tätt på båda sidor och belönar precision framför längd.' },
  { nr: 7,  name: 'Dalslandsvyn',  par: 5, idx: 1,  gul: 470, rod: 409, blurb: 'Banans svåraste hål och dess vackraste utsikt. Tre välslagna slag krävs – och även då är par en fin siffra.' },
  { nr: 8,  name: 'Bäcken',        par: 3, idx: 13, gul: 138, rod: 120, blurb: 'Kort järn över rinnande vatten. Greenen är liten, snabb och förlåter ingenting långt.' },
  { nr: 9,  name: 'Hemvägen',      par: 4, idx: 7,  gul: 358, rod: 311, blurb: 'Upp mot klubbhuset. Ett hål som spelar en klubba längre än siffran antyder – ta mer än du tror.' },
  { nr: 10, name: 'Ellenö',        par: 4, idx: 8,  gul: 342, rod: 298, blurb: 'Andra nians öppning bjuder på ett brett utslag och ett inspel mot en upphöjd green med skogen som fond.' },
  { nr: 11, name: 'Krönet',        par: 4, idx: 12, gul: 312, rod: 271, blurb: 'Blind landningsyta över krönet. Sikta på trädtoppen i fjärran så ligger bollen där du vill ha den.' },
  { nr: 12, name: 'Grantoppen',    par: 3, idx: 16, gul: 165, rod: 144, blurb: 'Banans längsta par 3. Bunkrarna framför greenen är närmare än de ser ut – flagga aldrig kort.' },
  { nr: 13, name: 'Långa raka',    par: 5, idx: 2,  gul: 452, rod: 393, blurb: 'Rakt fram och länge. Ett hål där längd faktiskt lönar sig, men där rough på båda sidor snabbt tar tillbaka vinsten.' },
  { nr: 14, name: 'Myren',         par: 4, idx: 18, gul: 288, rod: 251, blurb: 'Drivebart för den långe. Vattnet till vänster gör beslutet på tee mer intressant än längden antyder.' },
  { nr: 15, name: 'Klippan',       par: 4, idx: 4,  gul: 366, rod: 318, blurb: 'Banans tuffaste par 4. Smal fairway, lång inspel och en green som lutar mot skogen.' },
  { nr: 16, name: 'Vindfånget',    par: 3, idx: 14, gul: 145, rod: 126, blurb: 'Öppet och vindutsatt. Klubbvalet här avgörs av vädret, inte av avståndet.' },
  { nr: 17, name: 'Åkerkanten',    par: 5, idx: 6,  gul: 445, rod: 387, blurb: 'Sista chansen att hämta ett slag. Öppen andra slagsyta men en väl skyddad green – birdie finns här.' },
  { nr: 18, name: 'Klubbhuset',    par: 4, idx: 10, gul: 340, rod: 296, blurb: 'Avslutning framför terrassen. Publikläge, lätt uppförsbacke och en green som alltid känns smalare än den är.' },
];

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
  { name: 'Vår',     months: 'April–maj',        text: 'Banan vaknar. Snabba greener, låg sol och fairways helt för dig själv.' },
  { name: 'Sommar',  months: 'Juni–augusti',     text: 'Ljusa kvällar långt efter nio. Spela 18 hål, ät middag, spela nio till.' },
  { name: 'Höst',    months: 'September–oktober', text: 'Dalsland i guld och rost. Många säger att det är årets vackraste golf.' },
  { name: 'Vinter',  months: 'November–mars',    text: 'Vinterspel på provisoriska greener när vädret tillåter. Rangen är öppen.' },
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
