#!/usr/bin/env bash
#
# verify.sh — everything that can be checked without opening Studio.
#
#   1. compile every Luau source
#   2. flag any identifier that is not a real Roblox global (catches a local
#      used above where it is declared, which Luau reads as a nil global)
#   3. build the whole mall against a stubbed Roblox API and count the parts
#   4. check the cross-references a compiler cannot see (tools/check_refs.py)
#   5. run all five nights against the stub: every beat, every prompt
#
# Needs luau and luau-analyze on PATH, or in LUAU_DIR.
#
set -u
cd "$(dirname "$0")/.."
LUAU_DIR="${LUAU_DIR:-/tmp}"
LUAU="${LUAU_DIR}/luau"
COMPILE="${LUAU_DIR}/luau-compile"
ANALYZE="${LUAU_DIR}/luau-analyze"
fail=0

echo "== compile =="
for f in $(find src -name '*.luau' | sort); do
  if ! out=$("$COMPILE" --binary "$f" 2>&1 >/dev/null) || [ -n "$out" ]; then
    echo "$out"; fail=1
  fi
done
[ $fail -eq 0 ] && echo "  every source compiles"

echo "== identifiers =="
KNOWN="Color3|Enum|Instance|Vector3|Vector2|CFrame|Random|game|workspace|task|UDim|UDim2"
KNOWN="$KNOWN|TweenInfo|RaycastParams|Ray|script|typeof|Font|NumberRange|ColorSequence"
KNOWN="$KNOWN|NumberSequence|BrickColor|Rect|os|debug|utf8|warn"
found=0
for f in $(find src -name '*.luau' | sort); do
  out=$("$ANALYZE" "$f" 2>&1 | grep "Unknown global" | grep -vE "Unknown global '($KNOWN)'")
  if [ -n "$out" ]; then echo "$out"; found=1; fail=1; fi
done
[ $found -eq 0 ] && echo "  no unresolved identifiers"

echo "== build the mall =="
tmp=$(mktemp -d)
cat tools/roblox_stub.luau > "$tmp/combined.luau"
# The greybox requires its own Surfaces child; inline it and resolve the require.
printf '\nlocal __M = {}\n__M.Surfaces = (function()\n' >> "$tmp/combined.luau"
cat src/greybox/Surfaces.luau >> "$tmp/combined.luau"
printf '\nend)()\nlocal function MODULE()\n' >> "$tmp/combined.luau"
sed 's/require(script\.Surfaces)/__M.Surfaces/' src/greybox/init.luau >> "$tmp/combined.luau"
printf '\nend\nlocal G = MODULE()\nG.build()\n' >> "$tmp/combined.luau"
if ! "$LUAU" "$tmp/combined.luau"; then fail=1; fi
rm -rf "$tmp"

echo "== cross-references =="
python3 tools/check_refs.py | sed 's/^/  /' || fail=1

echo "== smoke =="
python3 tools/smoke.py 2>&1 | grep -E "FAIL|smoke:|beats," | sed 's/^/  /'
[ "${PIPESTATUS[0]}" != "0" ] && fail=1

exit $fail
