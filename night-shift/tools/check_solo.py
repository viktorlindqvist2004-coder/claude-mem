#!/usr/bin/env python3
"""
check_solo.py — find the props that are one part.

Every "there's a random white box in the corridor" report in this project has
had the same cause: a prop written as a single cuboid with a furniture name on
it. `P("Trolley", V(0.6, 0.9, 0.5), ...)`. In the editor that reads as a
trolley because the name says trolley. In a dark corridor with a torch on it,
it is a box, because that is what it is.

A real object in this building is eight to thirty parts. So: anything
furniture-sized, standing on a floor, with almost nothing else near it, is a
placeholder somebody never came back to — and the fix is never to make it a
better box.
"""

import collections, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import greybox_bundle  # noqa: E402

M = 1 / 0.3

# How close another part has to be to count as belonging to the same object,
# and how many it takes before this is a thing rather than a box.
NEAR = 1.2
ENOUGH = 3

# Structure, surfaces and things that genuinely are one part.
SKIP = (
    "Wall", "Floor", "Ceiling", "Envelope", "Parapet", "Facade", "Roof", "Slab",
    "Trim", "Band", "Joint", "Tile", "Grid", "Frame", "Reveal", "Mullion",
    "Column", "Pilaster", "Cornice", "Plinth", "Step", "Stair", "Ramp", "Kerb",
    "Pavement", "Forecourt", "Yard", "Duct", "Pipe", "Conduit", "Sprinkler",
    "Sign", "Label", "Board", "Face", "Panel", "Poster", "Card", "Plate",
    "Notice", "Picture", "Canvas", "Mirror", "Glass", "Mat", "Puddle", "Patch",
    "Dust", "Marker", "Spawn", "Volume", "Skirting", "Dado", "Shadow", "Margin",
    "Block", "Bed", "Border", "Medallion", "Kick", "Cone", "Bollard", "Cleat",
    "Riser", "Hoarding", "Shutter", "Curtain", "Banner", "Flag", "Bunting",
    # Parts of multi-part objects that are spread wider than NEAR: the leaves
    # of a potted tree, the pot under them, a carton in a shop window.
    "Foliage", "PlanterPot", "Trunk", "WindowStock", "Facing", "Garment",
)

dump = """
local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" and d.Transparency < 0.9 then
		local p, s = d.Position, d.Size
		table.insert(rows, string.format("P\\t%s\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f\\t%.2f",
			d.Name, p.X, p.Y, p.Z, s.X, s.Y, s.Z))
	end
end
print(table.concat(rows, "\\n"))
"""

parts = []
for line in greybox_bundle.run(dump).split("\n"):
    f = line.split("\t")
    if f[0] != "P" or len(f) < 8:
        continue
    name = f[1]
    px, py, pz, sx, sy, sz = (float(v) / M for v in f[2:8])
    parts.append((name, px, py, pz, sx, sy, sz))

suspects = []
for name, px, py, pz, sx, sy, sz in parts:
    if any(k in name for k in SKIP):
        continue
    # Furniture-sized, and standing on something rather than fixed to a wall.
    if not (0.3 <= sx <= 2.5 and 0.45 <= sy <= 2.2 and 0.3 <= sz <= 2.5):
        continue
    near = 0
    for other, ox, oy, oz, osx, osy, osz in parts:
        if other == name and (ox, oy, oz) == (px, py, pz):
            continue
        if abs(ox - px) < NEAR and abs(oz - pz) < NEAR and abs(oy - py) < NEAR:
            near += 1
            if near >= ENOUGH:
                break
    if near < ENOUGH:
        suspects.append((name, px, py, pz, sx, sy, sz, near))

print(f"  {len(parts)} parts")
print("  == props that are one part ==")
if not suspects:
    print("    none")
for name, px, py, pz, sx, sy, sz, near in sorted(suspects, key=lambda s: s[0]):
    print(f"    {name:20s} ({px:7.1f}, {pz:7.1f})  {sx:.2f} x {sy:.2f} x {sz:.2f}"
          f"  — {near} other part{'' if near == 1 else 's'} near it")
sys.exit(1 if suspects else 0)
