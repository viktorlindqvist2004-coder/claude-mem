# Night Shift — Part 1: Northlight Galleria

A 1–4 player co-op horror game for Roblox. You are the new night crew at a mall
that closed to the public in 1998 and has never, technically, closed since.

Five nights. A list of handwritten rules from 1998. A manager you only ever hear.

You win by working out who he is, and telling the police — with evidence.

The mall is unlit except for the emergency circuit. Every bulkhead fitting in the
building is dark; the only light is the red EXIT boxes over the doors and whatever your
torch is pointed at. Something out there watches you from about forty metres away and
never comes closer. Until the fifth night.

---

## Playing it

All five nights run, start to finish.

**The quickest way in:** download `NightShift.rbxlx`, open Roblox Studio, **File** →
**Open from File…**, press **▶ Play**. Nothing to install and nothing to approve.

**To work on it:** run `./tools/live.sh` and leave the window open — it pulls this branch
every five seconds and feeds Studio, so a push is in an open session about five seconds
later. Then **PLUGINS** → **Rojo** → **Connect**. Full instructions in
[`docs/19-opening-it.md`](docs/19-opening-it.md).

`F` torch · `E` interact · `SHIFT` run · `Q` walkie · `C` transcript · `V` captions ·
`F9` test panel

**The test panel** (F9) is fifty-odd buttons: any night, any hour, 03:33, the Strike, the
case board, a startle, the Presence, the eyes, a mannequin behind you, cut the power,
every clue, thirteen places to stand, play every sound in the game with its name on
screen, and brightness and torch controls that print their numbers. Five nights is over
an hour of play to reach the last beat, and the last beat is the one most likely to be
broken.

**Checking it without Studio:** `tools/verify.sh` compiles every source, flags identifiers
that are not real Roblox globals, builds the whole mall against a stubbed Roblox API, and
runs all five nights — every beat, every proximity prompt, every test-panel button.

## Status

**Built and playable.** About 3500 parts, 29 lights, twelve named rooms plus the atrium,
two mall arms on two levels, Floor 3, a car park and an interview room. Five nights of
content, twenty-two clues, seven suspects and four endings.

**Not finished:** the art is greybox — real materials are assigned from Roblox's built-in
PBR set, but nothing is photographically textured yet
([`docs/17-materials.md`](docs/17-materials.md) is the swap). And the audio is
placeholder: every sound is a named slot pointed at audio that ships inside the Roblox
client, so the game is audible with no uploads and none of it is the real thing. The
123-line voice script is in [`audio/VOICE_SCRIPT.md`](audio/VOICE_SCRIPT.md) and the
27-slot sound brief in [`audio/SOUND_SCRIPT.md`](audio/SOUND_SCRIPT.md). A line with no
recording plays as a subtitle, which is a supported state, not a broken one.

## Read in this order

