/* =============================================================
   Mediemanifest
   -------------------------------------------------------------
   Allt bild- och videomaterial är genererat med Higgsfield och
   ligger på deras CDN. Kör `bash scripts/vendor-media.sh` för att
   ladda hem filerna till media/ och sätt sedan USE_LOCAL = true
   nedan – då serveras allt från din egen domän i stället.
   ============================================================= */

const USE_LOCAL = false;

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O';

/* filnamn i media/ ⇄ fil på CDN */
const REMOTE = {
  'img/fairway-dawn.png':  `${CDN}/hf_20260817_084814_d44ff2cc-0ba6-4b73-8331-04a41bdea83d.png`,
  'img/bunker.png':        `${CDN}/hf_20260817_084814_bf890a31-3df3-44cc-a5be-770774acd71b.png`,
  'img/lake.png':          `${CDN}/hf_20260817_084815_b4d3a7df-bbf0-493d-b82f-c0714cdfb6bc.png`,
  'img/range.png':         `${CDN}/hf_20260817_084815_04485c60-7596-4ac2-ab9d-a94a822ed371.png`,
  'img/green-dew.png':     `${CDN}/hf_20260817_084815_fdfc3f16-16ea-4518-9f92-4666427038d9.png`,
  'img/clubhouse.png':     `${CDN}/hf_20260817_084814_b4455cc2-7442-413c-8cda-2202be05d07c.png`,
  'img/aerial-autumn.png': `${CDN}/hf_20260817_084814_6a82e24b-71ae-49d3-9eb2-13d32bbf6b87.png`,
  'img/restaurant.png':    `${CDN}/hf_20260817_084815_6241f0ff-e7fb-4e65-a1b9-1c91c2829b96.png`,
  'img/bag.png':           `${CDN}/hf_20260817_084814_2f325e62-c92c-401f-b193-fbe62bd8b961.png`,
  'img/tee-view.png':      `${CDN}/hf_20260817_084814_1df2c2c8-09e1-4ac5-a9a3-01bbfe7a7c1d.png`,
  'img/frost.png':         `${CDN}/hf_20260817_084814_0166b706-ffd0-43c6-9a8f-6a3c710b75ad.png`,
  'img/balls.png':         `${CDN}/hf_20260817_084815_e22d6ad4-ebf3-41cc-ac81-f95956525ddf.png`,
  'video/hero.mp4':        `${CDN}/hf_20260817_085205_1ee27ae0-c39f-4442-9b28-07e24bcd8f04.mp4`,
  'video/dew.mp4':         `${CDN}/hf_20260817_085205_79f69948-3275-4fa0-8f1b-de402a2c9a8f.mp4`,
  'video/dusk.mp4':        `${CDN}/hf_20260817_085204_41636518-5a2a-4324-8857-b816510384c8.mp4`,
  'video/fairway.mp4':     `${CDN}/hf_20260817_084730_b12e51bb-cd63-4445-9118-e43a923ef062.mp4`,
  'video/clubhouse.mp4':   `${CDN}/hf_20260817_084730_af5558cb-fc2a-4664-844f-de9881c7a482.mp4`,
};

/** Lös ut en mediesökväg till en användbar URL. */
export function m(path) {
  if (USE_LOCAL) return `media/${path}`;
  const url = REMOTE[path];
  return url && !url.startsWith('__') ? url : `media/${path}`;
}

export const MEDIA = REMOTE;

/* Galleribilder med bildtext */
export const GALLERY = [
  { src: 'img/fairway-dawn.png',  alt: 'Fairway i gryningen mellan björk och tall',        cap: 'Hål 2 · gryning i augusti' },
  { src: 'img/green-dew.png',     alt: 'Daggvåt green i motljus',                          cap: 'Första bollen på green' },
  { src: 'img/aerial-autumn.png', alt: 'Banan uppifrån i höstfärger',                      cap: 'Dalsland i oktober' },
  { src: 'img/bunker.png',        alt: 'Nykrattad bunker med vit sand',                    cap: 'Nya bunkrar, hål 15' },
  { src: 'img/lake.png',          alt: 'Spegelblank skogssjö i soluppgång',                cap: 'Sjön intill banan' },
  { src: 'img/tee-view.png',      alt: 'Utsikt från upphöjd tee ner mot fairway',          cap: 'Utsikten från hål 7' },
  { src: 'img/range.png',         alt: 'Driving range i kvällsljus',                       cap: 'Rangen, sen kväll' },
  { src: 'img/clubhouse.png',     alt: 'Falurött klubbhus med träterrass',                 cap: 'Klubbhuset & terrassen' },
  { src: 'img/restaurant.png',    alt: 'Ljus restauranginteriör med utsikt över banan',    cap: 'Restaurangen' },
  { src: 'img/bag.png',           alt: 'Golfbag på fairway i eftermiddagsljus',            cap: 'Eftermiddagsrunda' },
  { src: 'img/frost.png',         alt: 'Frostig fairway i soluppgång',                     cap: 'Första frosten' },
  { src: 'img/balls.png',         alt: 'Korg med rangebollar i gyllene ljus',              cap: 'En korg till' },
];
