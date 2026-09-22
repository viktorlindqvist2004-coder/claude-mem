# Audio Direction

Sound is doing more work in this game than the renderer is. The mall is dark; the player's
torch shows them a 60° cone of it. Everything outside that cone is audio.

---

## 1. Principles

1. **Diegetic first.** Almost everything the player hears has a physical source in the
   world with a position: ceiling speakers, fluorescent ballasts, a chest freezer, a
   trolley, the escalator motor, rain on the atrium glass. Non-diegetic score is reserved
   for four moments in the whole game.
2. **Silence is a resource, and we are stingy with it.** If the mall is quiet all the time,
   quiet means nothing. Ambience runs constantly, and the scares are built from *its
   removal*.
3. **Startles are physical, budgeted and loud.** Around five a night, all of them a real
   object falling, slamming or giving way, never a face and never a musical stinger. The
   catalogue, the cooldowns and the loudness ceiling live in
   [`10-fear-design.md`](10-fear-design.md). The part that belongs to audio is the **silence
   ramp**: duck ambience and muzak by 14 dB over the 2.5 s before the hit and cut it entirely
   for the last 0.4 s. Nobody notices the ramp, and it roughly doubles the startle — which is
   why the loudest moment in the game does not have to be the loudest sound in the game.
4. **Every rule with an audio component must be audible under a four-player voice chat.**
   If a tell is inaudible when friends are talking, it is not a tell.

---

## 2. The music is a mechanic

A **90-minute loop of mall muzak**, playing from ceiling speakers as positional audio, not
as a 2D track. It is a real tracklist of ~26 cues with fixed order and fixed timings, and
the player can learn it. That is the point: **Rule 2 is only playable because the loop is
knowable.**

- Style: 1986–1994 instrumental easy listening. Warm, thin, slightly wow-and-fluttered, as
  if from a cassette that has been running for twenty-eight years.
- Mix: `RollOffMode = InverseTapered`, low pass above ~6 kHz, and audible speaker-cone
  distortion. It should always sound like it is coming from a ceiling grille two rooms away.
- **Anomalies** are the mechanic: an early track change (Rule 2), a track playing backwards,
  the same track twice, a track with the tape audibly stretching, and — once, on Night 4 —
  silence where a track should be, which is far worse.
- **Night 5:** the whole loop plays in reverse, at the correct volume, from the correct
  speakers. No other processing. It does not need any.

---

## 2b. The hum

Every light fitting in the building is its own positional emitter. Not a room tone, not a
looping ambience bed with "fluorescent hum" baked into it — **one sound object per fixture**,
at the fixture, falling off with distance.

This is a few hundred emitters and it is worth every one of them.

**What it is.** A mains ballast at 100 Hz with its second and fourth harmonics, plus a thin
whine up at 8–12 kHz that only becomes audible within about four metres. Quiet: a single
bulkhead should be inaudible from fifteen metres and unmistakable from three.

**Detune every fixture.** Each one sits a few cents off 100 Hz, seeded from its position and
fixed for the life of the game. A wing with twenty bulkheads then beats against itself, and
the beat pattern is *different in every wing* — which means the building has an audible
fingerprint per location, and players learn it without ever being told there is anything to
learn.

**What it buys, in order of how much it matters:**

1. **Silence becomes locatable.** When a fitting dies, a sound stops in a specific place. A
   player twenty metres away registers the change before they register the darkness.
2. **It masks.** The hum sits right where footsteps and cloth movement sit. Something can
   cross a wing behind you and the hum eats the first two steps, which is exactly the margin
   the Presence needs.
3. **It gives the EXIT blackout its teeth.** When every red fitting in the building goes out
   at once, the loudest thing that happens is that a sound the crew had completely stopped
   hearing for four nights **stops**. Four seconds of true silence, then the hum comes back
   on before the light does — a fraction of a second of hearing the building before you can
   see it.
4. **Failing fixtures are free characterisation.** One in about twelve buzzes irregularly:
   louder, with a cycling rattle, dropping out for half a second at a time. Players will
   learn which ones and use them as landmarks, and then one night a fixture they know will be
   silent.

**Implementation.** One `Sound` per fixture, `RollOffMode = InverseTapered`, `RollOffMaxDistance`
about 16 m, in a dedicated `SoundGroup` so the whole circuit can be ducked or killed as one.
Stream the emitters with their fixtures — a wing that has not loaded should not be humming.
Cap concurrently audible emitters per player at around 24 by distance; the rest are muted, not
destroyed, so nothing pops when the player turns.

**The mix rule that keeps it from becoming noise:** the hum is the *floor* of the mix, not a
layer in it. Everything else in the game is mixed relative to it, and if a player consciously
notices the hum during ordinary play, it is 3 dB too loud.

---

