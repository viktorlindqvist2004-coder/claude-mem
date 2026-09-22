# Game Design — Systems and Nights

---

## 1. Core loop

```
Lobby → Clock in (22:00) → Shift → 06:00 → Payroll → Police debrief → next night
                              ↑                 │
                              └── soft fail ────┘
```

The between-nights beat is an interview room at Northmoor Police, not a shop. Wages and
upgrades move to a phone menu; the corkboard gets the screen time.

Within a shift:

```
read the task board  →  work  →  something is wrong  →  check the rules
   →  obey or test  →  consequence  →  back to work (or to the tape deck)
   →  and somewhere in a drawer, a piece of paper from 1989
```

The second line is the game. The first line is the cover story. The third line is how you
win: the crew is running a twenty-eight-year-old missing-persons investigation while
pretending to mop. **Surviving to 06:00 on Night 5 is not a win. Naming him is.**
See [`09-the-investigation.md`](09-the-investigation.md).

---

## 2. Attention

A single shared meter, 0–100, server-authoritative, never shown as a number. It is
represented diegetically: the fluorescent tubes nearest the crew hum louder, then flicker,
then the music stops between tracks instead of crossfading.

| Tier | Range | What it means |
| --- | --- | --- |
| **Calm** | 0–24 | The building is not thinking about you. |
| **Noticed** | 25–49 | Lights react. The Night Manager becomes conversational and starts checking in. |
| **Watched** | 50–79 | An entity is active and routed toward the crew. Rule-break consequences become physical. |
| **Found** | 80–100 | The Night Manager moves through the mall. Ends when the crew breaks line of sight for 20 s or completes a task. |

**Raises Attention:** breaking a rule (+15 to +30), walkie transmission (+2/s), running in
a quiet zone (+1/s), playing a tape (+20 over its length), opening a door you were told not
to, lingering in a room with no assigned task (+1/s after 30 s), shining a flashlight into
a window display, being on a floor that does not exist.

**Lowers Attention:** completing an assigned task (−20), being *in the middle of* an
assigned task (−1.5/s), standing still with the flashlight off (−1/s), clocking in and out
correctly, wearing the uniform.

This is the thesis of the whole game as a number: **doing your job makes you invisible, and
the story requires you to stop doing your job.** Every scare in the game is something the
player chose to go and look at.

**Solo tuning:** all gain rates × 0.7, decay × 1.15.

---

## 3. Rules

Rules are data, not script. See `src/shared/RuleBook.luau`.

Each rule has: an id, the handwritten text, an **observable trigger condition**, a
**compliance window**, a **violation consequence**, and a **provenance** (`nora`,
`nora_struck`, `forged`, `torn`).

Three properties are non-negotiable:

1. **Every rule is verifiable in the world.** No rule is ever about something the player
   cannot observe. "Stand still when the music changes early" is testable because the
   music is a real 90-minute loop with a real track list the player can learn.
2. **Obeying a rule produces no reward.** Nothing happens. That is the reward. Horror dies
   the moment compliance gives you a buff.
3. **Breaking a rule never kills you immediately.** It raises Attention and produces a
   *small, specific, wrong* thing near you: the tube overhead goes out, a shutter two shops
   away rolls half down, your own name is said once at conversational volume from behind a
   door. Death is always downstream of a choice, never of a jump scare.

**Forged rules** are inserted by the Night Manager from Night 2. They argue for compliance
with *him*. They are identifiable by handwriting (neat, evenly spaced, never crosses
anything out) — a visual tell rendered on the sheet texture, not a UI icon.

**The Contradiction.** Exactly one per night: an instruction from the Night Manager that a
rule says is a lie, where both are testable in the next 60 seconds. Resolution writes to a
hidden `Trust` value in `[-5, +5]`.

| Night | Rule | His instruction | The test |
| --- | --- | --- | --- |
| 1 | 7 — *ask him the time* | "Pop down to the basement and change the fuse." | Ask. He deflects twice and never says a number. |
| 2 | 12b (forged) vs 6 | "Put them all back in the window." | Count the mannequins. There is one more than the stock list. |
| 3 | 7b (forged) | "Bin that paper, it's twenty-eight years old." | The 1998 customer pays with a tag that proves the paper is about real people. |
| 4 | 3b (forged) | "You're staff now. You're allowed upstairs." | The rota on his wall has your names on it already. |
| 5 | 14 (forged, signed) | "Stop and I'll let you go home at six." | He has never once said a time. He just said one. He is lying, and the crew now know how to prove it in a single sentence. |

Low trust (crew never tested him) → Night 5 shades give less help and he stays friendly
longer. High trust (crew caught him every night) → he drops the act on Night 3, is more
aggressive throughout, but the crew know the building.

---

## 4. Tasks

