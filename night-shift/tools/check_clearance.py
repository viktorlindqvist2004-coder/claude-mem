#!/usr/bin/env python3
"""
check_clearance.py — find what is standing in the way, and what is hanging up
in the ceiling with nothing holding it there.

Two complaints that a build-by-code greybox produces over and over, and that
check_geometry.py does not catch because nothing here is outside a room or
through a slab:

  * **blocking a door** — a prop placed by the room's centre-relative maths
    that happens to land in the doorway, or right in front of it. The room is
    correct, the prop is correct, and you cannot get in.
  * **loose in the ceiling** — a prop whose underside is above head height and
    that is not a fitting. A ceiling grid, a sprinkler, a speaker, a sign and a
    light belong up there. A crate does not: it reads as clutter floating in
    the roof, or as ductwork somebody gave up on.

Both are printed as coordinates you can fly to.
"""

import io, os, subprocess, sys, tempfile

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

# Structure, and the things that hang off it. None of this is a prop: it is
# what makes the room a room and the doorway a doorway, so it is never in the
# way and never floating.
STRUCTURE = (
    "Wall", "Door", "Floor", "Ceiling", "Skirting", "Dado", "ShadowGap",
    "FloorBorder", "FloorMedallion", "Threshold", "DustVolume", "Column",
    "Shopfront", "BrickCourse", "Beam", "Truss", "Soffit", "Fascia",
    "Balustrade", "Handrail", "Glazing", "Mullion", "Riser", "Slab",
    "Stair", "Step", "Landing", "Kerb", "Tarmac", "Bay", "Lintel", "Pier",
    # A shopfront is the opening. Its reveal, guides, housing, glazing and the
    # curtain that comes down in it are the doorway, not something left in it.
    "Shutter", "ShopReveal", "ShopThreshold", "Mullion", "WindowSill",
    "Flyposting", "Glass",
    # A fire door and its ironmongery: the leaf, the frame, the push bar and
    # the plate on it all live in the opening, because they are the door.
    "ExitDoor", "PushBar", "PushBarMount", "ExitPlate",
)

dump = """
for _, r in G.ROOMS do
	local doors = {}
	for _, dr in (r[8] or {}) do
		table.insert(doors, string.format("%s:%.2f:%.2f", dr[1], dr[2], dr[3]))
	end
	print(string.format("ROOM\\t%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%s",
		r[1], r[2], r[3], r[4], r[5], r[6], r[7], table.concat(doors, ",")))
end

local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" or d.ClassName == "SpawnLocation" then
		local p, s = d.Position, d.Size
		table.insert(rows, string.format("P\\t%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f",
			d.Name, p.X, p.Y, p.Z, s.X, s.Y, s.Z))
	end
end
print(table.concat(rows, "\\n"))
"""

stub = io.open("tools/roblox_stub.luau", encoding="utf-8").read()
surfaces = io.open("src/greybox/Surfaces.luau", encoding="utf-8").read()
greybox = io.open("src/greybox/init.luau", encoding="utf-8").read()
greybox = greybox.replace("require(script.Surfaces)", "__M.Surfaces")
bundle = (
    stub
    + "\nlocal __M = {}\n__M.Surfaces = (function()\n" + surfaces + "\nend)()\n"
    + "local function MODULE()\n" + greybox + "\nend\nlocal G = MODULE()\nG.build()\n"
    + dump
)

with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, "clearance.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    out = subprocess.run([LUAU, path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(out.stdout + out.stderr)
        sys.exit(1)

rooms, parts = [], []
for line in out.stdout.split("\n"):
    f = line.split("\t")
    if f[0] == "ROOM":
        name, cx, cz, w, d, y, h = f[1], *(float(v) for v in f[2:8])
        doors = [x for x in (f[8] if len(f) > 8 else "").split(",") if x]
        rooms.append((name, cx, cz, w, d, y, h, doors))
    elif f[0] == "P" and len(f) == 8:
        parts.append((f[1], *(float(v) / M for v in f[2:8])))

def structural(name):
    return any(k in name for k in STRUCTURE)


