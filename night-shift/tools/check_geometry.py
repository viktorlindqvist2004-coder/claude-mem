#!/usr/bin/env python3
"""
check_geometry.py — find the props that are in the wrong place.

A greybox built by code has one characteristic failure: a prop positioned
relative to a room that moved, or given a height that was right before a ceiling
changed. It does not error. It hangs in the air, or sticks through a wall, and
you only find it by walking into it.

This builds the mall against the stub, then checks every part against the
volumes it could legitimately be in:

  * **outside** — the part's centre is in no room, corridor, arm or exterior
    area at all. It is floating in the void.
  * **through the ceiling** — the top of the part is above the ceiling of the
    space it is in.
  * **through the floor** — the bottom is below that space's floor.

Every finding is a real coordinate you can fly to in Studio.
"""

import io, json, os, re, subprocess, sys, tempfile

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

# Volumes, in metres: name, x0, x1, y floor, y ceiling, z0, z1.
# Generous by half a metre in plan, because a skirting board is meant to be in
# the wall and a fascia is meant to be proud of one.
PAD = 0.7
VOLUMES = [
    ("atrium",        -11,  11,  -0.4,  10.2,  -9,   9),
    ("north arm",      -3.2, 3.2, -0.4,  4.5,    9,  39),
    ("east arm",       11,  35,  -0.4,   4.5,   -3.2, 3.2),
    ("service",       -23.3,-20.7,-0.4,  3.9,  -30,  18),
    ("link",          -21,  -11, -0.4,   3.9,    1.6, 4.4),
    ("basement",      -23.3,-20.7,-5.0, -1.3,  -30,   2),
    ("stairwell",     -23.3,-20.7,-5.0,  0.4,  -30, -23),
    ("first floor",   -11,  11,   4.8,  10.2,  -9,   9),
    ("floor 3",       -13,  13,   9.4,  13.4,  -10,  10),
    ("f3 stair",      -10.5,-7.5, 4.8,   9.6,    2.5, 9.5),
    ("police",         137, 143, -0.4,   3.1,   -3,   3),
    ("car park",      -52, -8,   -0.6,   7.0,  -48, -20),
    ("clock",          -3,   3,  -0.4,   6.6,   -3,   3),
]

src = io.open("src/greybox/init.luau", encoding="utf-8").read()

# The room list comes from the module itself, via the harness below, rather than
# from a regex over the source — a room written as an expression used to fall out
# of the parse silently, and a checker that quietly stops covering a room is
# worse than no checker.
dump = """
for _, r in G.ROOMS do
	print(string.format("ROOM\t%s\t%.2f\t%.2f\t%.2f\t%.2f\t%.2f\t%.2f",
		r[1], r[2], r[3], r[4], r[5], r[6], r[7]))
end

local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" or d.ClassName == "SpawnLocation" then
		local p, s = d.Position, d.Size
		local o = d.Orientation
		table.insert(rows, string.format("%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%d",
			d.Name, p.X, p.Y, p.Z, s.X, s.Y, s.Z,
			(if o and (math.abs(o.X) > 1 or math.abs(o.Z) > 1) then 1 else 0)))
	end
end
print(table.concat(rows, "\\n"))
"""

stub = io.open("tools/roblox_stub.luau", encoding="utf-8").read()
surfaces = io.open("src/greybox/Surfaces.luau", encoding="utf-8").read()
greybox = src.replace("require(script.Surfaces)", "__M.Surfaces")
bundle = (
    stub
    + "\nlocal __M = {}\n__M.Surfaces = (function()\n" + surfaces + "\nend)()\n"
    + "local function MODULE()\n" + greybox + "\nend\nlocal G = MODULE()\nG.build()\n"
    + dump
)

with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, "dump.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    result = subprocess.run([LUAU, path], capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        sys.exit(1)

outside, ceiling, floor = [], [], []
checked = 0

for line in result.stdout.split("\n"):
    if not line.startswith("ROOM\t"):
        continue
    _, name, cx, cz, w, d, y, h = line.split("\t")
    cx, cz, w, d, y, h = (float(v) for v in (cx, cz, w, d, y, h))
    VOLUMES.append((name, cx - w / 2, cx + w / 2, y - 0.4, y + h + 0.5, cz - d / 2, cz + d / 2))

for line in result.stdout.strip().split("\n"):
    parts = line.split("\t")
    if len(parts) != 8 or parts[0].startswith("[") or parts[0] == "ROOM":
        continue
    name = parts[0]
    px, py, pz, sx, sy, sz = (float(v) / M for v in parts[1:7])
    tilted = parts[7] == "1"
    checked += 1

    # Which volumes could this part be in?
    inside = [
        v for v in VOLUMES
        if v[1] - PAD <= px <= v[2] + PAD and v[5] - PAD <= pz <= v[6] + PAD
    ]
    if not inside:
        outside.append((name, px, py, pz))
        continue

    # The one whose floor-to-ceiling band this part's centre actually sits in,
    # else the nearest by height — a part between two stacked volumes belongs
    # to whichever it is closest to.
    band = [v for v in inside if v[3] <= py <= v[4]]
    top, bottom = py + sy / 2, py - sy / 2
    if band:
        # Prefer a volume that contains the whole part: a stair shaft passes
        # through the basement and belongs to neither on its own.
        whole = [v for v in band if v[3] <= bottom and top <= v[4]]
        v = whole[0] if whole else band[0]
    else:
        v = min(inside, key=lambda v: min(abs(py - v[3]), abs(py - v[4])))

    # The stub has no rotation, so a rotated part's reported size is on the
    # wrong axes. Plan position is still right; height is not, so skip it.
    if tilted or name in ("DustVolume", "FloorMedallion", "Column"):
        continue
    if top > v[4] + 0.35:
        ceiling.append((name, v[0], px, py, pz, round(top - v[4], 2)))
    elif bottom < v[3] - 0.35:
        floor.append((name, v[0], px, py, pz, round(v[3] - bottom, 2)))


def report(title, rows, fmt):
    print(f"== {title} ==")
    if not rows:
        print("  none")
        return 0
    seen = {}
    for r in rows:
        seen.setdefault(r[0], []).append(r)
    for name, group in sorted(seen.items(), key=lambda kv: -len(kv[1]))[:14]:
        print(f"  {len(group):>3}x {fmt(group[0])}")
    if len(seen) > 14:
        print(f"  ... and {len(seen) - 14} more kinds")
    return len(rows)


print(f"{checked} parts")
a = report("floating outside every room", outside,
           lambda r: f"{r[0]:<20} at ({r[1]:.1f}, {r[2]:.1f}, {r[3]:.1f})")
b = report("through the ceiling", ceiling,
           lambda r: f"{r[0]:<20} in {r[1]}, {r[5]} m over, at ({r[2]:.1f}, {r[3]:.1f}, {r[4]:.1f})")
c = report("through the floor", floor,
           lambda r: f"{r[0]:<20} in {r[1]}, {r[5]} m under, at ({r[2]:.1f}, {r[3]:.1f}, {r[4]:.1f})")
sys.exit(1 if (a + b + c) else 0)
