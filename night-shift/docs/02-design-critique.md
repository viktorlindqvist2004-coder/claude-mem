# Design Critique

Honest notes on the original outline, and what changed as a result. The concept is
strong — the rules mechanic, the four name tags, the "you never meet your boss" frame
and the tape-by-tape reveal are all good. Everything below is about making the good
parts carry more weight.

---

## 1. The rules are the game, and the outline drops them after Night 1

**Problem.** The rule sheet is introduced as "the unique thing about Night 1", then
barely appears again except for one new line on Night 2. That is the best idea in the
document being used as a tutorial gimmick.

**Change.** The rule sheet is the spine of all five nights. It is a physical object in
the staff room and a page in the pause menu. It is *alive*:

- Rules are added between nights.
- Some of Nora's own rules are crossed out — **by her**, because she tested them and
  they were wrong. This tells the player that the list is a record of experiments, not
  scripture, and it makes the list trustworthy without making it infallible.
- From Night 2, lines appear in handwriting that is *not hers*. Nora writes in slanted
  ballpoint that skips. The forged lines are neat, evenly spaced, and never cross
  anything out. **Handwriting is a readable tell**, taught silently on Night 2 and
  weaponised on Nights 4 and 5.

That converts "read the note" into an ongoing observation skill.

## 2. "Who do you trust" is currently theme, not mechanic

**Problem.** As written, the contradiction between the Night Manager and the list is
atmosphere. Nothing hangs on it, so players will shrug and follow the objective marker.

**Change.** Every night contains exactly one **Contradiction**: the Night Manager gives
an instruction the list says is a lie, and *both claims are testable in the world*. The
team has to act, and the outcome is recorded in a hidden **Trust** value.

Night 1's is already in the outline and just needs teeth. Rule 7 says: *if he asks you
to go to the basement, ask him what time it is first — he will not answer.* At 03:00 the
power fails and he asks you to go down and change a fuse. Ask him the time on the walkie
and he deflects, twice, pleasantly. He never says a number. That is the player's first
piece of **evidence**, not vibes, and it costs nothing but the nerve to ask.

Trust changes Night 5: a crew that never tested him gets less help from the four shades
and a Night Manager who still sounds like a friend for the first half. A crew that
caught him lying every night gets a Night Manager who stops pretending on Night 3 —
harder, earlier, but they know the building better.

## 3. The Night Manager is sinister too early to be a betrayal

**Problem.** "Friendly, a little too friendly" in minute one tells the player the answer
before they have a question. There is nothing to betray if trust was never built.

**Change.** He earns it first. On Night 1 his advice is *actually correct and actually
useful* at least twice — he warns you about a genuinely wet floor, he tells you which
shutter jams and how to free it, he reminds you to clock in so you get paid. His first
lie is small, late, and verifiable (the basement). A liar who has been right all night is
much worse than a liar who was creepy from the start.

His voice also degrades across the five nights: clean PA on Night 1, drift and room tone
creeping in by Night 3, and on Night 5 he is coming out of speakers that are not
switched on.

## 4. Night 3 is the weak night

**Problem.** "Spot the fake customer at the register" is a single-player observation
puzzle attached to a single station. With four players it becomes one person working and
three people watching them work. The tells listed (no reflection, 1998 money, face
changes, asks for discontinued goods) are good, but they are all visible from one spot.

**Change.** Split the tells across stations so detection *requires* conversation:

| Station | Who sees what |
| --- | --- |
| **Register** | The money. Serial numbers, dates, coins that were withdrawn in 1995. |
| **Mirror wall / CCTV** | The reflection, or the lack of one. Cannot see the customer directly. |
| **Stockroom** | Whether the requested item exists, and whether the catalogue entry has been *edited*. |
| **Floor** | Behaviour — where they stop, what they touch, whether they breathe on the cold glass. |

