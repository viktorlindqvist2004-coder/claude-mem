# Night Shift — Part 1: Northlight Galleria

A 1–4 player co-op horror game for Roblox. You are the new night crew at a mall
that closed to the public in 1998 and has never, technically, closed since.

Five nights. A list of handwritten rules from 1998. A manager you only ever hear.

You win by working out who he is, and telling the police — with evidence.

The mall is enormous and unlit. Neon shopfronts, red EXIT signs and your torch are the only
light there is, and something out there watches you from about forty metres away and never
comes closer. Until the fifth night.

**Status:** pre-production. Design and story are being written first; the Roblox
build follows. Nothing in `src/` is shipping code yet — it is the architectural
skeleton the vertical slice will be built on.

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
  docs/                 design + story documentation (the current deliverable)
  default.project.json  Rojo project definition
  src/shared/           modules replicated to both sides
  src/server/           authoritative services
  src/client/           controllers and UI
```

## Building (later)

```bash
rojo serve          # then connect from Roblox Studio
```
