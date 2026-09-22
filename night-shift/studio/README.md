# studio/

## BuildMall.lua — the whole mall, in one paste

No Rojo. No Git. No install. Nothing to set up.

1. Open **Roblox Studio** and make a new place (**Baseplate** is fine).
2. In the **Explorer** panel on the right, right-click **ServerStorage** →
   **Insert Object** → **ModuleScript**.
3. Rename it to exactly **`BuildMall`**.
4. Double-click it to open it, select all (**⌘A** / Ctrl+A), and paste this whole file
   over the top. Close the tab.
5. Click the **command bar** — the single-line box along the bottom of the Studio window
   that says *"Execute a command with ⌘⏎"* — and run this one line:

```lua
require(game.ServerStorage.BuildMall)()
```

Press **⌘ + Enter** (Ctrl+Enter on Windows) or click **Run**.

**Why not just paste the whole script into the command bar?** It is a single-line box, and
a 790-line paste usually gets truncated or silently dropped. The ModuleScript holds the
code; the command bar only gets the one line that calls it.

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
