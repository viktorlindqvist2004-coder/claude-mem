# Getting in, and staying in

> One place file, open the whole time, that updates itself when something is
> pushed. Set up once; after that you never touch it again.

---

## Why the Workspace looks empty

Open the project in Studio and the viewport is grey and blank. **That is
correct.** The mall does not exist as saved geometry — it is built by
`ServerStorage.Greybox` when the game starts, 2080 parts in about a second.

- **Press Play** and it appears.
- To see it *without* playing, paste this into the command bar once:

  ```lua
  local c=game.ServerStorage.Greybox:Clone() c.Parent=workspace require(c).build() c:Destroy()
  ```

  (The command bar is the one-line box at the bottom of Studio. If it is not
  there: **VIEW** → **Command Bar**.)

The clone matters. `require()` caches a module for the whole Studio session, so
after a sync a plain `require` runs the old version out of memory with no error
to explain why.

Building it as saved geometry instead would mean a 60 MB place file that goes
stale every time a wall moves, and it would have to be re-downloaded. This way
the building is a hundred lines of Luau that arrive in a second.

---

## The live setup

**One command, once. Then leave it running.**

```bash
cd ~/Documents/claude-mem/night-shift
./tools/live.sh
```

Or double-click **`Start Night Shift.command`** in that folder — macOS opens it
in Terminal for you.

Two things happen in that window:

- it pulls this branch every five seconds, so anything pushed is on your disk
  without you typing anything
- it runs `rojo serve`, so anything on your disk is in Studio a second later

When something lands it prints the commit message, so you can see what changed.

Then, in Studio, once:

1. **PLUGINS** tab → the **Rojo** icon → **Connect**
2. Say yes when Studio asks about **script injection**. Without it Rojo connects
   and immediately drops with `Plugin "Rojo 7" was denied script injection
   permission.`

That is the whole setup. From then on: somebody pushes, and about five seconds
later it is in your open session.

### After a change lands

| what changed | what you do |
| --- | --- |
| A script — dialogue, timing, a rule, the HUD | **Nothing.** It is already in. Press Play, or it applies on the next one. |
| The building — a room, a prop, a light | **F9 → Rebuild the mall**, or just press Play again. |

### If Connect fails

- **"Version mismatch" or it refuses outright** — your plugin is older than the
  command-line Rojo. **VIEW** → **Toolbox** → the dropdown at the top →
  **Plugins** → **Rojo** → **Update**.
- **"denied script injection permission"** — Studio asked and got a no. **FILE**
  → **Studio Settings** → **Security** → *Allow Studio To Access Scripts*, or
  disconnect and reconnect and say yes this time.
- **Nothing in the PLUGINS ribbon at all** — the plugin is not installed.
  Toolbox → Plugins → search `Rojo` → the one by **rojo-rbx** → Install →
  restart Studio.

---

## The snapshot route

`NightShift.rbxlx` in the project root is the entire game baked into one file:
**File** → **Open from File…** → press Play. No plugin, no Terminal, nothing to
approve.

It is there for when you want to hand the game to somebody, or look at it on a
machine with none of this set up. It is **a snapshot** — it does not update, and
a change pushed after it was built is not in it. `tools/build_place.sh` makes a
fresh one.

For working on the game, use the live setup. For showing it to somebody, send
them the file.

---

## Making it a real server

Everything above is Studio on your own machine. To get a place other people can
join:

1. **FILE** → **Publish to Roblox As…** → make a new place, or pick an existing
   one.
2. After that, **FILE** → **Publish to Roblox** (⌘P) pushes the current state to
   it, and that is the one command you run when you want other people to see
   what changed.

The live setup still works exactly the same — it feeds Studio, and you publish
from Studio when you are ready. Nothing auto-publishes, which is deliberate: a
half-finished change reaching players because a file saved is not a thing that
should be able to happen.
