# Live setup — edit files, watch Studio change

The goal: no more pasting. A folder on your Mac is connected to Studio, and anything
that changes in that folder appears in Studio within a second. Claude edits the folder.

Five things to install or run, once. Then it is done for good.

---

## 1. Open Terminal

Press **⌘ + Space**, type `Terminal`, press **Enter**. A window with a text prompt opens.
Every command below is typed there, one at a time, pressing **Enter** after each.

## 2. Install Rojo

Rojo is the bridge between the folder and Studio. This installs the tool that manages it:

```bash
curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash
```

When it finishes, **close the Terminal window and open a new one** so it picks up the new
tool.

## 3. Download the project

```bash
cd ~/Documents
git clone https://github.com/viktorlindqvist2004-coder/claude-mem.git
cd claude-mem
git checkout claude/night-shift-galleria-nordljus-xim9np
cd night-shift
```

If macOS offers to install "command line developer tools", accept it and run the commands
again afterwards — that is Git being installed.

You now have the whole project at `~/Documents/claude-mem/night-shift`.

## 4. Start Rojo

```bash
rokit install
rojo serve
```

It prints something like `Rojo server listening on port 34872`. **Leave this window open
and running.** Closing it disconnects Studio.

## 5. Connect Studio

1. Open Roblox Studio with your place.
2. **Toolbox** → search **Rojo** → install the plugin by **rojo-rbx**.
3. A **Rojo** tab appears in the ribbon. Click it, then click **Connect**.

Studio's Explorer fills with the project's scripts. From now on, editing a file in the
folder changes Studio immediately.

## 6. Put Claude on your Mac

Two ways. Either works.

**In the Claude desktop app you already have:** open the folder
`~/Documents/claude-mem/night-shift` as a project. No terminal needed.

**Or in a terminal** — open a *second* Terminal window (leave Rojo running in the first):

```bash
curl -fsSL https://claude.ai/install.sh | bash
cd ~/Documents/claude-mem/night-shift
claude
```

---

## What the loop looks like afterwards

You say *"make the wings shorter"*. Claude edits `src/shared/MallLayout.luau` on your disk.
Rojo pushes it into Studio. You rebuild and look.

To rebuild, one short line in Studio's command bar:

```lua
require(game.ServerStorage.Greybox).build()
```

That line is short enough to paste safely, unlike the 800-line script — which is the whole
reason this setup is worth twenty minutes.

## If something breaks

- **`command not found: rojo`** — the new Terminal window from step 2 was not opened, or
  Rokit did not finish. Close Terminal, open it again, retry.
- **Studio's Rojo tab says it cannot connect** — the `rojo serve` window was closed. Start
  it again from `~/Documents/claude-mem/night-shift`.
- **Scripts appear in Studio but editing them does nothing** — edit the files on disk, not
  in Studio. Rojo syncs one way, disk to Studio, and overwrites Studio-side edits.
