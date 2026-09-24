#!/usr/bin/env python3
"""
check_targets.py — does the current job actually light anything?

The glow on the thing you are meant to be doing is looked up by part name in
src/shared/Targets.luau. A name with no part behind it fails silently: the
objective comes up, nothing lights, and the feature looks exactly as it looks
when it is working correctly on an objective that has no object. That is the
worst kind of bug, so it is checked rather than trusted.

Names ending in `*` are prefixes, for the things a night numbers as it makes
them (ShelfBay1, ShelfBay2). Markers created at runtime by ctx.marker are
counted too, since they are not in the greybox.
"""

import io, os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import greybox_bundle  # noqa: E402

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
dump = '''
local mall = workspace:FindFirstChild("Mall")
local seen = {}
for _, d in mall:GetDescendants() do
	if d:IsA("BasePart") then seen[d.Name] = (seen[d.Name] or 0) + 1 end
end
for k, v in seen do print(string.format("%s\\t%d", k, v)) end
'''
bundle = greybox_bundle.bundle(dump)
with tempfile.TemporaryDirectory() as t:
    f=os.path.join(t,"t.luau"); io.open(f,"w").write(bundle)
    r=subprocess.run([os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau"), f],capture_output=True,text=True)
    if r.returncode: sys.stderr.write(r.stdout+r.stderr); sys.exit(1)
built = {}
for line in r.stdout.strip().split("\n"):
    if "\t" in line:
        k,v = line.split("\t"); built[k]=int(v)

# Markers the nights create at runtime, which are not in the greybox.
src = "".join(io.open(f"src/server/Nights/Night{i}.luau").read() for i in range(1,6))
markers = set(re.findall(r'ctx\.marker\("([A-Za-z_]+)"', src))
# Markers whose name is built as it goes -- ctx.marker(`ShelfBay{i}`, ...) --
# contribute their literal prefix, which is what a `ShelfBay*` target matches.
markers |= set(re.findall(r'ctx\.marker\(`([A-Za-z_]+)\{', src))

tf = io.open("src/shared/Targets.luau").read()
body = tf[tf.index("Targets.FOR = {"):]
bad = []
for m in re.finditer(r'(\w+) = \{([^}]*)\}', body):
    obj, names = m.group(1), re.findall(r'"([^"]+)"', m.group(2))
    def count(n):
        if n.endswith("*"):
            p = n[:-1]
            c = sum(v for k, v in built.items() if k.startswith(p))
            c += sum(1 for k in markers if k.startswith(p))
            return c
        return built.get(n) or (1 if n in markers else 0)
    missing = [n for n in names if count(n) == 0]
    hit = [f"{n}x{count(n)}" for n in names if count(n) > 0]
    status = "ok " if hit else "DEAD"
    print(f"  {status} {obj:<16} {', '.join(hit) or '—'}" + (f"   MISSING: {', '.join(missing)}" if missing else ""))
    if not hit: bad.append(obj)
print()
print(f"{len(bad)} objectives would glow nothing at all" + (": " + ", ".join(bad) if bad else ""))
sys.exit(1 if bad else 0)
