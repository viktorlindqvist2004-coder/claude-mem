/**
 * Central mediamanifest.
 *
 * Bilder och filmer är genererade som cinematiskt platshållarmaterial. De ligger
 * som standard på ett CDN. Kör `node scripts/fetch-media.mjs` för att ladda ner
 * allt till `public/media/` och sätt sedan NEXT_PUBLIC_MEDIA_SOURCE=local — då
 * serveras allt från din egen domän i stället (rekommenderat inför lansering).
 *
 * Byt gärna ut mot studions egna foton: behåll filnamnen i `local` och kör lokalt läge.
 */

const REMOTE_BASE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/";

const useLocal = process.env.NEXT_PUBLIC_MEDIA_SOURCE === "local";

export type Asset = {
  src: string;
  local: string;
  remote: string;
  width: number;
  height: number;
  alt: string;
};

function asset(
  remoteFile: string,
  localFile: string,
  width: number,
  height: number,
  alt: string,
): Asset {
  const remote = REMOTE_BASE + remoteFile;
  const local = `/media/${localFile}`;
  return { src: useLocal ? local : remote, local, remote, width, height, alt };
}

export type VideoAsset = {
  src: string;
  local: string;
  remote: string;
  poster: string;
};

function video(remoteFile: string, localFile: string, poster: Asset): VideoAsset {
  const remote = REMOTE_BASE + remoteFile;
  const local = `/media/${localFile}`;
  return { src: useLocal ? local : remote, local, remote, poster: poster.src };
}

export const images = {
  studio: asset(
    "hf_20260727_234115_32511c8f-bead-45a8-8345-3f992cc817e7.png",
    "studio-wide.png",
    2752,
    1536,
    "Tatueringsstudion i mörker med en upplyst stol i ljuskäglan",
  ),
  needle: asset(
    "hf_20260727_234119_104831b9-433c-4555-8c37-c0a166afe741.png",
    "needle-macro.png",
    1856,
    2304,
    "Närbild på tatueringsmaskin som drar en fin svart linje på hud",
  ),
  ink: asset(
    "hf_20260727_234121_5e82909b-4767-49e5-a0b5-cadea18ebfa1.png",
    "ink-water.png",
    2752,
    1536,
    "Svart bläck som sprider sig i vatten mot svart bakgrund",
  ),
  arm: asset(
    "hf_20260727_234124_0bc3822e-e91c-43b0-8f27-b19c89bfae6f.png",
    "blackwork-arm.png",
    1856,
    2304,
    "Underarm med blackwork och ornamental tatuering i hårt sidoljus",
  ),
  corridor: asset(
    "hf_20260727_234133_33ecb011-c2af-41be-beb8-897cccc18fdc.png",
    "studio-vertical.png",
    1536,
    2752,
    "Mörk studiokorridor med varmt ljus över tatueringsstolen",
  ),
  flash: asset(
    "hf_20260727_234136_3342b752-d14d-431f-9e24-bb3bbf355db1.png",
    "flash-wall.png",
    2752,
    1536,
    "Vägg täckt av handritade tatueringsskisser i dämpat ljus",
  ),
  fineline: asset(
    "hf_20260727_234138_ba5131c4-a2a7-4c7f-a32b-efa290195da6.png",
    "fineline.png",
    1856,
    2304,
    "Botanisk fineline-tatuering över nyckelbenet",
  ),
  tools: asset(
    "hf_20260727_234141_3dd635b6-212e-41c2-be0a-8cdc6551f67c.png",
    "tools-flatlay.png",
    2048,
    2048,
    "Tatueringsmaskin, nålkassetter och bläckkoppar på matt svart stål",
  ),
} as const;

/** 5-sekunders loopar. Varje film har sin startbild som poster, så första rutan
 *  ligger på plats direkt medan videon buffrar. */
export const videos = {
  hero: video(
    "hf_20260727_234328_7ef396b8-2bc9-48c4-8546-c4a0e633a691.mp4",
    "hero-studio.mp4",
    images.studio,
  ),
  heroVertical: video(
    "hf_20260727_234345_b464244d-675b-40b9-8933-911bb02a317d.mp4",
    "hero-studio-vertical.mp4",
    images.corridor,
  ),
  ink: video(
    "hf_20260727_234332_0b150431-adb9-4695-9b7e-011b97945863.mp4",
    "ink-bloom.mp4",
    images.ink,
  ),
  needle: video(
    "hf_20260727_234342_dcbcce99-abb5-42a2-9e6c-4537ed3d1f6a.mp4",
    "needle-macro.mp4",
    images.needle,
  ),
} as const;

/** Bildväggen i galleriet — tre kolumner som rör sig i olika hastighet. */
export const galleryColumns: Asset[][] = [
  [images.arm, images.tools, images.flash],
  [images.fineline, images.corridor, images.needle],
  [images.needle, images.ink, images.arm],
];