## 3. The Night Manager's voice

The single most important asset in the project. Cast it like a radio play, not like a
monster.

**Direction:** male, 50s–60s, warm, measured, a public-service announcement cadence softened
by decades of management speak. He is *kind*. He compliments specifically. He never hurries.
The actor should play it as a man who genuinely believes he is looking after you, because
he does.

**Two processing chains, both diegetic:**

| Chain | Use |
| --- | --- |
| **PA** | Band-pass 280 Hz–3.6 kHz, light saturation, convolution reverb of the actual atrium space, played from the ceiling speaker positions. |
| **Walkie** | Tighter band 400 Hz–3 kHz, heavier compression, squelch tail on key-up and key-down, played from the walkie on the player's hip. |

**The arc** (see story bible §4): clean on Night 1, pitch drift on Night 2, a second room
audible behind him on Night 3, his voice on a walkie that is switched off on Night 4, and
on Night 5 **no processing at all** — he is in the room. The only PA artefact left is the
word "attention".

**Recording note:** record the Night 5 lines in the same session as the Night 1 lines, dry
and close, and process backwards. The comfort in the early lines has to be the same
performance as the thing at the end, or the reveal does not land.

---

## 4. The four, and the tapes

The tapes are the story's whole delivery mechanism and they must be *listened to*, which
means they must be worth listening to and must not be talked over.

- Each tape is 50–70 seconds. Cassette hiss, mic handling, room tone, real pauses.
- Playing one **ducks the music by 9 dB** and drops ambience, so the crew can hear it — and
  that same duck is why Attention rises, diegetically: the building notices the quiet.
- The deck is a physical object. Someone has to stand near it. Somebody usually will not,
  and will be somewhere else, alone, while the rest of the crew are listening.
- Distinct voices, distinct rooms: Nora over register beeps; Lo over a vacuum that gets
  switched off mid-sentence; Walt in a small dead room with a radio hissing; Malik whispered
  and close in a large empty one; **Wren on a 1971 reel with rain on a canopy**, which should
  sound like a different medium entirely, because it is.

---

## 5. Ambience and the sound of the building

A continuous positional bed, per zone:

| Zone | Bed |
| --- | --- |
| Atrium | Large-room tone, rain on glass, a distant escalator motor, the ventilation fundamental at ~48 Hz |
| Retail floor | Carried almost entirely by the per-fixture hum above, not by a bed |
| Supermarket | Chest freezer compressors cycling on and off on independent timers |
| Back of house | Dead, carpeted, close. Doors thud rather than ring. |
| Basement | Water, a pump, and a long reverb tail that does not match the room's size |
| Neon wings | A trading unit's sign adds a transformer buzz an octave up from the ballast hum — brighter, edgier, and audible from further away. Eleven of them in the building, so each one is a landmark you can hear before you see. |
| Floor 3 | **Nothing.** No bed at all. The only place in the game with true silence, and it should be alarming. |

`SoundService` reverb is set per zone (`Enum.ReverbType.Hallway`, `.Room`, `.ConcertHall`
for the atrium, `.Alley` for the loading dock) and cross-faded on zone transition.

**Footsteps** are material-mapped across terrazzo, carpet tile, vinyl, wet floor, and metal
grating, with a distinct set for the crew's issue boots. Other players' footsteps are
audible at range — you should be able to hear where your friends are without the walkie,
because that makes losing them meaningful.

**The Great Clock** makes no sound at all for four nights. On Night 5 it ticks, reversed,
at 0.9 Hz, and it is audible from anywhere in the building.

---

## 6. Voice chat coexistence

Roblox voice chat is loud, constant, and the best thing about co-op horror. The mix must
assume four people talking over everything.

- Sidechain the music and ambience by 4 dB against proximity voice.
- Keep every gameplay-critical cue **above 2 kHz or below 200 Hz** — out of the vocal
  midrange — so shutters, the tape click, the name-call and the mannequin scrape survive a
  conversation.
- The Night Manager is exempt: he ducks *everything*, including voice chat, by 6 dB. When
  he speaks, the mall listens, and so do the players.
- Text-chat players get a subtitle track for every voice line in the game. This is an
  accessibility requirement and also the only way a large share of the Roblox audience will
  ever receive the story.

---

## 7. Asset list (first pass)

- 26 muzak cues + 6 anomaly variants + full reversed loop
- ~180 Night Manager lines across 5 nights (task prompts, compliments, deflections, the 5
  Contradictions, escalation, the two endings)
- 5 tapes, fully performed
- 4 shade vocalisations (non-verbal, warm)
- ~40 mannequin movement/scrape/contact cues
- Zone beds × 6, footstep sets × 6, and a prop Foley kit (shutters, trolleys, tills,
  freezers, doors, the winch, the clock hands)