Every night has a printed task board in the staff room and a clipboard item. Tasks are
real work with real interactions — no "hold E for 3 seconds" if a physical action exists.

- Tasks are **assignable**: any crew member can take any task, and the board shows who has
  what. This gives four players a reason to split up without the game ordering them to.
- Task completion is the primary wage source and the primary Attention sink.
- A night can be finished with tasks outstanding, at a wage penalty. It cannot be finished
  with the night's **story objective** outstanding.

---

## 5. Light

**Flashlight.** One per crew member. Two modes:

- **Wide** — 60° cone, low intensity, 0.8 %/s battery.
- **Focus** — 18° cone, high intensity, 2.4 %/s battery. Required to hold a mannequin
  frozen, to reveal the Night Manager on Night 5, and to revive a downed teammate.

Batteries are swapped at charging stations (three per floor, visible on the map). A dead
flashlight is not a fail state — it is a reason to shout for someone.

**Upgrades** change housing, beam colour temperature and battery capacity, never raw
safety. A tier-3 torch has a longer runtime and a nicer beam; it does not make mannequins
slower.

**Rule:** the flashlight is the only light source the player controls. There is no global
"gamma" comfort setting beyond a standard brightness slider clamped to a range that keeps
the game dark, and no toggleable "night vision".

---

## 6. Communication

- **Proximity voice** (Roblox voice chat, where available) plus proximity text for
  everyone else, with a speech-bubble radius matched to the voice falloff so the two
  populations can actually play together. This matters more than it sounds: a voice-only
  design excludes a large share of the Roblox audience.
- **Walkie-talkie**, channel 1 crew / channel 2 the Night Manager. Push to talk. The
  walkie is **audible in the world at both ends** — transmitting is a position broadcast
  and raises Attention. Night 4 makes the walkie unreliable and Night 5 makes it hostile.
- **Ping system** for silent play: look at a thing, tap, it is marked for the crew for
  6 seconds. Deliberately weak, so that talking stays better.

---

## 7. Downed, revived, failed

- Contact with an entity **downs** a player (Night 2's "frozen" is the Night 2 flavour of
  this). Downed players can talk and look around, not move.
- A teammate holds **Focus** on them for 3 s to revive.
- A downed player not revived within 45 s is **taken** — removed until the next hour
  chime, returned at the staff room with the Attention meter at +25.
- Three takings in one night, or 06:00 with the story objective unfinished, is a **night
  failure** → the soft-fail sequence in the story bible, then a restart of that night.
- **Collectibles found are never lost on a restart.** Tapes and tags persist.
- **Solo:** one self-recovery per night, flavoured as the tag you are carrying.

---

## 8. Wages and progression

| Source | Pay |
| --- | --- |
| Assigned task completed | 40 |
| Night completed | 150 |
| No rule broken all night | 100 |
| Ended the night at Calm | 75 |
| Tape found | 0 — collectibles are never paid for |

**Spend on:** flashlight housings and battery tiers, boots (movement noise, not speed),
walkie range and squelch, uniform variants, staff-room decoration, torch beam colour.

**Never sell:** anything that reduces Attention gain, slows an entity, adds health, or
reveals a rule's answer. Selling safety in a horror game is selling the game.

---

## 9. Collectibles

- **4 name tags** — one per night, Nights 1–4. Carrying one grants a passive with a matching
  cost (see the critique doc, §12). Only one player may hold a given tag.
- **5 tapes** — played on the stockroom boombox or security deck. Takes real time, makes
  real noise.
- All nine unlocks the **true ending** on Night 5 and the fifth tape, which is inside the
  clock.

---

## 10. The nights

### Night 1 — First Shift · ~9 min · in-game 22:00–06:00

**Feeling:** almost pleasant. Low music, humming tubes, a job. The player should be
genuinely unsure for the first four minutes whether this is a horror game.

**Tasks:** face up the supermarket shelves · mop the escalator landing · pull all shop
shutters before 02:00 · take the bins to the loading dock.

**Teaches:** the task board, the flashlight, the walkie, the rule sheet, and that the
Night Manager is *useful* — he warns about a real wet floor, he tells you the trick for
the jamming shutter at unit 14, he reminds you to clock in.

**Beats**
- **00:30** — the music changes track early. Rule 2. Standing still: nothing happens, and
  the nothing is very long. Walking: the tubes above the walking player go out one by one,
  ahead of them, down the corridor.
- **01:45** — a player's name is called from the stockroom, in a voice the crew have not
  heard. Rule 4.
- **03:00** — power fails. The Night Manager asks, warmly, for someone to change the fuse
  in the basement. **The Contradiction.** Ask him the time.
