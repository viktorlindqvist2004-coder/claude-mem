#!/usr/bin/env python3
"""
check_refs.py — the cross-references a compiler cannot see.

Luau will happily compile `ctx.find("FuzeBox")`. It is the Studio session three
hours later that finds out. This checks the five kinds of string that are really
identifiers in this project:

  * every prop name a night looks up exists in the greybox
  * every ctx.<thing> a night calls is defined on the Shift context
  * every clue id exists in CaseFile
  * every rule id exists in RuleBook
  * every objective a night advances is one that night declares

Run it with tools/verify.sh, which also compiles every source and builds the
whole mall against a stubbed Roblox API.
"""

import io, re, glob, sys, os

ROOT = os.path.join(os.path.dirname(__file__), "..")
os.chdir(ROOT)

problems = []


def report(heading, found):
    print(f"== {heading} ==")
    if found:
        print("\n".join(f"  {line}" for line in found))
        problems.extend(found)
    else:
        print("  all resolve")


gb = io.open("src/greybox/init.luau", encoding="utf-8").read()
names = set(re.findall(r'P\("([^"]+)"', gb))
names |= set(re.findall(r'\.Name = "([^"]+)"', gb))
names |= set(re.findall(r'room\("([^"]+)"', gb))
names |= set(re.findall(r'\{ "([A-Za-z]+)",', gb))
names |= {"Bulkhead", "ExitSign", "Seg", "Wall", "DoorHead"}

bad = []
for path in glob.glob("src/server/**/*.luau", recursive=True):
    src = io.open(path, encoding="utf-8").read()
    for fn in ("ctx.find", "ctx.findAll", "World.first", "World.all"):
        for m in re.finditer(re.escape(fn) + r'\("([^"]+)"\)', src):
            if m.group(1) not in names:
                bad.append(f'{path}: {fn}("{m.group(1)}") — no such part in the greybox')
report("prop lookups", bad)

shift = io.open("src/server/Shift.luau", encoding="utf-8").read()
defined = set(re.findall(r"function ctx\.(\w+)", shift))
defined |= set(re.findall(r"^ctx\.(\w+) =", shift, re.M))
defined |= {"night", "clock", "MANAGER", "VOICE"}
bad = sorted(
    f"{path}: ctx.{m.group(1)}"
    for path in glob.glob("src/server/Nights/*.luau")
    for m in re.finditer(r"\bctx\.(\w+)", io.open(path, encoding="utf-8").read())
    if m.group(1) not in defined
)
report("ctx calls", bad)

clues = set(re.findall(r'id = "(C\d\d)"', io.open("src/shared/CaseFile.luau", encoding="utf-8").read()))
bad = [
    f"{path}: {m.group(1)}"
    for path in glob.glob("src/server/**/*.luau", recursive=True)
    for m in re.finditer(r'ctx\.clue\("([^"]+)"\)', io.open(path, encoding="utf-8").read())
    if m.group(1) not in clues
]
report("clue ids", bad)

rules = set(re.findall(r'id = "(\w+)"', io.open("src/shared/RuleBook.luau", encoding="utf-8").read()))
bad = [
    f"{path}: {m.group(1)}"
    for path in glob.glob("src/server/**/*.luau", recursive=True)
    for m in re.finditer(r'ctx\.(?:rule|violation)\("([^"]+)"\)', io.open(path, encoding="utf-8").read())
    if m.group(1) not in rules
]
report("rule ids", bad)

bad = []
for path in sorted(glob.glob("src/server/Nights/*.luau")):
    src = io.open(path, encoding="utf-8").read()
    declared = set(re.findall(r'\{ "(\w+)", "', src))
    used = set(re.findall(r'ctx\.(?:advance|reveal|fail|isComplete|objective)\("(\w+)"', src))
    for gap in sorted(used - declared):
        bad.append(f"{path}: objective '{gap}' used but not declared")
report("objectives", bad)

sys.exit(1 if problems else 0)