No single player can convict a customer. One tell is not proof; the game asks for two.
Accusing a real person costs wages and is *witnessed* by the other customers, who go
quiet. Serving a false one is worse: the mall changes behind you — a door is gone, two
shops have swapped places, and the map in your hand is now wrong for the rest of the
night. Make that consequence **immediately and physically visible**, not an abstract
penalty.

## 5. Failure has no defined shape

**Problem.** The outline has three different failure ideas (lose wages, get frozen, night
gets harder) and no stated model for dying, being downed, or losing a night.

**Change.** One consistent economy across all five nights — see
[`04-game-design.md`](04-game-design.md):

- **Attention** (shared, 0–100). The mall noticing you. Rule breaks, noise and light in
  the wrong places raise it. **Doing your assigned tasks lowers it**, which is the
  thematic heart of the whole game: *work is safety, curiosity is danger*, and the story
  forces you to be curious.
- **Downed and revived**, not killed. A teammate holds a flashlight on you for three
  seconds. Solo gets exactly one self-recovery per night.
- **Night failure exists** and the night restarts — but tapes and name tags you found
  stay found. Losing progress on a horror game people are playing with friends at 1am is
  how you lose the session.

## 6. Night 4 benches a player for twelve minutes

**Problem.** One player in the camera room with a top-down view is a great idea and a
real risk: that player is now watching a minimap while their friends have the game.

**Change.** Three fixes.
- The camera room has **its own failing job**: battery routing, cameras that brown out
  and have to be hand-cranked, doors that only open from the desk. The operator is busy,
  not spectating.
- The role **rotates**. Each generator restart forces a swap, and the walk to and from
  the camera room is itself a sequence.
- The operator is **not safe**. Something uses the camera room on Night 4, and the
  operator sees it on their own monitor before they hear it.

## 7. Solo needs a real design, not a reduced one

**Problem.** "Everything works solo but is more fun with friends" plus "there is a
simpler version with map pieces" means the solo player gets the worse game.

**Change.** Solo players carry a **handheld camera tablet** — the same information as
the camera room, but it occupies a hand, so you cannot hold the flashlight and the
tablet at once. Same knowledge, worse ergonomics, more tension. For Night 2, solo gets
reflective surfaces — shop glass, the mirror wall, a polished floor — so a single player
can watch their own back at the cost of their field of view.

## 8. Pacing should not be uniform

**Problem.** "12–15 minutes per night" against Night 1's four task lists and Night 5's
three full objectives plus a chase is not achievable at the same length.

**Change.** Nights get longer as they get harder: 9 / 12 / 14 / 16 / 20 minutes, about
71 minutes for a clean run. The in-game hour scales with it rather than staying fixed.
A game that ramps in duration *feels* like escalation for free.

## 9. "There is no third floor" is the best line in the document and appears twice

**Change.** Seed it once per night, always peripherally, never confirmed:
Night 1 — the elevator panel has a worn spot where a third button was.
Night 2 — a mannequin in the window is posed looking up.
Night 3 — a customer asks for directions to a shop that the 1998 directory puts on
Floor 3.
Night 4 — the camera room has a monitor labelled **3** and it is not dark, it is *empty*.
Night 5 — the stairs are simply there, and nobody remarks on it.

## 10. The ending is currently a clean win

**Problem.** The team does three chores, turns the hands, sunrise, everyone waves. It is
a lovely image with no cost and no player expression.

**Change.**
- Turning the hands from 3:33 to 6:00 takes **one player locked in place** for 40
  seconds while the rest hold the Night Manager off with flashlight beams. Whoever takes
  the clock is making a real decision in front of their friends.
- The **standard ending**: the mall closes, the four leave, the Night Manager is
  displaced but not resolved — the last shot is the PA light on his empty office still
  lit.
- The **true ending** (all four tags, all five tapes): you can use the microphone in his
  office and **say his name**. It is the only time he sounds like a person.
