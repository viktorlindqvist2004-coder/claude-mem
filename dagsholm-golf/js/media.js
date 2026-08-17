/* =============================================================
   Filmmaterial
   -------------------------------------------------------------
   ⚠ VIKTIGT: klipp nedan är AI-genererade solnedgångsbilder från
   en golfbana i allmänhet — de föreställer INTE Dagsholm. De
   används därför enbart som stämningsfull bakgrund, aldrig med
   bildtext som påstår att det är klubbens egen bana.

   Byt ut mot egen film så fort ni har den: ersätt bara URL:erna
   nedan, eller lägg filerna i media/video/ och sätt USE_LOCAL.

   Filerna ligger på Higgsfields CDN. Vill ni servera dem från
   egen domän: ladda ner, lägg i media/video/ och sätt
   USE_LOCAL = true.
   ============================================================= */

const USE_LOCAL = false;

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O';

const REMOTE = {
  'video/sunset-fairway.mp4': `${CDN}/hf_20260817_105723_a5fb2f27-9a7b-4fb0-a1a2-86d23efc7537.mp4`,
  'video/sunset-flag.mp4':    `${CDN}/hf_20260817_105723_cf5ab4ad-fb50-4dce-9088-e4f633bdd5c3.mp4`,
  'video/sunset-pond.mp4':    `${CDN}/hf_20260817_105853_29775d41-683d-495d-afc9-a8386672ef6f.mp4`,
  'video/sunset-aerial.mp4':  `${CDN}/hf_20260817_105723_1a90e2b9-d4d7-485f-85a8-7679e89987ae.mp4`,
  'video/sunset-ball.mp4':    `${CDN}/hf_20260817_105723_7a5fec37-5dbd-4a35-94ec-986008e1a84a.mp4`,
  'video/sunset-tee.mp4':     `${CDN}/hf_20260817_105723_598422ff-c5d6-4b4a-b11c-7d32beb5c75c.mp4`,
};

/** Lös ut en mediesökväg till en användbar URL. */
export function m(path) {
  if (USE_LOCAL) return `media/${path}`;
  const url = REMOTE[path];
  return url && !url.includes('__V') ? url : null;
}

/** Klipp som roterar i hero, i ordning. */
export const HERO_CLIPS = [
  'video/sunset-fairway.mp4',
  'video/sunset-aerial.mp4',
  'video/sunset-tee.mp4',
];

/** Klipp i det stora filmbandet. */
export const REEL_CLIP = 'video/sunset-flag.mp4';

/** Klipp i det smala bandet längre ner. */
export const BAND_CLIP = 'video/sunset-pond.mp4';
