# Direction Log

Everything the project owner has asked for, in the order they asked for it, and how each
one was resolved. Kept so that none of it is lost when the build moves into Roblox Studio.

**This document outranks the others.** Where a design doc contradicts something here, the
doc is out of date and should be corrected.

---

## 1. The premise
*"Ett spel kopplat till Roblox dev. Night Shift – Part 1."*

A five-night co-op horror game set in a dead shopping centre, built for Roblox, 1–4
players. The full original outline is preserved in [`04-game-design.md`](04-game-design.md)
and [`03-story-bible.md`](03-story-bible.md).

**Status:** built out in full.

## 2. English throughout
*"Det ska vara på engelska så anpassa allt samt namnen på allt."*

Every name anglicised. Galleria Nordljus → **Northlight Galleria**, Stora Uret → **the
Great Clock**, Nattchefen → **the Night Manager**, Jonna/Lo/Sven/Malik → **NORA / LO /
WALT / MALIK**, Hotell Vinterhamn → **Hotel Winterhaven**. Full table in the
[README](../README.md).

**Status:** done.

## 3. Critique wanted
*"Ge gärna kritik på saker du tror kan vara bättre."*

Fourteen points in [`02-design-critique.md`](02-design-critique.md), the largest being:
the rules mechanic was being dropped after Night 1, the trust theme had no mechanic behind
it, Night 3 was a solo puzzle in a co-op game, and the ending had no cost.

**Status:** done, and acted on.

## 4. Photoreal graphics and a well-made story
*"Väldigt realistiska grafiker och en välgjord story."*

Art direction written around PBR materials, real-world scale and lighting discipline
rather than polygon count, with a hard four-shadow-casting-light budget and phone-first
quality tiers. Story deepened: the clock's 1904–1971 provenance, Elias Wren, and the
reveal that the Night Manager is not keeping the crew but rostering them.

**Status:** done.

## 5. A whodunnit, solved with the police
*"Man ska försöka lista ut vem som ligger bakom allt, gissa med hjälp av polisen, och det
är så man vinner. Flera att välja på som kan se luriga ut."*

The win condition is naming the Night Manager to DS Ruth Calder and backing it with three
clues the crew actually found. Seven suspects, six of them genuinely supported, each
eliminated by a different kind of evidence. The strongest red herring is the police's own
1998 theory, argued by the detective. Twenty-two clues. Full design in
[`09-the-investigation.md`](09-the-investigation.md).

**Status:** done.

## 6. Eerie, watched, jumpscares, eyes, shadow figures
*"Man ska känna sig iakttagen hela tiden. Ögon i mörkret som försvinner. Skuggfigurer i
bakgrunden. Man ska se delar av figurens konturer. Jumpscares med väldigt högt ljud. Skyltar
som ramlar, ljus som släcks."*

[`10-fear-design.md`](10-fear-design.md): the Presence that watches from 25–60 m and is gone
the instant you look at it, retroreflective eyes visible only in the edge of the torch beam,
silhouettes crossing in front of lit gaps, contour reveals instead of a monster, and thirty
physical startles across structural, light, sound and social channels — including the fascia
sign that shears a fixing and swings down at head height, and the shutter that slams behind
you and seals the corridor you came in through.

**Status:** done.

## 7. Not actually supernatural
*"Det ska inte vara övernaturligt egentligen utan bara väldigt läskigt."*

Read as a presentation rule, and it made the game better: **nothing supernatural is ever
shown on screen, only its results**, and every scare has a mundane explanation authored into
the world — a corroded fixing, a CCTV dome at exactly the position you saw eyes. The list of
things that cannot be explained away is deliberately three items long.

**Status:** done.

## 8. Huge, dark, neon-lit, red EXIT signs, few shops
*"Gallerian ska vara väldigt stor. Neonljus lyser upp den. Röda Exit-skyltar och några få
butiker. Väldigt mörkt."*

168 units on the directory, eleven still trading. General lighting off at night.

**Status:** done — then revised twice, see 12 and 13.

## 9. Red lights preferred, and dimmer
*"Ljuset är för starkt och jag vill ha röda ljus helst."*

The mall now runs on its red emergency circuit at night. Neon became the rarity rather than
the primary source, which also makes the few remaining colours precious.

**Status:** done.

## 10. The lights should hum
*"Dessa ljus ska avge ett litet surrande."*

Every fitting is its own positional emitter, not a baked room tone — a few hundred of them,
each detuned a few cents from 100 Hz and seeded from its position, so every wing beats
against itself differently. It masks the first two footsteps of anything crossing behind
you, and it gives the EXIT blackout its teeth: the loudest thing that happens is a sound
nobody had noticed for four nights **stopping**. See [`06-audio-direction.md`](06-audio-direction.md) §2b.