- The **soft fail**: if 6:00 passes with the routine unfinished, the clock snaps back to
  3:33 and the night begins again, with your crew's name tags now hanging in the staff
  room. That single image justifies the entire premise of the series.

## 11. The tapes should cost something

**Change.** Tapes are not read on pickup. They are played on the stockroom boombox or
the security desk deck — which takes time, makes noise, and raises Attention. Lore
becomes a risk you choose to take, and the team has to decide *when*. The alternative
(auto-play on pickup) means nobody listens to a word of the story, which is exactly what
must not happen to a game whose story is this good.

## 12. The name tags should be active before Night 5

**Change.** Carrying a tag grants a small passive with a matching cost, and the tag can
only be held by one player:
- **WALT — Security**: doors you have closed stay closed. You cannot run.
- **LO — Custodial**: you move silently. You cannot use the walkie.
- **MALIK — Stockroom**: you can see item and stock labels through one wall. Something
  can see you back.
- **NORA — Checkout**: you can read the forged lines in the rules as forged, at a
  glance. The Night Manager now addresses you by name.

Returning them on Night 5 therefore means giving up your advantages one at a time, which
makes the finale get harder as you do the right thing. That is a much better final act
than a fetch quest.

## 13. Roblox reality check on "very realistic graphics"

This is achievable, and it is mostly not a modelling problem.

- Realism in Roblox comes from **PBR materials, correct real-world scale, and lighting
  discipline** — not polygon count. A correctly lit terrazzo floor with a proper
  roughness map sells the mall. A 90k-triangle bench does not.
- **`Future` lighting with shadow-casting dynamic lights is the budget killer.** Four
  flashlights in one atrium is four shadow-casting spotlights. Everything else must be
  baked or non-shadow-casting. This constraint is in
  [`05-art-direction.md`](05-art-direction.md) as a hard rule, not a guideline.
- **Most of the audience is on a phone.** A quality-tier system is not a polish task, it
  is a launch requirement, and it needs to be in the engine from the vertical slice.
- Mercifully, dark corridors, a single moving light source and a lot of silence is both
  the most frightening way to present a mall and the cheapest.

## 14. Retention: five nights is an hour, and then what?

Roblox punishes finite games. Additions that do not compromise the story:

- **Seeded nights.** The rule list, the anomaly set and the contradiction are drawn from
  a larger pool. Two crews compare notes and disagree — which is the exact social texture
  the game wants.
- **Overtime.** After finishing Part 1, a single endless night with escalating rules for
  leaderboard and cosmetics.
- **Wages buy cosmetics, never safety.** Uniforms, torch housings, walkie skins, staff
  room decorations. Selling a better flashlight to a player who is stuck is how a horror
  game stops being frightening.

---

## Smaller notes

- **1986 → 1998 → now.** 1998 + 28 = 2026, which is consistent with "first time in 28
  years". Keep those numbers locked; they are load-bearing in three tapes.
- **The clock needs an origin.** "A clock nobody has seen move" is an image. Giving it a
  provenance — a station clock, whose whole purpose was telling people when to leave,
  installed in a building nobody leaves — makes it a *theme*. See the story bible.
- **Walt's 1998 mistake should be the player's temptation.** He tried to *stop* the
  clock. Stopping it is what froze everything. The solution is to **finish the shift**
  and wind it *forward* to closing. The game should let players try to smash it on Night
  5 and punish them for it, because that is what the outline's own tape 3 sets up.
- **Rule 13 is unfinished.** Nora's list trails off mid-sentence: *"If the clock ever
  starts again,"*. Payoff on Night 5, when it does.
- **Cut the "wrong lighting" penalty for breaking rules.** "You lose pay" as a
  punishment for breaking a rule in a horror game reads as an arcade score. Rule breaks
  should raise Attention — a threat — and pay should be tied to the job. Keep the
  currencies separate: **wages reward competence, Attention punishes curiosity.**
