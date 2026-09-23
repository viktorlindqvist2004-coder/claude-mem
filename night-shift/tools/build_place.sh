#!/usr/bin/env bash
#
# build_place.sh — bake the whole project into one openable Roblox place file.
#
# This is the no-setup route into the game: no plugin, no Terminal left running,
# no live connection to approve. `NightShift.rbxlx` is a complete place, and
# Studio opens it like any other file.
#
# The trade is that it is a snapshot. Editing a source file afterwards does not
# change the place — build it again, or use `rojo serve` and the plugin if you
# want edits to appear live.
#
set -euo pipefail
cd "$(dirname "$0")/.."
ROJO="${ROJO:-rojo}"
"$ROJO" build -o NightShift.rbxlx
ls -lh NightShift.rbxlx
