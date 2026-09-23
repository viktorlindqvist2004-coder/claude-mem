# Testing it

Five nights at ten to twenty minutes each is over an hour to reach the last beat,
and the last beat is the one most likely to be broken. So nothing in this game
requires you to play to it.

---

## In game: F9

Press **F9**. Forty-seven buttons, grouped:

| Group | |
| --- | --- |
| **Nights** | Start any of the five from the top |
| **Clock** | Jump to 22:00, 00:00–05:00, **03:33**; stop and start the clock; end the night now |
| **Tasks** | Complete every task · reveal the hidden ones · give all 22 clues · open the case file |
| **Fright** | Small startle · large startle · put the Presence behind me · eyes in the dark · something falls over elsewhere · spawn a mannequin fourteen metres behind me |
| **Building** | Cut / restore the power · **the Strike (33)** · put the board up · rebuild the mall |
| **Go to** | Twelve places: staff room, atrium, supermarket, fashion, stockroom, food court, basement, fuse box, loading dock, Floor 3 office, car park, interview room |
| **Audio** | How much voice is recorded · play any of the five tapes |

**Who can open it.** In Studio, anyone. On a published place, the place owner and
nobody else. It is server-authoritative — the client sends the id of a row the
server gave it and nothing more, so a player who finds the remote gets a closed
door rather than the game's state machine.

---

## Command bar

Everything the panel does is a call you can make directly:

```lua
local S = require(game.ServerScriptService.Server.Shift)
S.begin(4)      -- Night 4 from the top
S.seek(3.55)    -- 03:33
S.ctx.finish()  -- end the night
```

---

## Without opening Studio at all

```bash
tools/verify.sh
```

Five passes, in order, and it exits non-zero if any of them fail:

1. **compile** — every `.luau` source through `luau-compile`.
2. **identifiers** — `luau-analyze`, filtered down to identifiers that are not
   real Roblox globals. This is the one that catches a local used above where it
   is declared, which Luau reads as a global and silently resolves to `nil`.
3. **build the mall** — the whole greybox run against `tools/roblox_stub.luau`,
   a stand-in Roblox API of a few hundred lines. Prints the part count.
4. **cross-references** (`tools/check_refs.py`) — the strings that are really
   identifiers and no compiler will check: every prop name a night looks up
   against the parts the greybox actually creates, every `ctx` call against the
   Shift context, every clue id against `CaseFile`, every rule id against
   `RuleBook`, every objective against the night that declares it.
5. **smoke** (`tools/smoke.py`) — bundles every module against the stub,
   resolving `require` by name so the modules run exactly as written, then starts
   each of the five nights, fires every beat, pulls all 127 proximity prompts,
   and presses all 47 test-panel buttons. Coroutines stand in for
   `task.spawn`/`task.wait`, resumed a bounded number of times, which runs a beat
   body past its waits without spinning on the loops the ambience uses. A `warn`
   counts as a failure, because several systems pcall their own callbacks.

It needs `luau`, `luau-compile` and `luau-analyze` on `PATH` or in `$LUAU_DIR`.

**What it does not prove.** The stub has no physics and no rotation: raycasts
always miss and a CFrame carries a position and a look vector and nothing else.
So it proves the code runs and the arithmetic is well typed. It does not prove
anything is pointing the right way, that a room is the size you meant, or that
the game is frightening. That is what Studio and a dark room are for.

---

## Things worth checking by hand

- **Walk the service corridor with the torch off.** If you can tell where you are,
  the lighting is too bright.
- **Stand in the staff room on Night 2 at 01:00** and look at the mannequin.
  Then look away. Then look back. If it has not moved, observation is broken; if
  it has moved while you were looking at it, `Gaze` is broken.
- **03:00 on Night 1**, ask him the time twice. The second answer is the whole
  game.
- **F9 → the Strike.** Thirty-three, four seconds apart, and the panel in the
  basement wants somebody on it every eight.
