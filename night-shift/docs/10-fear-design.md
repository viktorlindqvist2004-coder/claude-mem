# Fear Design — Dread, the Presence, and the Startles

The mall is enormous, unlit, and almost empty. You have a torch with a 60° cone and
everything outside that cone is a guess. The job of every system in this document is to make
the crew certain they are being watched and never able to prove it.

---

## 1. The deniability rule

**Nothing supernatural is ever shown on screen. Only its results.**

Every scare in the game has a mundane explanation available, built into the asset, and a
player who walks over and looks will find it:

| What happened | What you find if you check |
| --- | --- |
| A shop sign tore loose and swung down at head height | Two corroded fixings, one sheared, thirty years of damp |
| Eyes, at head height, in the dark, gone when you aimed at them | A CCTV dome at exactly that position — or nothing, because you had already looked away |
| A figure crossed in front of the neon at the end of the wing | A mannequin, a swinging sign, and an angle |
| The mannequin count is wrong | You probably miscounted. It is dark and there are a lot of them. |
| Someone said your name in the stockroom | The PA is wired into that room and he has been told your names |

The player will not believe any of it. That is the point. **Ambiguity is more frightening
than confirmation**, and it costs nothing to build — it is a matter of where you put the
corroded bolt.

This is also why the mannequins never move while observed. You never watch the impossible
happen; you only ever come back and find the result, which is exactly how you would
experience an intruder in a building.

**The list of things that cannot be explained away is deliberately three items long:** Floor
3 (and even that has a paper trail — Margaret Vale deleted it from the directory in 1987),
the four shades on Night 5, and the last three minutes of the game. Everything before that
can be read straight through as *a very large dark building with a man in it*, which is what
the crew are investigating anyway.

---

## 2. The Presence

The Night Manager is in the building from Night 1. He does not chase, he does not attack,
and he is never rendered as a whole figure until the final act. He **stands at distance in
unlit volume and does nothing**, and that is more than enough.

### The resolution rule

The core trick, and the thing that must never break:

> A player must almost never get a clean look, and it must always be their own action that
> takes it away.

`PresenceService` spawns him in a volume that is (a) unlit, (b) at 25–60 m, and (c) between
18° and 42° off the player's view centre — visible, but never where you are looking. Then:

- If the player's view centre swings within **9°** of him, he is gone before the eye can
  resolve him — behind a pillar, around a corner, into a shop unit, always with a plausible
  occluder to have gone behind.
- If a **torch cone** lands on him, same thing, and it happens one frame before the beam
  arrives, so the player sees the *edge* of him leaving.
- If the player closes to under 15 m, he is not there and never was.
- He is never removed by simply fading out. He always goes **behind something**.

The result the player reports to their friends, every time, is: *"there was someone there,
and when I looked he was gone."* Which is what people say about real intruders.

### Contour reveals

You never see him. You see parts of him, always as an interruption of something else:

- **A shoulder and the side of a head** in the spill of a red EXIT sign, forty metres down a
  wing.
- **An occlusion event**: a neon sign at the end of a corridor goes dark in a human shape
  for 0.4 seconds. You did not see a figure. You saw a sign get blocked. This is the single
  best and cheapest scare in the whole design.
- **A coat hem** passing the gap between two shelving bays, at ankle height, while you are
  crouched facing the other way.
- **A reflection** in a shopfront pane — him, in the glass, standing in the aisle behind you.
  Turn around: aisle, no one. Turn back: glass, no one.
- **In the torch beam's outer falloff**, where the light is too weak to resolve detail, so
  you get a mass and a height and no face.
- **Standing on the escalator**, riding it, at the moment it starts by itself.

### The stare

Once per night, on a lone player, he simply stands and is not removed. He does not move, he
does not approach, and the removal rules are suspended for up to eight seconds. The player
can look straight at him. He is a shape at forty metres in the dark and there is no detail to
resolve — and he is still there. If the player walks toward him, he is gone at fifteen
metres as always.

Eight seconds is an extremely long time in a horror game. This is the moment players will
describe to each other afterwards.

### The confirmed sighting

**Exactly one per night, and the whole crew sees it together.** Total deniability every
single time stops being frightening and starts being frustrating — players decide the game is
gaslighting them and disengage. One shared, unambiguous sighting a night is what keeps them
believing their own eyes for the other eleven minutes.

