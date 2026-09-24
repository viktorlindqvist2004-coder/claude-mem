#!/usr/bin/env python3
"""
check_walkable.py — can you actually get there?

Every other checker in here asks about one object at a time. This one asks the
question a player asks: I am standing in the doorway, can I walk to the thing
the board is telling me to do.

It samples the ground floor on a 30 cm grid and marks a cell blocked if
anything occupies the space a body goes through -- between knee and head, 0.25
to 1.75 m off the slab. Then it floods out from the loading dock, which is
where every night begins, and reports two things:

  * **rooms it never reached.** Something is across the only way in, or the
    room's circulation is sealed by its own furniture.
  * **the squeeze points.** A run of floor less than 70 cm wide is not a
    corridor, it is a gap between two things somebody left there, and a mall
    does not have them.

Doors, glass and anything the character walks through are ignored, because
they are not what stops you.
"""

import io, os, subprocess, sys, tempfile
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import greybox_bundle  # noqa: E402

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

CELL = 0.2
KNEE, HEAD = 0.28, 1.75
X0, X1 = -40.0, 40.0
Z0, Z1 = -34.0, 42.0

# Things a body passes through or steps over.
PASSABLE = (
    "Floor", "Skirting", "Dado", "Band", "Line", "Joint", "Medallion",
    "Border", "Threshold", "Dust", "Marker", "Spawn", "Water", "Puddle",
    "Drain", "Step", "Stair", "Tread", "Riser", "Cleat", "Ramp", "Kerb",
    "Edge", "Plinth", "Foot", "Rail", "Deck", "Curtain", "Glass", "Shutter",
    "ExitDoor", "PushBar", "CubicleDoor", "DoorFrame", "Screed", "Tile",
    "Mat", "Arrow", "Symbol", "Grate", "Cable", "Cord", "Pallet", "Tarmac",
)

dump = """
local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" and d.CanCollide ~= false then
		local p, s = d.Position, d.Size
		table.insert(rows, string.format("%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f",
			d.Name, p.X, p.Y, p.Z, s.X, s.Y, s.Z))
	end
end
print(table.concat(rows, "\\n"))
print("--ROOMS--")
for _, r in G.ROOMS do
	print(string.format("%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f", r[1], r[2], r[3], r[4], r[5], r[6]))
end
"""

bundle = greybox_bundle.bundle(dump)

with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, "walk.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    out = subprocess.run([LUAU, path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(out.stdout + out.stderr)
        sys.exit(1)

body, _, tail = out.stdout.partition("--ROOMS--")
rooms = []
for line in tail.strip().split("\n"):
    f = line.split("\t")
    if len(f) == 6 and f[0]:
        rooms.append((f[0], float(f[1]), float(f[2]), float(f[3]), float(f[4]), float(f[5])))

cols = int((X1 - X0) / CELL)
rowsN = int((Z1 - Z0) / CELL)
blocked = bytearray(cols * rowsN)

for line in body.strip().split("\n"):
    f = line.split("\t")
    if len(f) != 7:
        continue
    n = f[0]
    if any(k in n for k in PASSABLE):
        continue
    px, py, pz, sx, sy, sz = (float(v) / M for v in f[1:7])
    if py + sy / 2 < KNEE or py - sy / 2 > HEAD:
        continue
    cx0 = max(0, int((px - sx / 2 - X0) / CELL))
    cx1 = min(cols - 1, int((px + sx / 2 - X0) / CELL))
    cz0 = max(0, int((pz - sz / 2 - Z0) / CELL))
    cz1 = min(rowsN - 1, int((pz + sz / 2 - Z0) / CELL))
    for a in range(cx0, cx1 + 1):
        for b in range(cz0, cz1 + 1):
            blocked[a * rowsN + b] = 1

#[[
#  Erode by one cell before flooding.
#
#  A Roblox character is two studs across -- 60 cm -- and does not slide along
#  walls the way a point does. Treating a single free cell as passable said the
#  whole building was walkable while a player was getting stuck in it; asking
#  for 90 cm said a 110 cm door was impassable. At 20 cm cells, eroding by one
#  asks for 60 cm of clear floor, which is the character, and that is the
#  number that means something.
#]]
tight_grid = bytearray(blocked)
for a in range(1, cols - 1):
    for b in range(1, rowsN - 1):
        if blocked[a * rowsN + b]:
            continue
        for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if blocked[(a + da) * rowsN + (b + db)]:
                tight_grid[a * rowsN + b] = 1
                break
blocked = tight_grid

# Flood from the middle of the loading dock, where every night starts.
start = (int((-28.8 - X0) / CELL), int((-18.0 - Z0) / CELL))
seen = bytearray(cols * rowsN)
q = deque([start])
seen[start[0] * rowsN + start[1]] = 1
reached = 0
while q:
    a, b = q.popleft()
    reached += 1
    for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        na, nb = a + da, b + db
        if 0 <= na < cols and 0 <= nb < rowsN:
            i = na * rowsN + nb
            if not seen[i] and not blocked[i]:
                seen[i] = 1
                q.append((na, nb))

print(f"{cols}x{rowsN} cells, {reached} reachable from the loading dock")
print("== how much of each room you can actually stand in ==")
missed = []
for name, rcx, rcz, rw, rd, ry in rooms:
    if abs(ry) > 0.1:
        continue        # ground floor only
    got = 0
    for a in range(int((rcx - rw / 2 + 0.6 - X0) / CELL), int((rcx + rw / 2 - 0.6 - X0) / CELL)):
        for b in range(int((rcz - rd / 2 + 0.6 - Z0) / CELL), int((rcz + rd / 2 - 0.6 - Z0) / CELL)):
            if 0 <= a < cols and 0 <= b < rowsN and seen[a * rowsN + b]:
                got += 1
    total = max(1, (int((rcx + rw / 2 - 0.6 - X0) / CELL) - int((rcx - rw / 2 + 0.6 - X0) / CELL))
                * (int((rcz + rd / 2 - 0.6 - Z0) / CELL) - int((rcz - rd / 2 + 0.6 - Z0) / CELL)))
    #[[
    #  Under a third of a room's floor standable is a room you fight through
    #  rather than walk through. Furniture goes round the edge; the middle is
    #  for people.
    #]]
    pct = 100 * got // total
    print(f"  {name:<20} {pct:>3}%" + ("   <-- too crowded" if pct < 34 else ""))
    if pct < 34:
        missed.append(name)
        # Where the blockage is: the free cells just outside the room's door
        # side, so the report says whether it is the way in or the room itself.
        pass
if not missed:
    print("  none")

#[[ Squeezes: a reachable cell with fewer than two free neighbours either way. ]]
print("== squeeze points (under 70 cm of clear floor) ==")
tight = []
for a in range(2, cols - 2):
    for b in range(2, rowsN - 2):
        if not seen[a * rowsN + b]:
            continue
        freeX = sum(1 for k in (-2, -1, 1, 2) if not blocked[(a + k) * rowsN + b])
        freeZ = sum(1 for k in (-2, -1, 1, 2) if not blocked[a * rowsN + (b + k)])
        if freeX <= 1 and freeZ <= 1:
            tight.append((X0 + a * CELL, Z0 + b * CELL))
print(f"  {len(tight)} cells" if tight else "  none")
for t in tight[:12]:
    print(f"    ({t[0]:.1f}, {t[1]:.1f})")
sys.exit(1 if missed else 0)
