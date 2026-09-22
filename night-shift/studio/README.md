# studio/

## BuildMall.lua — the whole mall, in one paste

No Rojo. No Git. No install. Nothing to set up.

1. Open **Roblox Studio** and make a new place (**Baseplate** is fine).
2. **Delete the baseplate part.** The mall builds at the origin and you do not want a
   grey slab through the middle of it.
3. **View → Command Bar** to open the command bar along the bottom.
4. Open `BuildMall.lua`, select all, copy, paste into the command bar, press **Enter**.

It builds the whole building — four floors, twelve wings, the units with their interiors,
the service corridors, the atrium with escalators and a lift, the roof structure, and the
Great Clock reading `03:33` — sets the night lighting, and puts cloud in the sky.

It prints a part count when it finishes. Takes up to a minute.

**Run it again** to rebuild; it clears the old one first. **To remove it:**

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
