#!/usr/bin/env python3
"""
check_placement.py — find the props standing in the middle of the floor.

"It is all just scattered about, there is no logic to it." That is a real
complaint and it has a measurable shape: in a real room, objects are against
walls, in corners, or in a deliberate row. What they are not is dotted around
the open floor at arbitrary offsets from the room's centre — which is exactly
what a prop written as `at(cx + 1.1, y, cz - 0.6)` produces, because the room's
centre is the only thing the code knows about.

So this finds every free-standing prop that is:

  * standing on the floor (its underside is near the slab),
  * small enough to be furniture rather than structure,
  * and more than ISLAND_CLEARANCE from every wall of the room it is in.

Anything on the ISLANDS list is allowed to be out in the open, because some
things genuinely are: a table, a kiosk, a rack, an escalator, an island unit.
Everything else on the list is a bucket somebody left in a walkway.
"""

import io, os, subprocess, sys, tempfile

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

# How far from a wall a thing has to be before it counts as adrift.
ISLAND_CLEARANCE = 1.6

# Things that belong in open floor. A room with none of these in it is a
# corridor, and a room where everything is against a wall is a waiting room.
ISLANDS = (
    "Table", "Seat", "Chair", "Kiosk", "Escalator", "Column", "Planter",
    "Pot", "Trunk", "Foliage", "Bench", "Rack", "Shelf", "Rail", "Plinth",
    "Mannequin", "Checkout", "Belt", "Till", "Desk", "Counter", "Servery",
    "Fountain", "Trolley", "Cage", "Pallet", "Ladder", "Lectern", "Stack",
    "Carton", "Box", "Bay", "Freezer", "Cabinet", "Island", "Medallion",
    "Border", "Band", "Joint", "Tile", "Line", "Symbol", "Number", "Cage",
    "Bollard", "Lamp", "Car", "Wheel", "Hub", "Aerial", "Mirror", "Grille",
    "Bumper", "Plate", "Arch", "Pillar", "Screen", "Glass", "Body", "Roof",
    "Sill", "Bonnet", "Boot", "Cabin", "Door", "Handle", "Step", "Stair",
    "Riser", "Cubicle", "Pan", "Cistern", "Vanity", "Basin", "Tap", "Puddle",
    "Dust", "Marker", "Spawn", "Ramp", "Dock", "Shutter", "Duct", "Pipe",
    "Conduit", "Hanger", "Grid", "Sprinkler", "Speaker", "Exit", "Tube",
    "Wall", "Floor", "Ceiling", "Skirting", "Dado", "Shadow", "Envelope",
    "Parapet", "Facade", "Brick", "Fascia", "Awning", "Sign", "Void",
    "Loose", "Angle", "Push", "Frame", "Head", "Reveal", "Threshold",
    "Mullion", "Coffer", "Margin", "End", "Shaft", "Service", "Basement",
    "Atrium", "Mall", "F3", "FF", "Forecourt", "Pavement", "Kerb", "Aisle",
    "Yard", "Canopy", "Bin", "Shelter", "Post", "Column", "Stay", "Rooflight",
)

dump = """
for _, r in G.ROOMS do
	print(string.format("ROOM\\t%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f",
		r[1], r[2], r[3], r[4], r[5], r[6], r[7]))
end
local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" then
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
    path = os.path.join(tmp, "placement.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    out = subprocess.run([LUAU, path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(out.stdout + out.stderr)
        sys.exit(1)

rooms, parts = [], []
for line in out.stdout.split("\n"):
    f = line.split("\t")
    if f[0] == "ROOM":
        rooms.append((f[1], *(float(v) for v in f[2:8])))
    elif f[0] == "P" and len(f) == 8:
        parts.append((f[1], *(float(v) / M for v in f[2:8])))

adrift = []
for name, px, py, pz, sx, sy, sz in parts:
    if any(k in name for k in ISLANDS):
        continue
    # Furniture-sized, and standing on something.
    if sx > 3.0 or sz > 3.0 or sy > 2.4:
        continue
    for rname, cx, cz, w, d, y, h in rooms:
        if abs(px - cx) > w / 2 or abs(pz - cz) > d / 2:
            continue
        if py - sy / 2 > y + 0.55:
            break          # on a shelf, a counter or a table, not on the floor
        clearance = min(
            abs((cx - w / 2) - (px - sx / 2)), abs((cx + w / 2) - (px + sx / 2)),
            abs((cz - d / 2) - (pz - sz / 2)), abs((cz + d / 2) - (pz + sz / 2)),
        )
        if clearance > ISLAND_CLEARANCE:
            adrift.append((name, rname, px, pz, round(clearance, 1)))
        break

print(f"{len(parts)} parts, {len(rooms)} rooms")
print("== free-standing in the middle of a floor ==")
if not adrift:
    print("  none")
seen = {}
for a in adrift:
    seen.setdefault((a[0], a[1]), []).append(a)
for (name, room), group in sorted(seen.items(), key=lambda kv: -kv[1][0][4]):
    a = group[0]
    print(f"  {len(group):>3}x {name:<18} in {room:<16} {a[4]} m from any wall, at ({a[2]:.1f}, {a[3]:.1f})")
sys.exit(1 if adrift else 0)