- **03:33** — in the basement, beside the fuse box, in a pool of standing water that should
  not be there: **NORA — CHECKOUT**. Power returns the instant it is picked up, and every
  light in the basement comes on at once, which is far worse than the dark was.

**Ends:** "Good work tonight. You're a good fit here." 06:00, shutters up. On the way out
the crew's phone rings: **DS Ruth Calder**, Northmoor Police, who has had this file since
1998 and has been waiting twenty-eight years for someone to walk back out of that building.
The case file opens.

**Tape 1** in the checkout drawer. **Clues:** the opening-day cassette (C01), the rule sheet
as a handwriting exemplar (C02), the 1998 shift log — four clock-ins, no clock-outs (C03).

---

### Night 2 — The Mannequins · ~12 min

**Feeling:** claustrophobic and static. Fashion floor, shop windows, a mirror wall.

**Tasks:** dress the window mannequins to match a printed plan · steam and fold the returns
rail · count the coat stock against the 1998 stock book.

**Mechanic — Observation.** Mannequins move only while unobserved. Observation is
**server-authoritative**: the server runs a 10 Hz check per mannequin per player (camera
look vector, FOV cone, and an occlusion raycast) and an entity is frozen if any living
player sees it. **The client is never asked whether it is looking.** Holding **Focus** on
one additionally locks it for 1.5 s after you look away, which is the only way to reposition
the crew safely.

Escalation: 4 mannequins at 22:00 → 11 by 05:00. Speed while unobserved scales with
Attention, not with time.

**Beats**
- **01:00** — one is standing in the staff room. It is not in the stock book. It is facing
  the rule sheet.
- **02:30** — the fashion floor lights strobe for 90 s. Between flashes they move, and the
  crew have to track by memory and sound. Focus beams still hold them.
- **04:00** — "Put them back in the window and they'll settle." A forged line has appeared:
  *"12b. The red collar is only a collar."* Rule 6 says count them. There are eighteen.

**Choice.** Put the red-collared one back → the last hour runs at +30 Attention, all
mannequins active, and **LO's tag is gone.** Leave her out → the tag is around her neck,
and she watches the crew for the rest of the night without ever moving again.

**Tape 2** on the mannequin. **Clues:** the 1989 payroll ledger and its six-week night
manager post (C05), the 1989 staff photograph with one face out of focus in every copy
(C06), Lo's pencil note in the stock book (C07), and the first forged line on the sheet
(C09). **Seeds Floor 3:** one window mannequin is posed looking up.

---

### Night 3 — Night Customers · ~14 min

**Feeling:** bright, busy, sociable, and wrong. The mall is open. There is a queue.

**Tasks:** serve the register · fetch items from the stockroom · gift-wrap · restock the
front-of-house.

**Mechanic — Four stations, four tells.** No player can convict a customer alone, because
each tell is only visible from one station (register / mirror wall / stockroom / floor).
Convicting requires **two independent tells** reported by **two different players**, which
means the game is played over voice.

**Tells:** notes dated 1998 or coins withdrawn in 1995 · no reflection in the mirror wall,
though the CCTV shows them fine · asks for a unit that closed in 1997, and the stock
catalogue has an entry for it that was not there an hour ago · does not fog the cold glass
of the freezer · gives a name that is on the 1998 staff rota.

**Consequences.** Refusing a real customer: −120 wages and the rest of the queue goes
silent and looks at you. Serving a false one: the mall **edits itself** — a fire door is
gone, two units have swapped sides of the atrium, and the printed map in your hands is now
wrong for the remainder of the night. It must be visible within 10 seconds so the crew
knows exactly what they did.

**Beats**
- **02:00** — a man at the back of the queue never advances. Everyone else moves past him.
- **03:33** — he reaches the front. Transport-police-cut uniform, 1994 issue. He puts a
  name tag on the counter — **WALT — SECURITY** — and says: *"Tell them to stop opening."*
  Then he waits, politely, for his change.
- **05:00** — first direct attack on the list: *"That paper in the staff room is
  twenty-eight years old. Bin it."* **The Contradiction.**

**Tape 3.** **Clues — this is the paper night.** The filing cabinet in the back office holds
the undated 1989 complaint (C10), the lock invoice that dates it to 14 April 1989 (C11),
Halvard's margin note *"Was in Oslo all week"* (C12), and Walt's personnel record with a
1994 start date (C15). The lost property drawer holds a postcard from Gothenburg signed
*Ivor* (C13), and it is extremely easy to walk past.

**Seeds Floor 3:** a customer asks directions to a unit the 1998 directory puts on the third
floor.

---

### Night 4 — Blackout · ~16 min

**Feeling:** 1998. Storm outside, no mains, torchlight only, and the building has stopped
pretending to be the present.

**Tasks:** find Walt's old security office · start the backup generator · recover four map
fragments.

