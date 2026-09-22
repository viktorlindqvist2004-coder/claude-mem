# studio/

## BuildMall.lua — the whole mall, in one paste

No Rojo. No Git. No install. Nothing to set up.

1. Open **Roblox Studio** and make a new place (**Baseplate** is fine).
2. In the **Explorer** panel, right-click **ServerStorage** → **Insert from File…**
3. Choose **`BuildMall.rbxmx`**. A ModuleScript called `BuildMall` appears inside
   ServerStorage with all 808 lines already in it.
4. Click the **command bar** — the box along the bottom of the Studio window that says
   *"Execute a command with ⌘⏎"* — clear whatever is in it, and run this one line:

```lua
require(game.ServerStorage.BuildMall)()
```

Press **⌘ + Enter** (Ctrl+Enter on Windows) or click **Run**.

**Do not paste `BuildMall.lua` into the script editor by hand.** Eight hundred lines
through the clipboard gets silently truncated — the module ends up half written, the call
fails on a function that is not there, and nothing appears to happen. The `.rbxmx` cannot
be truncated. Regenerate it after editing the Lua with:

```bash
python3 build_rbxmx.py
```

It builds the whole building — four floors, twelve wings, the units with their interiors,
the service corridors, the atrium with escalators and a lift, the roof structure, and the
Great Clock reading `03:33` — deletes the default baseplate, sets the night lighting, and
puts cloud in the sky. It prints a part count when it finishes, and takes up to a minute.

Run the same line again to rebuild; it clears the old one first. To remove it:

```lua
workspace.Mall:Destroy()
```

Then **File → Save to File** and keep the `.rbxl` somewhere outside this repository.

## Changing it

Everything is at the top of the file: `WING_LEN`, `VOID_W`, `WALKWAY_W`, `ATRIUM_W`,
`FLOOR_TO_FLOOR`, the per-wing colours and how many units still trade. Change a number,
paste it in again, look at the result. That loop is the entire point of a greybox.

All dimensions are in **metres**; the script converts at 1 stud = 0.3 m.

## What this is and is not

This is a **greybox**: untextured parts at correct scale, so the building can be walked
before anyone spends a day on materials. Things that glow use `Neon` purely because it is
the only way a bare part can glow — the real build uses emissive `SurfaceAppearance`, per
[`../docs/05-art-direction.md`](../docs/05-art-direction.md).

It is a one-off script, not the game. When the project outgrows pasting scripts into a
command bar, [`../docs/13-studio-setup.md`](../docs/13-studio-setup.md) covers doing it
properly with Rojo, so the code in `src/` lives in the place and syncs as you edit it.

## First thing to do once it is standing

Press Play and walk the length of a wing. Time it — it should take about seventy seconds.
Then decide whether 110 m is right, whether the atrium reads as four storeys from the
ground, and whether the per-wing colours are enough to find each other by.
