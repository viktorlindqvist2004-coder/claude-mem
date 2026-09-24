#!/usr/bin/env python3
"""
check_zfight.py — the walls that flicker when you walk.

Two surfaces in exactly the same plane, overlapping, is a tie the depth buffer
cannot break: the renderer picks whichever won this frame and picks the other
one next frame, and the result is a wall that shimmers as the camera moves.

It is not a bug you can see in a screenshot and it is not a bug you can find by
reading code, because the two parts are usually written hundreds of lines
apart -- a skirting board written from a room's centre and a wall written from
its corner that happen to agree to the millimetre.

So it is arithmetic. For every pair of parts that share a cell, check whether
any of their faces sit within a hair of the same plane and overlap on the other
two axes by more than a token amount. Anything this finds is something a player
will see moving.
"""

import io, os, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import greybox_bundle  # noqa: E402

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
M = 1 / 0.3

COINCIDENT = 0.004      # how close two planes have to be to fight, in metres
MIN_OVERLAP = 0.25      # how much shared face before it is worth reporting

dump = """
local mall = workspace:FindFirstChild("Mall")
local rows = {}
for _, d in mall:GetDescendants() do
	if d.ClassName == "Part" and d.Transparency < 0.95 then
		local p, s = d.Position, d.Size
		local o = d.Orientation
		if not (o and (math.abs(o.X) > 0.5 or math.abs(o.Y) > 0.5 or math.abs(o.Z) > 0.5)) then
			table.insert(rows, string.format("%s\\t%.4f\\t%.4f\\t%.4f\\t%.4f\\t%.4f\\t%.4f",
				d.Name, p.X, p.Y, p.Z, s.X, s.Y, s.Z))
		end
	end
end
print(table.concat(rows, "\\n"))
"""

bundle = greybox_bundle.bundle(dump)

with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, "zfight.luau")
    io.open(path, "w", encoding="utf-8").write(bundle)
    out = subprocess.run([LUAU, path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(out.stdout + out.stderr)
        sys.exit(1)

parts = []
for line in out.stdout.strip().split("\n"):
    f = line.split("\t")
    if len(f) == 7:
        n = f[0]
        px, py, pz, sx, sy, sz = (float(v) / M for v in f[1:7])
        parts.append((n, (px, py, pz), (sx, sy, sz)))

CELL = 3.0
grid = {}
for i, (n, p, s) in enumerate(parts):
    for gx in range(int((p[0] - s[0] / 2) // CELL), int((p[0] + s[0] / 2) // CELL) + 1):
        for gz in range(int((p[2] - s[2] / 2) // CELL), int((p[2] + s[2] / 2) // CELL) + 1):
            grid.setdefault((gx, gz), []).append(i)


def overlap(a_c, a_s, b_c, b_s):
    return min(a_c + a_s / 2, b_c + b_s / 2) - max(a_c - a_s / 2, b_c - b_s / 2)


found = {}
checked = set()
for cell in grid.values():
    for a in range(len(cell)):
        for b in range(a + 1, len(cell)):
            i, j = cell[a], cell[b]
            key = (i, j) if i < j else (j, i)
            if key in checked:
                continue
            checked.add(key)
            na, pa, sa = parts[i]
            nb, pb, sb = parts[j]
            for axis in (0, 1, 2):
                o1, o2 = [k for k in (0, 1, 2) if k != axis]
                ov1 = overlap(pa[o1], sa[o1], pb[o1], sb[o1])
                ov2 = overlap(pa[o2], sa[o2], pb[o2], sb[o2])
                if ov1 < MIN_OVERLAP or ov2 < MIN_OVERLAP:
                    continue
                #[[
                #  A butt joint is not a fight. Two parts meeting end to end
                #  share a plane, but the faces point away from each other and
                #  only one of them is ever visible. What flickers is two
                #  parts that interpenetrate, or two slabs laid on the same
                #  level -- both of which overlap on this axis as well.
                #]]
                if overlap(pa[axis], sa[axis], pb[axis], sb[axis]) <= 0.002:
                    continue
                for fa in (pa[axis] - sa[axis] / 2, pa[axis] + sa[axis] / 2):
                    for fb in (pb[axis] - sb[axis] / 2, pb[axis] + sb[axis] / 2):
                        if abs(fa - fb) < COINCIDENT:
                            pair = tuple(sorted((na, nb)))
                            found.setdefault(pair, []).append((pa, round(ov1 * ov2, 2)))

print(f"{len(parts)} axis-aligned opaque parts")
print("== coplanar faces that will flicker ==")
if not found:
    print("  none")
for pair, hits in sorted(found.items(), key=lambda kv: -sum(h[1] for h in kv[1]))[:20]:
    worst = max(hits, key=lambda h: h[1])
    area = round(sum(h[1] for h in hits), 1)
    print(f"  {len(hits):>4}x {pair[0]:<18} / {pair[1]:<18} {area} m2, e.g. "
          f"({worst[0][0]:.1f}, {worst[0][1]:.1f}, {worst[0][2]:.1f})")
sys.exit(1 if found else 0)