---

## 3. Eyes

Two points of light at head height in unlit volume. They do **not** glow — nothing in this
game emits light that should not. They are **retroreflective**: they catch the torch beam and
return it, which is how animal eyeshine and a camera lens both actually behave.

The mechanic that makes it work:

- They are visible when the beam is **near** them — in the outer 25 % of the cone, or in the
  spill, or within about 20° of the aim point.
- Aim the beam **directly** at them and there is nothing there.

So the player sees them in their peripheral torchlight, turns to look, and the act of looking
removes them. Same rule as the Presence, expressed in light instead of geometry.

**They blink.** A 110 ms dropout, once or twice, at irregular intervals. A blink is the
cheapest possible way to make two dots read as alive, and it is the difference between "a
reflector" and "something is looking at me".

**Sources, mixed so no reading is ever safe:**

| What it actually is | How often |
| --- | --- |
| A CCTV dome lens | Common |
| A mannequin's glass eyes in an unlit shop unit | Common |
| The retroreflective strip on a hi-vis jacket on a hook | Occasional |
| A pair of fire-alarm LEDs, dead, just catching the beam | Occasional |
| Two wet patches on tile at exactly head height, which is not where tile is | Rare, and wrong |
| Him | Rare |

Roughly 70 % of eye sightings should resolve, if checked, into something real and boring.
That ratio is what makes the other 30 % land.

**Placement:** behind shopfront glass, at the back of unlit units, down service corridors, in
the gap under the stock cages, above head height in the atrium void, and — once per game,
inside the mall, at 03:33 — at ground level, in the middle of a wide open floor, where
nothing is.

---

## 4. Shadow figures in the background

Distinct from the Presence: these are **ambient**, frequent, low-intensity, and almost all of
them are nothing.

- **Crossings.** A silhouette passes a lit gap at 40–90 m — across the mouth of a corridor,
  between two neon signs, along an upper balcony. Duration 0.3–0.8 s. Never near enough to
  resolve.
- **Floor reflections.** Polished terrazzo doubles every neon sign, so a crossing figure
  interrupts the sign *and* its reflection. Two chances to be half-seen, and the reflection
  reads a fraction of a second after the figure, which is deeply unsettling and entirely
  physically correct.
- **Static shapes that were always there.** A mannequin, a stack of chairs, a pillar with a
  coat on it. Placed specifically so a torch beam sweeping past resolves them as a person for
  one frame. The best jump in the game is the one the level designer built out of furniture.
- **The upper balconies.** The atrium means the crew can be seen from above, and they know
  it. Put crossings up there. A figure at the balcony rail, four floors of void between you.

**Budget:** 1 crossing every 40–70 s while a player is in a space that supports one, weighted
heavily toward players who are **alone**. Splitting up is the trigger.

---

## 5. Startles

The loud ones. The rules first, because loudness without discipline is just noise.

### The five rules of a startle

1. **It is physical and diegetic.** Something in the world falls, slams, breaks or starts.
   There is never a screaming face and never a musical stinger. After the player's heart
   restarts they can walk over and look at the thing that fell, and it is still lying there
   for the rest of the night.
2. **Silence comes first.** Duck the ambience and the muzak by 14 dB over the 2.5 seconds
   before the hit, and cut it entirely for the last 0.4 s. Players never consciously notice
   the ramp. It roughly doubles the startle for free, and it is why the loudest moment in the
   game does not need to be the loudest sound in the game.
3. **Cooldowns are absolute.** Minimum 90 s between startles globally, minimum 25 s after any
   Presence event, and never during a precision task — except on Night 5, where the rule is
   suspended and the crew will feel the difference.
4. **Budget per night:** 5 physical startles, of which 2 are "large". A scare every ninety
   seconds trains players not to care; the fear lives in the gaps.
5. **Three fake-outs for every payoff.** A build-up that resolves into nothing is the most
   valuable thing in the catalogue, and it is free.

### Loudness, honestly

These need to be genuinely loud to work, and the audience is largely teenagers in headphones
at one in the morning. Both things are true, so:

- Hard peak ceiling of **−1 dBFS true peak**, with the *impact transient* carrying the
  startle rather than sustained level. A 30 ms transient is what makes you jump; a two-second
  roar is what makes you take the headphones off.
- The loudest startle sits about **18 LU above the ambient bed**, which is a lot, and is
  achieved mostly by how quiet the 2.5 s before it were.
- **"Reduce loud scares"** accessibility option: lowers startle peaks by 12 dB and removes
  the two loudest triggers. It does **not** remove the events — the sign still falls, the
  shutter still slams. An accessibility option that deletes the game is one everybody turns on
  and then nobody is scared.
- **"Reduce flashing"** option for the Night 2 strobe and the full-lights flash, with the
  scare rebuilt as a slower fade rather than removed.
- Subtitles for every startle (`[SIGN TEARS LOOSE]`, `[SHUTTER SLAMS]`) with a direction
  indicator, so deaf and hard-of-hearing players get the information and, importantly, the
  *fright*.

---

## 6. The startle catalogue

Be liberal about reusing these with different dressing; be conservative about how often any
one crew sees them.

### Structural — things that fall, drop and give way

1. **The fascia.** A shop's sign shears one fixing and swings down on the other, stopping at
   head height in front of the player, then keeps swinging and creaking for the next two
   minutes. It never stops creaking. It is on the route back.
2. **Pallet collapse.** A stack of empty pallets in the loading bay goes over, all at once,
   flat onto concrete.
3. **The diffuser.** A full ceiling light panel drops out of its grid and shatters on tile
   two metres away. *(Large.)*
4. **The shutter.** A security shutter releases and slams to the floor — **behind** the
   player, sealing the corridor they came in through. *(Large.)* They now have to find
   another way, in the dark, having just been frightened.
5. **The mannequin.** One falls out of a window display, face first, through the glass.
6. **The trolley.** A shopping trolley rolls the length of the atrium on its own and hits the
   fountain kerb at speed. It was audible for four seconds first, which is worse.
7. **The banner.** A thirty-year-old fabric ceiling banner — **SALE — SALE — SALE**, 1998 —
   lets go and drops over a player. Two seconds of seeing nothing but faded red fabric while
   the crew is shouting.
8. **The cages.** A row of stock cages in the stockroom shifts and rolls half a metre, in
   sequence, toward the player.
9. **The fire door.** Opens hard against its stop, from the far side, and does not close.
10. **The pane.** A shopfront cracks across with a sound like a rifle shot, spiderwebbing
    outward from a point at head height — **from the inside.**
11. **The sprinkler.** A head lets go: high-pressure hiss, a cold drench, and a soaked player
    whose torch now has water on the lens for the rest of the night.

### Light — the mall's own electrics

12. **The run.** Every neon sign in a wing dies in sequence, running *toward* the player. The
    last one to go out is the one directly above them. *(Large.)*
13. **The EXIT blackout.** Every red EXIT sign in the building goes out at once. Four seconds
    of absolute dark. Then back on, all at once, and one of them is now behind a figure.
    *(Large. Once per game.)*
14. **The far sign.** A sign at the end of a wing that has been dead all game flickers on for
    half a second, and there is a silhouette in front of it, and then it is dead again.
15. **The contact.** Your own torch dies for 1.4 s and comes back. It is a loose battery
    contact. It will happen again. It is not scripted to happen at a bad moment, which means
    sometimes it does.
16. **Full house.** Every light in the mall — all four floors, everything — comes up to full
    for 0.3 s and goes out. The scare is in the **afterimage**, which has a figure in it, and
    which cannot be checked. *(Large. Once per game, Night 4.)*
17. **The vending machine.** A compressor kicks in with a bang and the machine's display
    lights up — and it is the only lit thing for fifty metres, and it is between the player
    and where they were going.

### Sound — no visual at all

18. **The half-beat.** Footsteps in cadence with the player's own, offset by half a step.
    Stop walking, and one extra footstep lands.
19. **Upstairs.** A trolley being pushed, slowly, on the floor above. It tracks the player's
    position.
20. **The open mic.** Breathing, close to a microphone, over the walkie — which is switched
    off. *(Night 4.)*
21. **Playback.** A player's own voice, recorded from forty seconds earlier, played back from
    a ceiling speaker behind them.