| Doc | What it is |
| --- | --- |
| [`docs/01-pitch.md`](docs/01-pitch.md) | One page. The elevator version. |
| [`docs/02-design-critique.md`](docs/02-design-critique.md) | Honest critique of the original outline and the changes made because of it. |
| [`docs/03-story-bible.md`](docs/03-story-bible.md) | Lore, timeline, cast, the Rules, all five tape transcripts, both endings. |
| [`docs/04-game-design.md`](docs/04-game-design.md) | Core systems and the night-by-night breakdown. |
| [`docs/05-art-direction.md`](docs/05-art-direction.md) | How to get genuinely realistic visuals out of Roblox. |
| [`docs/06-audio-direction.md`](docs/06-audio-direction.md) | Voice, music-as-mechanic, mix. |
| [`docs/07-technical-architecture.md`](docs/07-technical-architecture.md) | Rojo/Luau structure, services, networking, anti-cheat. |
| [`docs/09-the-investigation.md`](docs/09-the-investigation.md) | The mystery: seven suspects, twenty-two clues, the detective, and how you win. |
| [`docs/10-fear-design.md`](docs/10-fear-design.md) | Dread, the Presence, eyes in the dark, and the thirty startles. |
| [`docs/11-direction-log.md`](docs/11-direction-log.md) | **Every piece of direction given, and how it was resolved. Outranks the other docs.** |
| [`docs/12-the-strike.md`](docs/12-the-strike.md) | The digital clock, and the night it strikes thirty-three times. |
| [`docs/15-scene-map.md`](docs/15-scene-map.md) | Every beat across five nights, and the room it happens in. |
| [`docs/20-cast.md`](docs/20-cast.md) | All ten people, and where each of them is in the built game. |
| [`docs/19-opening-it.md`](docs/19-opening-it.md) | **Start here.** Getting into the game, both routes. |
| [`docs/16-playing-it.md`](docs/16-playing-it.md) | Controls, the five nights, how to win, skipping to any beat. |
| [`docs/18-testing.md`](docs/18-testing.md) | The F9 panel, what `verify.sh` checks, and what it cannot. |
| [`docs/17-materials.md`](docs/17-materials.md) | How the building is surfaced, and how real textures go in. |
| [`docs/14-live-setup.md`](docs/14-live-setup.md) | The Rojo setup in long form. |
| [`docs/13-studio-setup.md`](docs/13-studio-setup.md) | The same thing in less detail. |
| [`docs/08-roadmap.md`](docs/08-roadmap.md) | Milestones from greybox to soft launch. |

## Naming: original → shipping

The concept was written in Swedish. Everything ships in English.

| Original | Shipping name |
| --- | --- |
| Galleria Nordljus | **Northlight Galleria** |
| Stora Uret | **the Great Clock** |
| Nattchefen | **the Night Manager** |
| Jonna (kassa) | **NORA** — Checkout |
| Lo (städ) | **LO** — Custodial |
| Sven (väktare) | **WALT** — Security |
| Malik (lager) | **MALIK** — Stockroom |
| Hotell Vinterhamn (Part 2) | **Hotel Winterhaven** |
| — (new) | **Northmoor**, the town |
| — (new) | **Lantern Staffing**, the agency that places you |
| — (new) | **Elias Wren**, the name on the clock |
| — (new) | **DS Ruth Calder**, Northmoor Police |
| — (new) | **Eric Halvard**, the developer |
| — (new) | **Margaret Vale**, centre manager 1986–1998 |
| — (new) | **Ivor Kask**, "night manager" for six weeks in 1989 |

## Layout

```
night-shift/
  docs/                 design + story documentation
  default.project.json  Rojo project definition
  src/shared/           modules replicated to both sides
  src/server/           authoritative services
  src/client/           controllers and UI
  src/greybox/          disposable mall generator (see below)
```

## Greybox

`src/shared/MallLayout.luau` is the floor plan as data: floors, wings, unit counts,
signage hues, EXIT placement. It is the durable artefact — the final art build, the
streaming split, the clue placements and the Dread Director's spawn volumes all
reference it.

`src/greybox/` generates the whole mall from that plan as grey boxes, so the building can
be walked at correct scale, in the dark, with a torch, before any material is authored.
The geometry is disposable and gets deleted when the modular art kit lands.

```bash
rojo serve                                      # then connect from Roblox Studio
```

Then, in the Studio command bar:

```lua
local c=game.ServerStorage.Greybox:Clone() c.Parent=workspace require(c).build() c:Destroy()     -- ~550 parts, ~90 EXIT lights
require(game.ServerStorage.Greybox).clear()     -- remove it again
```

It applies the Night 1 lighting preset and switches `StreamingEnabled` on, so the first
thing you see is the mall as the game intends it: almost entirely black, with red EXIT
signs and eleven neon shopfronts.

**Iterate in `MallLayout.luau`, not in Studio.** Change the wing length, the unit count or
the hues and re-run `build()`. The one question the greybox exists to answer is whether the
scale is right, and that question gets asked about five times.

> Not yet run in Studio. There is no Roblox runtime or Luau typechecker in the environment
> it was written in, so expect to fix a line or two on the first build.
