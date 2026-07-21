// Egna foton från Brålanda med omnejd (ligger i axion-studio/public/images/).
// BASE_URL är "/" lokalt och "/claude-mem/" i GitHub Pages-bygget, så bilderna
// hittas rätt i båda fallen.
const base = import.meta.env.BASE_URL;

/** Flygbild över Sikhall vid Vänern, en stund från Brålanda. */
export const SIKHALL = `${base}images/sikhall-scaled.jpg`;

/** Humlemålningen (gatukonst) i Brålanda. */
export const HUMLOR_MURAL = `${base}images/stolt.jpg`;

// Autentiska bilder från Brålanda och Dalboslätten (Wikimedia Commons).
// Byt gärna ut mot egna foton av era bostäder när ni har dem.
export const BRALANDA_HOUSE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Hus_i_Br%C3%A5landa.JPG/1280px-Hus_i_Br%C3%A5landa.JPG";

export const BRALANDA_SORBYN =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/S%C3%B6rbyn_175%2C_Br%C3%A5landa.JPG/1280px-S%C3%B6rbyn_175%2C_Br%C3%A5landa.JPG";

export const DALBOSLATTEN =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Dalbosl%C3%A4tten_i_Dalsland_-_KMB_-_16000300030524.jpg/1280px-Dalbosl%C3%A4tten_i_Dalsland_-_KMB_-_16000300030524.jpg";
