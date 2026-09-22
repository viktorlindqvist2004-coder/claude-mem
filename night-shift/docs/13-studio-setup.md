# Getting this into Roblox Studio

Start to finish, on your own machine. Everything in the repository is ready to sync; no
Roblox place file exists yet, and you are about to make the first one.

---

## 1. Install the toolchain

You need three things: Git, Rojo (which syncs the repository into Studio), and Studio.

**Rojo, the easy way** — install [Rokit](https://github.com/rojo-rbx/rokit), then:

```bash
cd night-shift
rokit install
```

`rokit.toml` in this folder pins the Rojo version, so everyone gets the same one.

**Rojo, the other ways** — download a release binary from
[github.com/rojo-rbx/rojo/releases](https://github.com/rojo-rbx/rojo/releases) and put it on
your PATH, or `cargo install rojo` if you have Rust.

**The Studio plugin** — in Roblox Studio, open the Toolbox, search **Rojo**, and install the
plugin by *rojo-rbx*. It is the bridge; the CLI alone does nothing.

## 2. Clone and serve

```bash
git clone https://github.com/viktorlindqvist2004-coder/claude-mem.git
cd claude-mem
git checkout claude/night-shift-galleria-nordljus-xim9np
cd night-shift
rojo serve
```

It prints something like `Rojo server listening on port 34872`. Leave it running.

## 3. Connect from Studio

1. Open Roblox Studio and create a new place — **Baseplate** is fine.
2. Delete the baseplate part. The mall builds at the origin and you do not want a
   2048-stud grey square through the middle of it.
3. Open the **Rojo** plugin tab and press **Connect**.

Everything under `src/` appears in the explorer:

| Repository | Studio |
| --- | --- |
| `src/shared/` | `ReplicatedStorage.Shared` |
| `src/server/` | `ServerScriptService.Server` |
| `src/client/` | `StarterPlayerScripts.Client` |
| `src/greybox/` | `ServerStorage.Greybox` |

It also sets `Lighting.Technology = Future` and `Workspace.StreamingEnabled = true`.

Edits in your editor now appear in Studio within a second. **Do not edit these scripts in
Studio** — Rojo syncs one way, from disk into Studio, and Studio-side edits get overwritten.

## 4. Build the mall

In Studio's **command bar** (View → Command Bar), in edit mode, not play mode:

```lua
require(game.ServerStorage.Greybox).build()
```

That generates the whole building at correct scale — four floors, twelve retail wings,
168 units, the service corridors, the red circuit — and applies the Night 1 lighting
preset. It prints a summary when it finishes.

To clear it again:

```lua
require(game.ServerStorage.Greybox).clear()
```

**This has never been run.** It was written without a Roblox runtime to test against, so
expect to fix a line or two on the first go. The command bar will name the file and line.

Once it builds, **File → Save to File** and keep the `.rbxl` somewhere outside the
repository — place files are large binaries and do not belong in Git.

## 5. Walk it in the dark

This is the whole point of the greybox, and it is Milestone 0 in
[`08-roadmap.md`](08-roadmap.md).

Press Play. Walk the length of a wing. Time it — it should take about seventy seconds. Then
answer three questions:

1. **Is 110 m too long or too short?** It should be long enough that the far end has no
   detail and you feel it as a commitment to walk.
2. **Does the atrium read as four storeys from the ground?**
3. **Does the per-wing signage colour work for finding each other?** Get someone else in
   the place, stand on different floors, and try to meet using only colours.

Change the numbers in `src/shared/MallLayout.luau`, save, and run `build()` again. That is
the loop, and it is why the layout is data rather than hand-placed geometry.

---

## What is not in Studio yet

The greybox is grey boxes. These are designed and documented but not built:

| Thing | Where the design lives |
| --- | --- |
| The night sky, moon, drifting cloud, fog | [`05-art-direction.md`](05-art-direction.md) — in Studio this is a `Clouds` instance in Terrain, `Atmosphere` in Lighting, and `ClockTime`/skybox, **not** the Python sky in `tools/` |
| The Great Clock's digital display | [`12-the-strike.md`](12-the-strike.md) §1 — a `SurfaceGui` with seven-segment frames, driven by one shared `StringValue` |
| The hum from every fitting | [`06-audio-direction.md`](06-audio-direction.md) §2b — one `Sound` per fixture |
| Torch, tasks, rules, Attention, the Presence | `src/server/`, `src/client/` — skeletons only |
| The investigation and the case board | [`09-the-investigation.md`](09-the-investigation.md) |
| The Strike | [`12-the-strike.md`](12-the-strike.md) |

**The Python renderer in `tools/` is not part of the game** and never ships. It exists to
judge scale and lighting before art time is spent, and it stops being useful the moment
Studio can show you the same thing.

## Suggested order once the greybox is standing

1. Get the scale right. Iterate in `MallLayout.luau` until walking it feels correct.
2. Lighting pass in Studio: the red circuit, shop security lights, moonlight through the
   roof. Compare against the previews in `previews/`.
3. Sky: `Clouds`, `Atmosphere`, and a moon, and check it through the roof glazing.
4. The torch, because everything else is judged by what it reveals.
5. Then Night 1, following [`08-roadmap.md`](08-roadmap.md).
