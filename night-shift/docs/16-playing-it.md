# Playing it

Everything in here is true of the build on this branch. If something below does not
happen when you press Play, it is a bug, not a missing feature.

---

## Running it

1. Rojo is already set up — see `docs/14-live-setup.md`. With it connected, press **Play**.
2. That is the whole list. The server builds the mall itself if it is not already in the
   place, starts Night 1, and puts you in the staff room.

If you want to look at the building in edit mode without playing, run this in the
command bar:

```lua
local c=game.ServerStorage.Greybox:Clone() c.Parent=workspace require(c).build() c:Destroy()
```

The clone matters. `require()` caches a ModuleScript for the whole Studio session, so
after Rojo syncs an edit a plain `require` runs the old version out of memory with no
error to explain why.

To take the building out again: `workspace.Mall:Destroy()`

---

## Controls

| Key | |
| --- | --- |
| **W A S D** | walk |
| **F** | torch |
| **E** | interact — everything in the game is a proximity prompt |
| **Q** | walkie — only when there is a line open, and there is one once a night |
| **X** | put down whatever you are reading |

---

## Skipping ahead

On a running server, from the command bar:

```lua
local S = require(game.ServerScriptService.Server.Shift)
S.seek(3)    -- jump to 03:00 tonight: the power cut, the Contradiction, the tag
S.seek(3.55) -- 03:33
S.begin(4)   -- start Night 4 from the top
S.begin(5)   -- the Strike and the accusation
```

Nothing in the game is driven by chained `task.wait` calls, so seeking is safe: every
beat is keyed to the shift clock and fires when the clock passes it.

---

## The five nights

| | Runs | What it is |
| --- | --- | --- |
| **1 — First Shift** | ~9 min | Clock in, four jobs, three rules that can be broken. The power goes at 03:00 and he asks you to go to the basement. Rule 7 says ask him the time first. |
| **2 — The Mannequins** | ~12 min | They move only when nobody can see them, and the crew's field of view is a shared resource. Four in the window at the start, eleven by the end. |
| **3 — Night Customers** | ~14 min | The shop is shut and there are people in it. Serve them. One of them never advances until 03:33. |
| **4 — Blackout** | ~16 min | No mains. Start the generator, get somebody on the monitors, and go up the stair that was not there on Tuesday. |
| **5 — Closing** | ~20 min | Kill the lights, put four name tags back, open the clock. Then it strikes thirty-three times and somebody has to hold the panel in the basement through all of them. |

Between every night you are in interview room two with DS Calder and the board. The mall
is red at 2.5 m for eight hours; that room is white, and the relief is the point.

---

## Winning

You win by naming the right person to Calder on Night 5, with three things under it.

There are seven names on the board and six of them have a genuine, well-supported case
against them. Accusing one of the four missing staff is its own ending. The answer is
never stated by the game, only by the evidence, and the evidence is twenty-two documents
spread across five nights — you will not get all of them in one run, and you do not need
to.

`CaseFile.SUPPORTING` on the server knows which three she will accept. The client never
holds it.

---

## The sound

Every noise in the game is a named slot in `src/shared/SoundBank.luau`, and each slot
currently points at audio that ships inside the Roblox client (`rbxasset://sounds/...`),
shaped with pitch and volume into roughly the right thing. That means the game is
audible the moment you press Play without a single upload, and it means none of it is
the real thing yet.

To put real audio in, change the `id` on a slot. Nothing else changes: no code anywhere
knows what a file is called, it asks for `SoundBank.HUM` and gets whatever is in the
table. `docs/06-audio-direction.md` says what each slot should eventually be and how it
should be recorded.

The one that matters most is `HUM`. There is one emitter per red fitting, each detuned a
few cents from a hash of its own position, so every corridor beats against itself
differently and the building has an audible fingerprint per location. One fitting in
twelve buzzes irregularly. Players use those as landmarks, and on Night 5 a fitting they
know is silent.

---

## Checking it without opening Studio

```bash
tools/verify.sh
```

It compiles every source, flags any identifier that is not a real Roblox global, builds
the whole mall against a stubbed Roblox API, and checks the cross-references a compiler
cannot see: every prop name a night looks up, every `ctx` call, every clue id, every rule
id, every objective. It needs `luau`, `luau-compile` and `luau-analyze` on `PATH` or in
`$LUAU_DIR`.
