#!/usr/bin/env python3
"""
minify.py — collapse BuildMall_compact.lua onto a single line.

Studio's command bar loses lines on a large multi-line paste: 227 lines went in
and 177 came out, which moves every `end` onto the wrong statement and produces
a syntax error at a line number that does not match the source. A single line
cannot lose lines.

Lua does not treat newlines as significant, so joining statements with spaces is
safe. The one hazard is a line beginning with "(", which would be read as a call
on the previous expression; this asserts none do.

    python3 minify.py
"""

import pathlib

HERE = pathlib.Path(__file__).parent
src = (HERE / "BuildMall_compact.lua").read_text()

kept = []
for raw in src.splitlines():
    line, quote, cut, i = raw, None, None, 0
    while i < len(line):                       # find "--" outside a string
        ch = line[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        elif line[i:i + 2] == "--":
            cut = i
            break
        i += 1
    if cut is not None:
        line = line[:cut]
    line = line.strip()
    if line:
        kept.append(line)

bad = [l for l in kept if l.startswith("(")]
assert not bad, f"lines starting with '(' would change meaning: {bad[:3]}"

out = HERE / "BuildMall_oneline.lua"
out.write_text(" ".join(kept) + "\n")
print(f"{out.name}: {len(kept)} statements, {out.stat().st_size} bytes")
