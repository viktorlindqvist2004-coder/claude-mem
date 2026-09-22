# Scene Map — every beat, and the room it happens in

The question this answers: *does the whole story take place in the mall?*

Almost. Part 1 is about people who cannot leave a building, so the building is where
it happens. But there are four places that are not the shopping floor, and three of them
carry beats no mall room can.

---

## The places

| Place | What it is | Used on |
| --- | --- | --- |
| **The mall** | Atrium, two short arms, eleven named rooms behind them | Every night |
| **Back of house** | The 2.2 m service corridor and the rooms off it | Every night — most of the game |
| **The basement** | Plant room, electrical cupboard, the fuse box | Nights 1 and 5 |
| **Floor 3** | Bare screed, no signage, no sound, and the manager's office | Night 4 and 5 |
| **The car park** | Outside the staff door. Walt's car has been in the same bay since 1998 | Start and end of every shift |
| **Northmoor Police, interview room 2** | DS Calder, the case board, the only white light in the game | Between every night |

The interview room matters more than its size suggests. After four nights of red at 2.5 m,
a white strip light over a formica table is a physical relief, and it is where the crew
argue about who did it. The investigation has nowhere to live without it.

---

## Night 1 — First Shift

| Time | Beat | Room |
| --- | --- | --- |
| 21:50 | Arrive, walk in from the car | **Car park → staff door** |
| 22:00 | Clock in. Rule 1 is about this machine | **Staff room** — `TimeClock` |
| 22:02 | Read the rules taped inside the locker | **Staff room** — `RuleSheet` |
| 22:10 | Task: face up the shelves | **Supermarket** |
| 22:40 | Task: mop the landing | **Atrium**, foot of the stair |
| 23:20 | He warns about a genuinely wet floor, and is right | PA, heard from **anywhere** |
| 00:30 | Music changes track early. Rule 2 | **Mall arms** — the ceiling speakers |
| 01:45 | A player's name is called from the stockroom. Rule 4 | **Stockroom** |
| 02:00 | Task: shutters down. Rule 11 | **Both mall arms** |
| 02:30 | Task: bins to the dock | **Loading dock** |
| 03:00 | Power fails. He asks for a fuse change. **The Contradiction** | **Camera room** — the PA speaker |
| 03:20 | Down the stair, along the basement corridor | **Basement corridor** |
| 03:33 | **NORA — CHECKOUT**, beside the fuse box, in standing water | **Electrical cupboard** |
| 06:00 | "You're a good fit here." Out through the staff door | **Car park** |
| — | Tape 1, in the checkout drawer | **Supermarket** — `CheckoutOne` |
| — | Calder's first call, on the way out | **Car park** |

## Night 2 — The Mannequins

| Beat | Room |
| --- | --- |
| Dress the window mannequins to a printed plan | **Fashion** |
| Count the stock against the 1998 book. Rule 6 | **Fashion** and **Stockroom** |
| 01:00 — one is standing in the staff room, facing the rule sheet | **Staff room** |
| 02:30 — the lights strobe and they move between flashes | **Fashion** |
| 04:00 — "Put them back." The forged line says not to | **Staff room**, the sheet |
| The red-collared one, and **LO — CUSTODIAL** around its neck | **Fashion**, window bay |
| Tape 2 | **Custodial store** |
| Rule 5 is struck out for a reason | **Fashion** — the mirror wall |

## Night 3 — Night Customers

| Beat | Room |
| --- | --- |
| Serve the register | **Supermarket** — the checkouts |
| Fetch what they ask for | **Stockroom** |
| Check the reflection | **Fashion** — the mirror wall |
| Watch what they touch | **Mall arms** |
| 02:00 — the man at the back of the queue who never advances | **Supermarket** |
| 03:33 — he reaches the front, pays with **WALT — SECURITY** | **Supermarket** |
| 05:00 — "Bin that paper." **The Contradiction** | PA, **anywhere** |
| Tape 3 | **Security office** |

## Night 4 — Blackout

| Beat | Room |
| --- | --- |
| Mains gone at 22:00, torches only | Everywhere |
| One player on the monitors, guiding the rest | **Camera room** |
| 01:00 — monitor 3 comes up. There is no camera 3 | **Camera room** |
| Find Walt's old office | **Security office** |
| Start the generator | **Plant room** |
| 02:30 — the walkie plays the crew's own voices | Everywhere |
| 04:00 — a stair exists behind the food court | **Food court** |
| 04:30 — the office: empty desk, gooseneck microphone, rotas back to 1986 with this week's already typed | **Floor 3 → Manager's office** |
| **MALIK — STOCKROOM**, dropped outside the door | **Floor 3** |
| Tape 4 — it runs out before the name | **Floor 3** |

## Night 5 — Closing

| Beat | Room |
| --- | --- |
| Kill the lights, floor by floor | **Electrical cupboard**, then each floor's panel |
| Nora's tag back to her lane | **Supermarket** |
| Lo's tag back to the store | **Custodial store** |
| Walt's tag back to the desk | **Security office** |
| Malik's tag back to the shelves | **Stockroom** |
| 05:00 — radio Calder, open the case board, name him | **Security office** → the board |
| Tape 5, inside the clock case, behind the display panel | **Atrium** — the clock |
| The Strike. Thirty-three of them | **Atrium**, heard everywhere |
| The relay: the master timer panel resets after eight seconds | **Plant room** ↔ **Atrium** |
| 05:59 — wind the display forward | **Atrium** — the clock |
| The four at the entrance, and the morning | **Car park** |

## Between nights

| Beat | Room |
| --- | --- |
| Debrief with DS Calder | **Interview room** |
| Pin evidence, argue, be told you are wrong about Walt | **Interview room** — `CaseBoard` |
| Wages and upgrades | Phone menu, no room needed |

---

## What this means for the build

Every room in `src/greybox/init.luau` is on this list, and nothing on this list has no
room. If a beat moves, the room moves with it; if a room has no beat, it should not exist.

Three rooms are doing the heaviest lifting and deserve the most attention when the art
pass comes:

1. **The staff room** — the rule sheet is the spine of the whole game and it lives here.
2. **The camera room** — where the Night Manager's voice arrives, and where Night 4 is
   played from.
3. **The atrium** — the clock, the Strike, and the last three minutes.
