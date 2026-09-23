#!/usr/bin/env python3
"""
check_overlap.py — find the props that are inside each other.

"It is all just standing about haphazardly" has one cause the eye picks up
instantly and no other checker in here looks for: two objects occupying the
same space. A bench through a bench, a bin inside a planter, a chair halfway
into a table. Nothing in the world is ever like that, so the moment one is on
screen the whole room stops being a place.

It happens because props are placed by two different bits of code that do not
know about each other -- one function dresses the feature, another dresses the
room it stands in, and both put a bench down.

So: every pair of free-standing props whose boxes interpenetrate by more than a
token amount, on all three axes at once. Structure is skipped (a wall and its
skirting are meant to share space, a shelf is meant to be inside its own unit),
and so is anything belonging to the same assembly, because the parts of one
object are supposed to touch.
"""

import io, os, subprocess, sys, tempfile, collections

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

# How deep two boxes have to be into each other before it is worth saying. Two
# parts of the same piece of furniture routinely share a centimetre or two.
BITE = 0.12

#[[
#  Structure, and things that are meant to contain other things. A floor is
#  inside every room; a shelf is inside its own gondola; a garment is on its
#  rail. None of that is the bug.
#]]
SKIP = (
    "Wall", "Floor", "Ceiling", "Envelope", "Parapet", "Facade", "Roof",
    "Skirting", "Dado", "Shadow", "Trim", "Band", "Joint", "Tile", "Grid",
    "Frame", "Head", "Reveal", "Mullion", "Coffer", "Pilaster", "Column",
    "Cornice", "Plinth", "Riser", "Step", "Stair", "Ramp", "Kerb", "Pavement",
    "Forecourt", "Yard", "Slab", "Screed", "Beam", "Upright", "Brace", "Deck",
    "Bearer", "Foot", "Leg", "Post", "Rail", "Strut", "Bracket", "Hanger",
    "Duct", "Pipe", "Conduit", "Sprinkler", "Speaker", "Light", "Lamp",
    "Bulb", "Tube", "Sign", "Label", "Face", "Glass", "Mirror", "Canvas",
    "Facing", "Garment", "Stock", "Paper", "Leaf", "Dust", "Marker", "Spawn",
    "Shutter", "Slat", "Curtain", "Awning", "Valance", "Fascia", "Hoarding",
    "Bunting", "Flag", "Banner", "Poster", "Card", "Plate", "Screw", "Handle",
    "Latch", "Hinge", "Lock", "Vent", "Grille", "Castor", "Wheel", "Drain",
    "Lining", "Bed", "Well", "Blind", "Kick", "Cap", "Top", "Base", "Rim",
    "Pot", "Trunk", "Foliage", "Soil", "Branch", "Shelf", "Windscreen",
    "Stud", "PushBar", "Tab", "Hook", "Curtain",
)

#[[
#  Parts of one object that do not share a name stem. A windscreen is part of
#  a car; the freezer is the chiller cabinet at the end of the run with a
#  different label on it. Without these the checker reports an object for
#  containing itself.
#]]
ALIAS = {
    "Freezer": "Chiller", "PoleStripe": "BarberPole", "PoleCap": "BarberPole",
    "KeepLeftDisc": "KeepLeft", "ExhaustElbow": "Exhaust", "AHUSeam": "AHU",
    "PayphoneHood": "Payphone", "SeatBack": "Chair", "SeatPad": "Chair",
}

dump = """
local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" and d.Transparency < 0.9 then
		local p, s = d.Position, d.Size
		table.insert(rows, string.format("P\\t%s\\t%.3f\\t%.3f\\t%.3f\\t%.3f\\t%.3f\\t%.3f\\t%.1f",
			d.Name, p.X, p.Y, p.Z, s.X, s.Y, s.Z, (d.Orientation and d.Orientation.Y) or 0))
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
    path = os.path.join(tmp, "overlap.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    out = subprocess.run([LUAU, path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(out.stdout + out.stderr)
        sys.exit(1)

parts = []
for line in out.stdout.split("\n"):
    f = line.split("\t")
    if f[0] != "P" or len(f) < 8:
        continue
    name = f[1]
    if any(k in name for k in SKIP):
        continue
    px, py, pz, sx, sy, sz = (float(v) / M for v in f[2:8])
    yaw = float(f[8]) if len(f) > 8 else 0.0
    # A turned part's axis-aligned box is bigger than it is, which invents
    # overlaps. Take the smaller footprint for anything off-square.
    if abs(yaw) % 90 > 1.0:
        sx = sz = min(sx, sz)
    if max(sx, sy, sz) > 4.0:
        continue                      # structure that slipped the name filter
    parts.append((name, px, py, pz, sx, sy, sz))

# Same assembly = same name stem. "BenchSlat" and "BenchLeg" are one bench.
def stem(n):
    for k in ("Bench", "Trolley", "Kiosk", "Fountain", "Chair", "Table", "Desk",
              "Locker", "Bin", "Planter", "Tree", "Basin", "Cubicle", "Gondola",
              "Rack", "Checkout", "Till", "Belt", "Chiller", "Bakery", "Car",
              "Mannequin", "Vending", "Directory", "Clock", "Pump"):
        if n.startswith(k):
            return ALIAS.get(k, k)
    return ALIAS.get(n, n)

hits = collections.Counter()
where = {}
n = len(parts)
for i in range(n):
    an, ax, ay, az, asx, asy, asz = parts[i]
    for j in range(i + 1, n):
        bn, bx, by, bz, bsx, bsy, bsz = parts[j]
        if abs(ax - bx) > 3.0 or abs(az - bz) > 3.0:
            continue
        ox = (asx + bsx) / 2 - abs(ax - bx)
        oy = (asy + bsy) / 2 - abs(ay - by)
        oz = (asz + bsz) / 2 - abs(az - bz)
        # A chair is pushed under a desk. That is what chairs do.
        bite = BITE
        pair = {stem(an), stem(bn)}
        if pair == {"Chair", "Desk"} or pair == {"Chair", "Table"}:
            bite = 0.35
        if ox <= bite or oy <= bite or oz <= bite:
            continue
        sa, sb = stem(an), stem(bn)
        # One assembly: the same stem, or one name built on the other
        # ("Payphone" and "PayphoneHood" are one telephone).
        if sa == sb or sa.startswith(sb) or sb.startswith(sa):
            continue
        key = tuple(sorted((sa, sb)))
        hits[key] += 1
        if os.environ.get("PAIRS"):
            print(f"      {an}@({ax:.2f},{ay:.2f},{az:.2f}) {asx:.2f}x{asy:.2f}x{asz:.2f}"
                  f"  ~  {bn}@({bx:.2f},{by:.2f},{bz:.2f}) {bsx:.2f}x{bsy:.2f}x{bsz:.2f}"
                  f"  bite {ox:.2f}/{oy:.2f}/{oz:.2f}")
        if key not in where or min(ox, oy, oz) > where[key][0]:
            where[key] = (min(ox, oy, oz), ax, ay, az)

print(f"  {len(parts)} free-standing props")
print("  == props inside other props ==")
if not hits:
    print("    none")
for (a, b), count in hits.most_common(30):
    bite, x, y, z = where[a, b] if (a, b) in where else where[b, a]
    print(f"    {count:4d}x {a:18s} / {b:18s} {bite:.2f} m deep, e.g. ({x:.1f}, {y:.1f}, {z:.1f})")
