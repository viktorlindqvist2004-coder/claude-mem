#!/usr/bin/env bash
#
# fetch_voice.sh — download the generated lines, named after their keys.
#
# Run this on your own machine (the session that generated them cannot reach the
# CDN). Each file lands as <key>.wav, which is the name to upload it to Roblox
# under and the field to paste its asset id into in src/shared/VoiceBank.luau.
#
# These links are signed and do not last forever. If one 403s, the line is still
# in your Higgsfield generations and can be downloaded from there.
#
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p voice

echo "  n1_ask_the_time_1  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_ask_the_time_1.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_82d671d8-e1d2-4988-8683-c3174d68c2c1.wav"
echo "  n1_ask_the_time_2  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_ask_the_time_2.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_ca403f94-69fd-497a-80b2-322ee074c814.wav"
echo "  n1_ask_the_time_again_2  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_ask_the_time_again_2.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_f795756c-85d4-4016-8aa3-bbc9c16d2e92.wav"
echo "  n1_clocked_in_1  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_clocked_in_1.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_bf998b29-e3a9-4074-9758-760b3c1db557.wav"
echo "  n1_helpful_wet_floor_2  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_helpful_wet_floor_2.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_566af4b1-2622-4ab1-a570-cc542470b7bb.wav"
echo "  n1_name_from_stockroom_1  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_name_from_stockroom_1.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_b0e375bb-42ad-475a-89e9-cfa04c2fbcbb.wav"
echo "  n1_power_cut_1  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_power_cut_1.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_d688c2c5-a2a5-44ff-bdb3-3c5a7f88954f.wav"
echo "  n1_power_cut_2  (NIGHT MANAGER, Arthur)"
curl -sSL -o "voice/n1_power_cut_2.wav" "https://d8j0ntlcm91z4.cloudfront.net/user_3Gp8ZSPuuM6vEtGDVPzKDrG4V4O/hf_20260923_011721_490586c0-5846-4189-a8a3-956e219b3ccf.wav"

echo "Done. $(ls voice | wc -l | tr -d " ") files in ./voice"
