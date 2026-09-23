# Opening it

> The shortest route from "I have nothing" to "I am standing in the mall".
> No plugin, no Terminal window left running, nothing to approve.

---

## The one-file route

**`NightShift.rbxlx` in the project root is the whole game as a single Roblox
place file.** Studio opens it like any other file.

1. Download it: on GitHub, open `night-shift/NightShift.rbxlx`, click **Download
   raw file**. (Or `git pull` if you already have the project.)
2. Open Roblox Studio.
3. **File** → **Open from File…** → pick `NightShift.rbxlx`.
4. Press the blue **▶ Play** button, or **F5**.

That is it. The server builds the mall, Night 1 starts, and you are in the staff
room.

**What you give up:** it is a snapshot. If a source file changes afterwards, the
place does not — you download the new `.rbxlx`, or you set up the live route
below. Anything *you* change inside Studio stays in your copy and is yours.

To rebuild it yourself after editing sources: `tools/build_place.sh`.

---

## The live route, if you want edits to appear as they happen

This is the one with the plugin. It is worth it if you are going to be changing
things; it is not worth it to play once.

### Where the Rojo button actually is

It is **not** its own tab. It is in the **PLUGINS** tab.

1. Along the top of Studio is a row of tabs: `HOME` `MODEL` `AVATAR` `TEST`
   `VIEW` `PLUGINS`.
2. Click **PLUGINS**.
3. The ribbon underneath fills with the icons of every plugin you have. **Rojo**
   is one of them.
4. Click it. A small panel opens on the right with a **Connect** button.

**If Rojo is not in that ribbon, the plugin is not installed:**

- **VIEW** tab → **Toolbox** → the dropdown at the top of the Toolbox panel →
  **Plugins** → search `Rojo` → the one by **rojo-rbx** → **Install**.
- Restart Studio. It will now be in **PLUGINS**.

### The rest of it

In Terminal, with the project downloaded:

```bash
cd ~/Documents/claude-mem/night-shift
rojo serve
```

Leave that window open — closing it disconnects Studio. Then **PLUGINS** → Rojo
→ **Connect**.

The first time, Studio asks to allow **script injection**. Say yes. Without it
Rojo connects and then immediately fails with
`Plugin "Rojo 7" was denied script injection permission.`

---

## Which one should you use

| | one file | live |
| --- | --- | --- |
| Just play it | ✅ | |
| Look around, change things in Studio | ✅ | |
| Pull down changes as they are made | | ✅ |
| Needs Terminal open while you play | no | yes |
| Needs the plugin | no | yes |

---

## If something is wrong when you press Play

- **You fall through the world, or you are inside a stone column.** The mall did
  not build. Check the Output window (**VIEW** → **Output**) for a line starting
  `[Northlight Galleria]`. If it is not there, `ServerStorage.Greybox` is
  missing from the place.
- **It is pitch black and you cannot see anything at all.** That is correct.
  Press **F** for the torch.
- **Nothing happens and there are no prompts.** You have not clocked in. The
  time clock is on the wall of the staff room, where you start. Walk up to it
  and press **E**.
- **You want to skip to a particular beat.** Press **F9**.
