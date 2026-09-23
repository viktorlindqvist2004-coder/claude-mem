#!/usr/bin/env python3
"""
check_floating.py — what is holding this up?

Not "is it high" -- check_clearance already asks that, and it only looks above
head height. This asks the question that actually matters about every object in
the building: is there anything underneath it.

A part is supported if something overlaps it in plan and its top is at or just
below this part's bottom. Nothing else counts. A carton resting 34 cm above the
shelf it is meant to be on passes every other check in the repository -- it is
in the right room, it is not in a doorway, it is not through the ceiling -- and
it is obviously wrong the moment anybody looks at it.

Things that are screwed to walls rather than standing on floors are excluded by
name, because a wall is support and this cannot see sideways.
"""

import io, os, subprocess, sys, tempfile

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

# Hung, screwed, bracketed or built in: supported by something this cannot see.
WALL_MOUNTED = (
    "Sign", "Notice", "Poster", "Paper", "Label", "Plate", "Board", "Rail",
    "Hook", "Coat", "Picture", "Canvas", "Frame", "Clock", "Seg", "Exit",
    "Tube", "Grid", "Sprinkler", "Speaker", "Duct", "Pipe", "Conduit",
    "Hanger", "Cable", "Camera", "Monitor", "Lamp", "Light", "Bulkhead",
    "Fascia", "Awning", "Banner", "Shutter", "Curtain", "Mirror", "Vent",
    "Bracket", "Strap", "Wall", "Ceiling", "Soffit", "Margin", "Coffer",
    "Beam", "Truss", "Balustrade", "Handrail", "Glazing", "Mullion",
    "Envelope", "Parapet", "Roof", "Brick", "Skirting", "Dado", "Shadow",
    "Housing", "Guide", "Arm", "Column", "Post", "Upright", "Stay", "Leg",
    "Foot", "Dust", "Marker", "Spawn", "Floor", "Step", "Stair", "Tread",
    "Riser", "Cleat", "Comb", "Skirt", "Void", "Loose", "Angle", "Joint",
    "Line", "Border", "Medallion", "Band", "Tile", "Water", "Puddle",
    "Drain", "Kerb", "Edge", "Lip", "Buffer", "Threshold", "Reveal",
    "Head", "Door", "Push", "Hinge", "Handle", "Latch", "Hasp", "Bar",
    "Screw", "Seam", "Flex", "Filter", "Slot", "Gauge", "Valve", "Cord",
    "Grip", "Switch", "Carrier", "Cover", "Back", "Rim", "Cap", "Stem",
    "Jet", "Grille", "Palisade", "Hedge", "Verge", "Arrow", "Symbol",
    "Forecourt", "Pavement", "Yard", "Tarmac", "Island", "Bay", "Aisle",
    # Pinned, hung or slotted into something the plan view cannot see.
    "Card", "Directory", "Hours", "Number", "Valance", "Limit", "Cage",
    "Point", "Jacket", "Apron", "Front", "Rack", "ToLet", "Strut",
)

dump = """
local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" then
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
greybox = io.open("src/greybox/init.luau", encoding="utf-8").read()
greybox = greybox.replace("require(script.Surfaces)", "__M.Surfaces")
bundle = (
    stub
    + "\nlocal __M = {}\n__M.Surfaces = (function()\n" + surfaces + "\nend)()\n"
    + "local function MODULE()\n" + greybox + "\nend\nlocal G = MODULE()\nG.build()\n"
    + dump
)

with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, "floating.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    out = subprocess.run([LUAU, path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(out.stdout + out.stderr)
        sys.exit(1)

parts = []
for line in out.stdout.strip().split("\n"):
    f = line.split("\t")
    if len(f) == 8:
        parts.append((f[0], *(float(v) / M for v in f[1:7]), f[7] == "1"))

CELL = 2.0
grid = {}
for i, (n, px, py, pz, sx, sy, sz, tilted) in enumerate(parts):
    for gx in range(int((px - sx / 2) // CELL), int((px + sx / 2) // CELL) + 1):
        for gz in range(int((pz - sz / 2) // CELL), int((pz + sz / 2) // CELL) + 1):
            grid.setdefault((gx, gz), []).append(i)

GAP = 0.12          # how much daylight under a thing before it is floating

floating = []
for i, (n, px, py, pz, sx, sy, sz, tilted) in enumerate(parts):
    if tilted or any(k in n for k in WALL_MOUNTED):
        continue
    bottom = py - sy / 2
    if bottom <= 0.05:
        continue        # on the ground
    held = False
    seen = set()
    for gx in range(int((px - sx / 2) // CELL), int((px + sx / 2) // CELL) + 1):
        for gz in range(int((pz - sz / 2) // CELL), int((pz + sz / 2) // CELL) + 1):
            for j in grid.get((gx, gz), ()):
                if j == i or j in seen:
                    continue
                seen.add(j)
                _, ox, oy, oz, osx, osy, osz, _ = parts[j]
                if abs(ox - px) >= (sx + osx) / 2 or abs(oz - pz) >= (sz + osz) / 2:
                    continue
                ot = oy + osy / 2
                ob = oy - osy / 2
                if ot >= bottom - GAP and ob < bottom - 0.01:
                    held = True
                    break
            if held:
                break
        if held:
            break
    if not held:
        floating.append((n, px, py, pz, round(bottom, 2)))

print(f"{len(parts)} parts")
print("== standing on nothing ==")
if not floating:
    print("  none")
seen = {}
for f in floating:
    seen.setdefault(f[0], []).append(f)
for name, group in sorted(seen.items(), key=lambda kv: -len(kv[1]))[:20]:
    g = group[0]
    print(f"  {len(group):>4}x {name:<20} {g[4]} m up, e.g. ({g[1]:.1f}, {g[2]:.1f}, {g[3]:.1f})")
sys.exit(1 if floating else 0)