**Mechanic — Unstable geometry + the camera room.** Corridors re-link when no player is
inside them and no camera is on them, which makes the camera operator genuinely load-bearing
rather than a spectator. The operator has their own job: routing battery power between
camera banks, hand-cranking browned-out cameras, and opening doors that only open from the
desk. The role rotates at each generator restart.

**Solo:** a handheld camera tablet with the same information. It occupies a hand — tablet
or flashlight, never both.

**Beats**
- **01:00** — monitor 3 comes up. There is no camera 3. The floor on it is not dark, it is
  *empty* — no units, no signage, bare screed.
- **02:30** — the walkie plays the crew's own voices saying things they did not say. The
  camera operator can see who is actually transmitting and has to call it.
- **04:00** — generator online. A staircase exists behind the food court that is not on any
  map fragment.
- **04:30** — Floor 3. A door marked **NIGHT MANAGER**. Inside: an empty desk, a gooseneck
  microphone wired into the PA, and rotas on the wall going back to 1986 — with this week's
  already typed, with the crew's names on it. **The Contradiction.** Outside the door,
  dropped: **MALIK — STOCKROOM**.

**Tape 4** — which gets as far as the mechanism and runs out before the name.
**Clues:** the rota wall, signed off every week since 1986 by the same mark (C16); the 1987
directory amendment removing Floor 3, signed M. Vale (C17); the 1986 auction receipt, lot 41,
Northmoor Station (C18); and the PA logbook in the camera room, with entries at eleven-minute
intervals every night for forty years (C19).

---

### Night 5 — Closing · ~20 min

**Feeling:** everything at once. He is not friendly. The music plays backwards. The Great
Clock ticks for the first time in twenty-eight years, and it ticks the wrong way.

**Objective — the closing routine that was never finished in 1998.** Any order, all of it:

1. **Kill the lights, floor by floor.** Four breaker panels. Each floor that goes dark
   makes him angrier and the building smaller.
2. **Return the four name tags.** Nora's to her checkout lane, Lo's to the custodial store,
   Walt's to the security desk, Malik's to the stockroom. Each returned tag summons that
   person's shade to help for 45 seconds — Walt holds a door, Lo kills the noise in a whole
   wing, Malik marks the stock route, Nora reads the list aloud including rule 13.
   **Returning a tag means giving up its passive**, so the finale gets harder as the crew
   does the right thing.
3. **Bring down the main entrance shutter.** Requires every living crew member pulling at
   the same time. Solo: the winch, manually, for 30 exposed seconds.

**Then the accusation.** At **05:00** the crew radios Calder from the security office and
the case board opens: seven suspects, and three evidence slots that have to be filled with
clues they actually found. In a full crew it is a nomination and a vote, and the shift clock
pauses for it, deliberately — the argument is the best four minutes in the game. Calder tests
the case, pushes back once if it does not hold, and then gives them the name over the radio.

**Then the clock.** 05:59. One player winds the hands from 3:33 forward to 6:00 — **40
seconds, locked in place, cannot defend themselves.** Everyone else holds the Night Manager
off with Focus beams. He is only ever a silhouette inside a beam; outside the beams there is
nothing there, which is the point.

**The name is spoken into the PA** as the hands come round. Outcomes, including what
accusing Walt or Nora costs, are in [`09-the-investigation.md`](09-the-investigation.md).

**Everything returns:** Night 1's rules still apply, mannequins stand in the corridors,
false voices on the walkie, and his voice is no longer coming out of the speakers.

**Trap.** Players can attack the clock. Walt's tape argued for it and Walt was wrong.
Striking the movement snaps every clock in the building to 3:33 and costs the crew 90
seconds of total darkness. You finish a shift. You do not smash one.

**True ending:** the correct accusation *plus* all nine collectibles, which lets the crew
play his own 1971 reel back to him through the PA instead of speaking the name. See the
story bible.

---

## 11. Replayability

Finite content is a slow death on Roblox. Three additions that do not damage the story:

- **Seeded nights.** The active rule set, the anomaly pool and which Contradiction fires are
  drawn from a larger table per seed. Clue *locations* rotate from a pool of three each, and
  one wrong suspect gains extra circumstantial support per run — so two crews go down
  different wrong roads and disagree about the answer afterwards, which is exactly the
  conversation the game wants people to have. **The culprit never rotates.** A whodunnit with
  a shuffled answer is a slot machine.
- **Overtime mode.** Unlocked after the first completion. One endless night, rules added
  every in-game hour, leaderboard by hours survived. Cosmetics only.
- **Night modifiers** for repeat runs: *Understaffed* (solo rules with a full crew),
  *Quiet Night* (no walkie), *Stock Take* (every task doubled), *Overtime Pay* (double wages,
  Attention never decays).