**Status:** designed. Not yet built.

## 11. The mall must be open inside, with corridors behind
*"Det ska vara som en verklig galleria, öppen och stor inuti. Jag hoppas det är någon
korridor i bak."*

A wing was a 9 m corridor, which is a tunnel. Now: a **6 m void slot** down the centre of
every wing, open from the ground floor to the roof glazing sixteen metres up, 5 m walkways
either side, three floors of balcony overlooking it, two bridges across. And behind the
units, the **service corridor** — 2.4 m wide, 2.45 m ceiling, cinderblock, one bare fitting
every 14 m and most of them dead. The contrast between the two is the horror engine.

**Status:** done.

## 12. Not uniform — randomise it, with windows you can see into
*"Inte så symmetrisk i placering på butiker, dem ska ha lite fönster man ser in. Ingen
galleria har massa samma butiker. Gör dem lite randomiserade — det ska ha funktioner till
scriptet."*

`MallLayout.planUnits()` is a seeded generator that lays each side of each wing out
independently. Frontages from a 5.5 m kiosk to a 31 m anchor; six unit states; setbacks so
the shopfront line jogs. Units have interiors you can see into — party walls, shelf runs,
rails, counters, and in the stripped ones a ladder nobody came back for. Islands in the
middle of the mall and a seating court where it widens.

The seed derives from the wing, so the building is **identical for every player and every
session**. This is a place, not a roguelike.

**Status:** done, and shared by the renderer and the Studio builder.

## 13. Too many EXIT signs, too uniform
*"Exit-skyltar överallt, en helt enformig korridor. Ser inte bra ut."*

Two separate faults. EXIT signs cut from seven per wing to four. More importantly, the red
*bulkheads* every 8 m were a metronome — and being red rectangles in cages, they read as
EXIT signs anyway. Lighting is now three irregular sources: recessed downlights at intervals
drawn between 4.5 and 11 m with a third of them dead, three wall bulkheads per wing at
structural points, and shop security lights carrying most of the ambient.

**Status:** done.

## 14. Night sky, moon, moving cloud, fog outside
*"Man ska se natthimlen, månen ska ge ifrån ett svagt ljus, molnigt och dimmigt UTE inte i
gallerian, och molnen ska röra på sig."*

`tools/sky.py`: a procedural sky sampled per ray — moon, two cloud layers drifting at
different speeds, fog on the horizon. Visible through the roof glazing and the new glazed
wing ends. Interior haze halved: the mall's air carries only enough dust for torch beams to
read. **All weather is outside.**

**Status:** done in the preview. Needs building in Studio (see below).

## 15. The clock must be digital, with red numbers
*"Coolare ifall klockan är digital, med röda nummer."*

Accepted, and it improved the story rather than damaging it. See
[`12-the-strike.md`](12-the-strike.md) §1: the face is a **1986 seven-segment LED display**
reading `03:33`, bolted over the 1904 Northmoor Station movement that Halvard never
restored. The dedication plate naming Elias Wren is **behind that panel**, which is why
Malik could not read it and why prying it off on Night 5 is an act rather than a glance.

A friendly modern surface bolted over something old that nobody ever dealt with — the mall
did to the clock exactly what the Night Manager does to himself.

**Status:** designed. Preview render pending.

## 16. The clock strikes, and everything goes wrong
*"Klockan börjar slå vid något tillfälle och det händer väldigt konstiga saker, allt börjar
skaka."*

[`12-the-strike.md`](12-the-strike.md). It strikes **thirty-three times**, four seconds
apart, and the crew counts out loud because that is what people do. Three phases: wrong but
survivable, the building moves, breakdown. The dry fountain runs, every shutter rolls to
half height, every mannequin turns to face the atrium, every display in the building agrees
on `03:33`, and the count of people in the building is one too many.

Thirty-three because the last train left Northmoor at 03:33, and Wren struck the bell once
for every minute past the half hour so the platform knew how long they had.

**Status:** designed. Not yet built.

---

## Standing constraints

- **Roblox Studio is the build target.** Everything here is written to be built there.
- **`MallLayout.luau` is the single source of truth** for the floor plan. The Python preview
  renderer mirrors it; if they disagree, the Luau is right.
- **The preview renderer is not the game.** It renders boxes, cylinders and oriented boxes to
  judge scale, density and light. Photoreal comes from PBR materials in Studio.
- **The building never changes between sessions.** Seeded, not random.
- **Nothing supernatural is shown on screen** — only results, always with a mundane
  explanation available.

## Not yet built in Studio

Everything. The repository holds design, layout data, a greybox generator and an offline
previewer. No Roblox place file exists yet. The order of work is in
[`08-roadmap.md`](08-roadmap.md); the next real step is running the greybox in Studio and
walking it in the dark.
