/* =============================================================
   Mediemanifest
   -------------------------------------------------------------
   Bild- och filmmaterialet är AI-genererat med Higgsfield och
   ligger på deras CDN. Kör `bash scripts/vendor-media.sh` för att
   ladda hem filerna till media/ och sätt sedan USE_LOCAL = true
   nedan – då serveras allt från din egen domän i stället.

   Ersätt gärna med riktiga foton från banan när sådana finns:
   byt bara sökvägarna nedan.
   ============================================================= */

const USE_LOCAL = false;

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O';

const REMOTE = {
  /* Öppen parkbana i dalsländskt jordbrukslandskap */
  'img/parkland.png':   `${CDN}/hf_20260817_093928_c7ba92e9-4a5a-4e43-a979-f295346e297a.png`,
  'img/golden.png':     `${CDN}/hf_20260817_093928_11005a99-0aac-4576-8cfe-08a8cdedf49c.png`,
  'img/storm.png':      `${CDN}/hf_20260817_093928_6bc41f4f-cc32-41de-8579-ddd031bddf56.png`,
  'img/aerial.png':     `${CDN}/hf_20260817_093928_c3087983-d104-411d-96c1-b3a117fa5ad4.png`,
  'img/mist.png':       `${CDN}/hf_20260817_093928_fdab0dd5-4213-41c5-81ec-1b839b80fb2f.png`,
  'img/autumn.png':     `${CDN}/hf_20260817_093928_1868b41c-425c-44e6-80ee-f644e530d363.png`,
  'img/green-sun.png':  `${CDN}/hf_20260817_093928_9325c476-787b-4357-b57a-b6052d4a12d0.png`,
  'img/bunker.png':     `${CDN}/hf_20260817_093928_d785ea68-448d-4b96-9883-3a43844cf5d0.png`,
  'img/terrace.png':    `${CDN}/hf_20260817_093928_7d24afaf-a274-44a3-a238-786d3df50a59.png`,
  'img/range.png':      `${CDN}/hf_20260817_093928_99acff34-2085-4830-8e03-579f6f940e3a.png`,
  'img/tee.png':        `${CDN}/hf_20260817_093928_94632d57-9d59-4b83-bdfe-c4d931799fe1.png`,
  'img/dalsland.png':   `${CDN}/hf_20260817_093928_974dd506-f6df-488f-ba3b-32be1c28f7fe.png`,

  /* Film */
  'video/hero.mp4':      `${CDN}/hf_20260817_085205_1ee27ae0-c39f-4442-9b28-07e24bcd8f04.mp4`,
  'video/dew.mp4':       `${CDN}/hf_20260817_085205_79f69948-3275-4fa0-8f1b-de402a2c9a8f.mp4`,
  'video/dusk.mp4':      `${CDN}/hf_20260817_085204_41636518-5a2a-4324-8857-b816510384c8.mp4`,
  'video/fairway.mp4':   `${CDN}/hf_20260817_084730_b12e51bb-cd63-4445-9118-e43a923ef062.mp4`,
  'video/clubhouse.mp4': `${CDN}/hf_20260817_084730_af5558cb-fc2a-4664-844f-de9881c7a482.mp4`,
};

/** Lös ut en mediesökväg till en användbar URL. */
export function m(path) {
  if (USE_LOCAL) return `media/${path}`;
  const url = REMOTE[path];
  return url || `media/${path}`;
}

export const MEDIA = REMOTE;

/* Galleribilder med bildtext */
export const GALLERY = [
  { src: 'img/golden.png',    alt: 'Öppen fairway i lågt kvällsljus med långa trädskuggor', cap: 'Kvällssol över banan' },
  { src: 'img/storm.png',     alt: 'Solstrimma genom mörka moln över en green',             cap: 'Ljuset efter regnet' },
  { src: 'img/mist.png',      alt: 'Dimma över fairway med silhuetter av ekar i gryningen', cap: 'Dimma i gryningen' },
  { src: 'img/autumn.png',    alt: 'Lövträd i gult och rött längs fairway på hösten',       cap: 'Oktober i Dalsland' },
  { src: 'img/aerial.png',    alt: 'Banan uppifrån med fairways genom öppet landskap',      cap: 'Banan uppifrån' },
  { src: 'img/green-sun.png', alt: 'Flaggstång och hål i varmt solnedgångsljus',            cap: 'Sista puttarna' },
  { src: 'img/bunker.png',    alt: 'Nykrattad bunker med vit sand i lågt solljus',          cap: 'Vit sand, låg sol' },
  { src: 'img/parkland.png',  alt: 'Öppen parkbana med solitära lövträd i fairway',         cap: 'Parkbanans karaktär' },
  { src: 'img/range.png',     alt: 'Driving range i blå skymning med bollar i förgrunden',  cap: 'Rangen i skymningen' },
  { src: 'img/terrace.png',   alt: 'Klubbhusets träterrass med utsikt i gyllene kvällsljus', cap: 'Terrassen' },
  { src: 'img/tee.png',       alt: 'Golfboll på peg i motljus med dagg',                    cap: 'Första utslaget' },
  { src: 'img/dalsland.png',  alt: 'Dalsländskt landskap med åkrar, röda lador och sjöar',  cap: 'Dalsland runt omkring' },
];
