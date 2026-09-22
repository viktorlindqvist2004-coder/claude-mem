# Roadmap

Sequenced so that the riskiest unknowns are answered first. The two things that can kill
this project are **the observation system not feeling fair** and **photoreal lighting not
running on a phone**, so both are proven in Milestone 1, before any content is built.

---

### M0 — Pre-production *(current)*
- [x] Design critique and revisions
- [x] Story bible: lore, timeline, cast, rules, five tapes, three endings
- [x] Systems design and night-by-night breakdown
- [x] Art and audio direction
- [x] Technical architecture and repo skeleton
- [ ] Reference boards: mall photography, lighting, mannequins, the clock
- [ ] Greybox the full mall at correct scale, walkable end to end
- [ ] Block out the muzak loop with temp music so Rule 2 is testable

**Exit:** you can walk the whole mall in Studio at correct scale and it feels like a mall.

---

### M1 — Vertical slice: Night 1, shippable quality
The whole game proven on one night.
- [ ] `ShiftClock`, `NightService` state machine, task board, clock in/out
- [ ] `RuleBook` with the 13 rules as data, and rules 2, 4 and 7 fully playable
- [ ] Attention meter with diegetic feedback
- [ ] Flashlight: wide/focus, battery, charging stations
- [ ] Walkie + proximity voice + subtitles
- [ ] The Night 1 Contradiction, start to finish
- [ ] NORA's tag, Tape 1, and the tape deck
- [ ] Final-quality art pass on **one corridor, the basement, and the atrium only**
- [ ] Quality tiers implemented and measured on a real mid-range phone

**Exit:** Night 1 played end to end by four external testers who have never seen the doc,
at 30 fps on a phone, and at least two of them ask him what time it is without being
prompted.

---

### M2 — Nights 2 and 3
- [ ] Server-authoritative observation system + mannequin AI
- [ ] Forged rules and the handwriting tell
- [ ] Four-station customer detection, tells, and the mall re-edit consequence
- [ ] Tags LO and WALT, tapes 2 and 3, tag passives
- [ ] Fashion floor and supermarket art pass

---

### M3 — Nights 4 and 5
- [ ] Unstable geometry (re-linking corridors, observation-gated)
- [ ] Camera room, role rotation, solo tablet
- [ ] Floor 3, the office, the rota wall
- [ ] Full closing routine, the four shades, the clock-winding finale
- [ ] The Night Manager entity: beam-only rendering and chase behaviour
- [ ] Both endings + the soft fail

---

### M4 — Full art and audio pass
- [ ] Every zone to final material quality
- [ ] Cast and record the Night Manager and the five tapes
- [ ] Commission the muzak loop and the reversed version
- [ ] The Great Clock hero asset

---

### M5 — Progression, polish, performance
- [ ] Wages, upgrades, cosmetics, DataStore persistence and migration
- [ ] Seeded nights, Overtime mode, night modifiers
- [ ] Accessibility: subtitles everywhere, colourblind-safe tells, remappable input, a
      brightness range that cannot defeat the darkness
- [ ] Performance pass against the tier budgets on real devices
- [ ] Anti-cheat review of every client→server boundary

---

### M6 — Soft launch
- [ ] Closed playtests with external crews, recorded
- [ ] Tune Attention and mannequin speeds from real session data
- [ ] Store page, thumbnail, trailer
- [ ] Ship Part 1. Start Part 2: **Hotel Winterhaven**.

---

## Open questions

1. **Voice cast.** The Night Manager carries the game. Budget for a real actor and cast
   before M4, not during it.
2. **Music licensing.** The muzak loop must be original and work-for-hire — a
   twenty-eight-year tape loop cannot be a library track we do not own.
3. **Roblox voice chat availability** varies by account age and verification. The
   proximity-text fallback is a launch requirement, not a stretch goal.
4. **Team size.** The photoreal target implies a dedicated environment artist. Decide
   early whether that is a hire, a collaborator, or a reason to shift the art target from
   photoreal to stylised-realist.
5. **Does Part 1 launch alone, or with Part 2 announced?** The credits hook is much
   stronger if there is something to click.
