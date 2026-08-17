#!/usr/bin/env bash
# =============================================================
# Hämtar hem allt genererat bild- och videomaterial från CDN till
# media/ så att sajten kan serveras helt från din egen domän.
#
#   bash scripts/vendor-media.sh
#
# Sätt därefter USE_LOCAL = true i js/media.js.
# =============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O"

mkdir -p media/img media/video

get() {
  local dest="$1" file="$2"
  if [ -s "$dest" ]; then
    echo "hoppar över (finns redan)  $dest"
    return 0
  fi
  echo "hämtar  $dest"
  curl -fsSL --retry 4 --retry-delay 2 -o "$dest" "$CDN/$file"
}

# --- bilder ---------------------------------------------------
get media/img/fairway-dawn.png  hf_20260817_084814_d44ff2cc-0ba6-4b73-8331-04a41bdea83d.png
get media/img/bunker.png        hf_20260817_084814_bf890a31-3df3-44cc-a5be-770774acd71b.png
get media/img/lake.png          hf_20260817_084815_b4d3a7df-bbf0-493d-b82f-c0714cdfb6bc.png
get media/img/range.png         hf_20260817_084815_04485c60-7596-4ac2-ab9d-a94a822ed371.png
get media/img/green-dew.png     hf_20260817_084815_fdfc3f16-16ea-4518-9f92-4666427038d9.png
get media/img/clubhouse.png     hf_20260817_084814_b4455cc2-7442-413c-8cda-2202be05d07c.png
get media/img/aerial-autumn.png hf_20260817_084814_6a82e24b-71ae-49d3-9eb2-13d32bbf6b87.png
get media/img/restaurant.png    hf_20260817_084815_6241f0ff-e7fb-4e65-a1b9-1c91c2829b96.png
get media/img/bag.png           hf_20260817_084814_2f325e62-c92c-401f-b193-fbe62bd8b961.png
get media/img/tee-view.png      hf_20260817_084814_1df2c2c8-09e1-4ac5-a9a3-01bbfe7a7c1d.png
get media/img/frost.png         hf_20260817_084814_0166b706-ffd0-43c6-9a8f-6a3c710b75ad.png
get media/img/balls.png         hf_20260817_084815_e22d6ad4-ebf3-41cc-ac81-f95956525ddf.png

# --- video ----------------------------------------------------
get media/video/hero.mp4      hf_20260817_085205_1ee27ae0-c39f-4442-9b28-07e24bcd8f04.mp4
get media/video/dew.mp4       hf_20260817_085205_79f69948-3275-4fa0-8f1b-de402a2c9a8f.mp4
get media/video/dusk.mp4      hf_20260817_085204_41636518-5a2a-4324-8857-b816510384c8.mp4
get media/video/fairway.mp4   hf_20260817_084730_b12e51bb-cd63-4445-9118-e43a923ef062.mp4
get media/video/clubhouse.mp4 hf_20260817_084730_af5558cb-fc2a-4664-844f-de9881c7a482.mp4

echo
echo "Klart. Sätt nu USE_LOCAL = true högst upp i js/media.js."
du -sh media