# Index every part by a coarse plan cell, so "is anything touching this?" is a
# handful of comparisons rather than 3600.
CELL = 2.0
grid = {}
for i, (pname, px, py, pz, sx, sy, sz) in enumerate(parts):
    for gx in range(int((px - sx / 2) // CELL), int((px + sx / 2) // CELL) + 1):
        for gz in range(int((pz - sz / 2) // CELL), int((pz + sz / 2) // CELL) + 1):
            grid.setdefault((gx, gz), []).append(i)


def supported(px, pz, sx, sz, bottom, top):
    """Is something touching this from below, or hanging it from above?"""
    seen = set()
    for gx in range(int((px - sx / 2) // CELL), int((px + sx / 2) // CELL) + 1):
        for gz in range(int((pz - sz / 2) // CELL), int((pz + sz / 2) // CELL) + 1):
            for i in grid.get((gx, gz), ()):
                if i in seen:
                    continue
                seen.add(i)
                _, ox, oy, oz, osx, osy, osz = parts[i]
                if abs(ox - px) >= (sx + osx) / 2 or abs(oz - pz) >= (sz + osz) / 2:
                    continue
                ob, ot = oy - osy / 2, oy + osy / 2
                if ot >= bottom - 0.25 and ob <= bottom + 0.05:
                    return True          # something under it
                if ob <= top + 0.25 and ot >= top - 0.05:
                    return True          # something over it
    return False


# ── The volume a door needs kept clear ──────────────────────────────────────
# The opening itself, plus a metre and a third either side of the wall. A prop
# half a metre in front of a door is as bad as a prop in it — but a desk in the
# middle of a five-metre room whose corner reaches the edge of that band is not
# in anybody's way, so the width is the opening and not a stud more.
REACH = 1.3
LATERAL = 0.1
zones = []
for name, cx, cz, w, d, y, h, doors in rooms:
    for door in doors:
        side, off, width = door.split(":")
        off, width = float(off), float(width)
        half = width / 2 + LATERAL
        if side == "E":
            zones.append((name, side, cx + w / 2 - REACH, cx + w / 2 + REACH,
                          cz + off - half, cz + off + half, y))
        elif side == "W":
            zones.append((name, side, cx - w / 2 - REACH, cx - w / 2 + REACH,
                          cz + off - half, cz + off + half, y))
        elif side == "N":
            zones.append((name, side, cx + off - half, cx + off + half,
                          cz + d / 2 - REACH, cz + d / 2 + REACH, y))
        elif side == "S":
            zones.append((name, side, cx + off - half, cx + off + half,
                          cz - d / 2 - REACH, cz - d / 2 + REACH, y))

blocking = []
for pname, px, py, pz, sx, sy, sz in parts:
    if structural(pname):
        continue
    bottom, top = py - sy / 2, py + sy / 2
    for zname, side, x0, x1, z0, z1, fy in zones:
        # Only things you would walk into: anything whose body is between
        # ankle and head height on that floor.
        if top < fy + 0.15 or bottom > fy + 2.2:
            continue
        if px + sx / 2 > x0 and px - sx / 2 < x1 and pz + sz / 2 > z0 and pz - sz / 2 < z1:
            blocking.append((pname, zname, side, px, py, pz))
            break

# ── Loose in the ceiling ────────────────────────────────────────────────────
#
# Not "high up" — plenty of things are legitimately high up. Floating: the
# underside is over head height and there is nothing under it holding it up
# and nothing over it hanging it from. A tree canopy has a trunk. A speaker
# has a ceiling. A crate three metres in the air has neither.
loose = []
for pname, px, py, pz, sx, sy, sz in parts:
    if structural(pname):
        continue
    bottom, top = py - sy / 2, py + sy / 2
    room = None
    for rname, cx, cz, w, d, y, h, _ in rooms:
        if abs(px - cx) <= w / 2 and abs(pz - cz) <= d / 2 and y - 0.6 <= py <= y + h + 0.6:
            room = (rname, y, h)
            break
    if room is None or bottom <= room[1] + 2.3:
        continue
    if supported(px, pz, sx, sz, bottom, top):
        continue
    loose.append((pname, room[0], px, py, pz, round(bottom - room[1], 2)))


def report(title, rows, fmt):
    print(f"== {title} ==")
    if not rows:
        print("  none")
        return 0
    seen = {}
    for r in rows:
        seen.setdefault((r[0], r[1]), []).append(r)
    for _, group in sorted(seen.items(), key=lambda kv: -len(kv[1]))[:20]:
        print(f"  {len(group):>3}x {fmt(group[0])}")
    return len(rows)


print(f"{len(parts)} parts, {len(rooms)} rooms, {len(zones)} doorways")
a = report("standing in a doorway", blocking,
           lambda r: f"{r[0]:<18} blocks {r[1]} {r[2]} door, at ({r[3]:.1f}, {r[4]:.1f}, {r[5]:.1f})")
b = report("loose up in the ceiling", loose,
           lambda r: f"{r[0]:<18} in {r[1]}, {r[5]} m up, at ({r[2]:.1f}, {r[3]:.1f}, {r[4]:.1f})")
sys.exit(1 if (a + b) else 0)
