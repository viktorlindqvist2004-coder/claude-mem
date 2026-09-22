#!/usr/bin/env python3
"""
build_rbxmx.py — wrap BuildMall.lua as a Roblox model file.

Copy-pasting 800 lines through a text editor into the Studio script editor gets
truncated silently: the clipboard drops part of it and the module ends up half
written, with no error to show for it. A .rbxmx goes in through
"Insert from File" and cannot be truncated.

    python3 build_rbxmx.py
"""

import pathlib
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).parent
src = (HERE / "BuildMall.lua").read_text()

# CDATA ends at "]]>". The Lua block comments contain "]]" but never "]]>".
assert "]]>" not in src, "source contains a CDATA terminator and needs escaping"

out = HERE / "BuildMall.rbxmx"
out.write_text(
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime"'
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    ' xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n'
    '  <Item class="ModuleScript" referent="RBX0">\n'
    '    <Properties>\n'
    '      <string name="Name">BuildMall</string>\n'
    f'      <ProtectedString name="Source"><![CDATA[{src}]]></ProtectedString>\n'
    '      <bool name="Disabled">false</bool>\n'
    '    </Properties>\n'
    '  </Item>\n'
    '</roblox>\n'
)

tree = ET.parse(out)
source = tree.getroot().find("Item/Properties/ProtectedString[@name='Source']").text
print(f"{out.name}: {len(source)} chars, {source.count(chr(10)) + 1} lines, XML parses")
