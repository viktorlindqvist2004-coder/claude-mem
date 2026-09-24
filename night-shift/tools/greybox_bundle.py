#!/usr/bin/env python3
"""
greybox_bundle.py — one place that knows how to run the greybox offline.

Eight checkers each build the mall against the stubbed Roblox API, and each of
them used to carry its own copy of the same six lines: read the stub, read
Surfaces, rewrite the greybox's requires, paste it all together. Which meant
that the day the greybox required one more module, eight files broke at once
and each had to be found and patched by hand.

So: the list of modules the greybox needs lives here, and adding to it is one
line. `bundle(dump)` returns a complete Luau program that builds the whole
building and then runs whatever `dump` says.
"""

import io, os, re, subprocess, sys, tempfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

# Everything the greybox requires, in the order it needs them. The name is what
# `require(something.Name)` resolves to.
MODULES = [
    ("MannequinBody", "src/shared/MannequinBody.luau"),
    ("Surfaces", "src/greybox/Surfaces.luau"),
]

# require(anything.Name) → __M.Name, the same rule the smoke test uses.
REQUIRE = re.compile(r"require\([^;\n]*?\.([A-Za-z_][A-Za-z_0-9]*)\)")


def read(path: str) -> str:
    return io.open(os.path.join(ROOT, path), encoding="utf-8").read()


def bundle(dump: str, build: bool = True) -> str:
    parts = [read("tools/roblox_stub.luau"), "\nlocal __M = {}\n"]
    for name, path in MODULES:
        src = REQUIRE.sub(lambda m: f"__M.{m.group(1)}", read(path))
        parts.append(f"\n__M.{name} = (function()\n{src}\nend)()\n")
    greybox = REQUIRE.sub(lambda m: f"__M.{m.group(1)}", read("src/greybox/init.luau"))
    parts.append("\nlocal function MODULE()\n" + greybox + "\nend\nlocal G = MODULE()\n")
    if build:
        parts.append("G.build()\n")
    parts.append(dump)
    return "".join(parts)


def run(dump: str, build: bool = True) -> str:
    """Build the mall and return whatever the dump printed. Exits on a crash."""
    luau = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "bundle.luau")
        io.open(path, "w", encoding="utf-8").write(bundle(dump, build))
        out = subprocess.run([luau, path], capture_output=True, text=True)
        if out.returncode != 0:
            sys.stderr.write(out.stdout + out.stderr)
            sys.exit(1)
        return out.stdout