22. **The whistle.** Someone whistling along to the muzak track currently playing — slightly
    ahead of it, the way you whistle a song you have known for a very long time.
23. **The name.** A crew member's name, said once, in another crew member's voice, from a
    direction nobody is in.
24. **Feedback.** A hard PA feedback howl through every speaker in the building at once. No
    words. *(Large.)*
25. **The phone.** A landline rings at an abandoned customer service desk thirty metres away
    in the dark. It is not loud. It keeps ringing. It rings until someone picks it up, and
    the game will wait a very long time.
26. **The escalator.** Starts. On its own. Going up, to a floor that is not on the
    directory.

### Social — the ones that need friends

27. **The wrong voice.** Proximity voice from a crew member's exact position, in their voice,
    saying something they did not say — while they are stood right there.
28. **The count.** The crew's own torch beams. For four seconds there are five.
29. **The tap.** A single knock on the other side of a door a player is holding closed.
30. **The follow.** Footsteps behind a player that stop when they stop — which every crew will
    test, and which will pass the test.

---

## 7. The Dread Director

A server-side director owns every event above, so that the game escalates on the crew's
behaviour rather than on a timer.

**Inputs per player:** time since their last scare of each class, whether they are alone,
distance to the nearest crew member, whether they are lit, whether they are on task, the
crew's Attention tier, and how much of the night is left.

**Targeting weights:**
- **Alone** is the dominant multiplier. ×3.0 on every class.
- **In the dark and off-task** ×1.6.
- **Has not been scared in 150 s** ×1.5.
- **Has been scared in the last 90 s** ×0 — the cooldown is a hard gate, not a weight.
- **Mid-precision-task** ×0, except Night 5.
- **Has just been startled and is now moving fast** — suppress everything for 20 s and let
  them run. The recovery is part of the rhythm.

**Escalation by Attention tier:**

| Tier | Presence | Eyes | Crossings | Startles |
| --- | --- | --- | --- | --- |
| Calm | Rare, always distant | Occasional, all mundane sources | Sparse | Structural only, small |
| Noticed | Regular, one stare available | More frequent, one wrong source | Regular | Full catalogue |
| Watched | Close range, contour reveals | Frequent, blinking | Constant, some on balconies | Large ones unlocked |
| Found | He is a location, not a suggestion | — | — | Suppressed; the chase *is* the scare |

Note that **Found suppresses startles entirely.** When he is actually coming, the last thing
the scene needs is a falling sign. Terror and startle are different instruments and they do
not play at once.

**Per-night curve.** Every night starts almost quiet for the first 90 seconds. Let them get
comfortable and let them split up. The first event of the night is always small, and it
always happens to whoever walked off on their own.

---

## 8. Night by night

| Night | What the fear is doing |
| --- | --- |
| **1** | Establishing that the dark is enormous and that you are alone in it. Two startles only, both structural, both explicable. One crossing. One confirmed sighting at 03:33 in the basement, with the lights on. The Presence never comes closer than 40 m. |
| **2** | The eyes arrive, in a floor full of glass eyes, so they are deniable all night. The Presence does its first stare. Startles are mannequin-flavoured. |
| **3** | The mall is lit and busy, so the fear inverts: the crowd is the dread, and the scares are *social* — the wrong voice, the count, someone in the queue looking at you and not at the till. |
| **4** | The high point. Torchlight only, no mains, geometry that will not hold still. Full house (16), the EXIT blackout (13), the open mic (20), and contour reveals constantly. This is the night people will clip. |
| **5** | Startle discipline off. He is a location now. Everything from Nights 1–4 returns at once and the director stops protecting anyone. |

---

## 9. What this is not

- **No monster reveal.** There is never a moment where the camera shows the player what has
  been following them. The closest the game gets is a silhouette in a torch beam in the last
  three minutes, and even that has no face.
- **No stinger music.** Not once.
- **No scripted "look here" camera.** The player's camera is theirs. If they miss a scare
  because they were looking the wrong way, they missed it, and their friend saw it, and the
  argument about whether it happened is better than the scare was.
- **No chase until Night 5.** Four nights of something that watches and never approaches
  builds a dread that a monster chasing you from Night 1 can never reach.
