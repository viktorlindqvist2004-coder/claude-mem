/**
 * All studio content lives here so copy can be edited without touching components.
 *
 * Facts below (address, artists, staffed hours, socials) were gathered from public
 * listings for Ink N Skin Tatuering Studio, Trollhättan. Verify before launch.
 */

export const site = {
  name: "Ink N Skin",
  legalName: "Ink n Skin tatuering studio Trollhättan",
  tagline: "Tatueringsstudio i Trollhättan",
  city: "Trollhättan",
  url: "https://inknskintattoo.se",
  description:
    "Ink N Skin är en tatueringsstudio mitt i Trollhättan. Custom design, fineline, blackwork och cover-up av Arash — tatuerare med lång erfarenhet av alla stilar och motiv.",
} as const;

type Contact = {
  street: string;
  postal: string;
  city: string;
  country: string;
  mapsUrl: string;
  instagram: string;
  instagramHandle: string;
  tiktok: string;
  tiktokHandle: string;
  /** Lämna tom sträng för att dölja raden på sidan. */
  phone: string;
  email: string;
};

export const contact: Contact = {
  street: "Kungsgatan 16B",
  postal: "461 63",
  city: "Trollhättan",
  country: "Sverige",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Ink+N+Skin+Kungsgatan+16B+461+63+Trollh%C3%A4ttan",
  instagram: "https://www.instagram.com/inknskintattoo/",
  instagramHandle: "@inknskintattoo",
  tiktok: "https://www.tiktok.com/@inknskintattoo",
  tiktokHandle: "@inknskintattoo",
  /** Fyll i om studion vill visa telefon/e-post publikt. */
  phone: "",
  email: "",
};

export const hours = {
  staffed: [
    { day: "Måndag", time: "12:00 – 16:30" },
    { day: "Tisdag", time: "12:00 – 16:30" },
    { day: "Onsdag", time: "12:00 – 16:30" },
    { day: "Torsdag", time: "12:00 – 16:30" },
    { day: "Fredag", time: "12:00 – 16:30" },
    { day: "Lördag", time: "Bokning" },
    { day: "Söndag", time: "Stängt" },
  ],
  note: "Tider utanför bemannad öppettid bokas via DM eller direkt i studion.",
} as const;

/**
 * Lägg till fler objekt här om studion växer — sektionen byter automatiskt
 * från porträttlayout till rutnät när det finns mer än en tatuerare.
 */
export const artists = [
  {
    name: "Arash",
    role: "Tatuerare & grundare",
    handle: "@arash_tattooer",
    handleUrl: "https://www.instagram.com/arash_tattooer/",
    bio: "Startade Ink N Skin på Kungsgatan och tatuerar allt som går in genom dörren. Från millimeterprecis fineline och lettering till massiv blackwork och täckande cover-ups som ska bära ett helt liv.",
    focus: ["Fineline", "Blackwork", "Lettering", "Cover-up", "Ornamental"],
  },
] as const;

export const services = [
  {
    n: "01",
    title: "Custom design",
    body: "Vi ritar ditt motiv från grunden efter din idé, din kropp och din placering. Skissen görs om tills den sitter — du ser den innan nålen möter hud.",
  },
  {
    n: "02",
    title: "Fineline",
    body: "Tunna, exakta linjer med långsiktig läsbarhet. Botaniskt, ornamentalt eller minimalt — utfört så att det står sig när bläcket lagt sig.",
  },
  {
    n: "03",
    title: "Blackwork",
    body: "Massiv svärta, hård kontrast och grafisk form. Från enskilda statement-motiv till uppbyggnad av hela armar och ryggar över flera sittningar.",
  },
  {
    n: "04",
    title: "Cover-up",
    body: "Gammalt som ska bort? Vi bygger ett nytt motiv ovanpå det gamla i stället för att dölja det. Kom in för bedömning — vi är raka med vad som är möjligt.",
  },
  {
    n: "05",
    title: "Lettering & script",
    body: "Text som faktiskt går att läsa om trettio år. Bokstavsformer, spacing och placering anpassas efter kroppsdelen — inte tvärtom.",
  },
  {
    n: "06",
    title: "Retusch",
    body: "Uppfräschning av linjer, fyllning och kontrast på äldre tatueringar. Även arbeten gjorda någon annanstans, efter genomgång i studion.",
  },
] as const;

export const process = [
  {
    n: "01",
    title: "Hör av dig",
    body: "Skicka en DM på Instagram eller kom förbi studion under bemannad tid. Berätta motiv, ungefärlig storlek och var på kroppen det ska sitta — gärna med referensbilder.",
  },
  {
    n: "02",
    title: "Konsultation",
    body: "Vi går igenom idén tillsammans, känner på placering och storlek, och är ärliga om vad som håller över tid. Du får pris och tidsuppskattning innan något bokas.",
  },
  {
    n: "03",
    title: "Skiss & bokning",
    body: "Motivet ritas fram och justeras tills du är nöjd. Tid bokas — även utanför bemannade tider — och du får en tydlig förberedelselista inför sittningen.",
  },
  {
    n: "04",
    title: "Sittning",
    body: "Steril engångsutrustning, ny nål och rent arbetsbord varje gång. Vi tar pauser när du behöver. Efteråt får du eftervård och en genomgång av läkningen.",
  },
] as const;

export const faq = [
  {
    q: "Hur bokar jag tid?",
    a: "Enklast via DM på Instagram @inknskintattoo, eller genom att komma förbi studion på Kungsgatan 16B under bemannad tid, måndag till fredag 12:00–16:30. Tider utanför det går att boka — hör bara av dig.",
  },
  {
    q: "Vad kostar en tatuering?",
    a: "Priset beror på storlek, detaljnivå, placering och hur många sittningar motivet kräver. Vi ger alltid en tydlig uppskattning vid konsultationen, innan du bokar. Mindre motiv har ett minimipris.",
  },
  {
    q: "Finns det åldersgräns?",
    a: "Ja. Du måste vara 18 år och kunna visa giltig legitimation. Vi tatuerar inte minderåriga, inte heller med målsmans tillstånd.",
  },
  {
    q: "Hur förbereder jag mig inför sittningen?",
    a: "Sov ordentligt, ät en riktig måltid innan och drick vatten. Undvik alkohol dygnet före. Ha bekväma kläder som gör området lätt att komma åt — och ta med något att dricka om det blir en lång sittning.",
  },
  {
    q: "Hur sköter jag om tatueringen efteråt?",
    a: "Du får både muntlig och skriftlig eftervård med dig hem. Kort version: håll rent, smörj tunt, undvik bad, bastu och direkt sol tills allt är läkt — och pilla inte på sårskorpan.",
  },
  {
    q: "Gör ni cover-ups på gamla tatueringar?",
    a: "Ofta, ja. Hur mycket som går att göra beror på hur mörk och stor den gamla tatueringen är. Kom in för en bedömning så är vi raka med vad som är realistiskt.",
  },
] as const;

export const nav = [
  { label: "Studion", href: "#studion" },
  { label: "Arbeten", href: "#arbeten" },
  { label: "Tatuerare", href: "#tatuerare" },
  { label: "Omdömen", href: "#omdomen" },
  { label: "Kontakt", href: "#kontakt" },
] as const;
