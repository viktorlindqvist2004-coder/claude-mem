# Art Direction — A Very Large Dark Mall Lit by Neon

The brief is **photoreal, enormous, and almost entirely unlit**. At night the Galleria's
general lighting is off. What remains is the signage — neon and cold cathode in the
shopfronts of the few units still trading — the red EXIT signs on the emergency circuit, and
a handful of things that are never switched off. Everything else is black.

That is a gift. Realism on Roblox comes from **material authoring, real-world scale and
lighting discipline**, not from triangle counts, and a building where 90 % of the volume is
dark is both the most frightening way to present a mall and by far the cheapest way to render
one.

---

## 1. Terminology, before anybody gets confused

**Neon signage: yes.** Glass tube signs, cold cathode, the 1986 shopfront language. They are
the look of the game.

**`Enum.Material.Neon`: never.** Roblox's Neon material is a flat unshaded white-out and it
is the single most recognisable "this is Roblox" tell in the engine. Every neon sign in this
game is a thin `MeshPart` tube with an emissive `SurfaceAppearance`, a soft glow sprite
billboarded at the tube, light spill **painted into the ColorMap of the surfaces around it**,
and — only where it matters — one small non-shadow `PointLight`.

---

## 2. Scale: the mall has to feel too big

The horror depends on the crew being unable to hold the building in their heads. Four floors
around a glass-roofed atrium, four wings per floor, and a number of dark units that is
uncomfortable to walk past.

**A wing is not a corridor.** This was got wrong once already and it is the difference
between a shopping centre and a tunnel. Section through a wing, from the centre out, each
side:

```
   6 m void slot  |  5 m walkway  |  12 m unit  |  2.4 m service corridor
                  ^ balustrade    ^ shopfront   ^ back door
```

Sixteen metres of open public width, a 4.4 m soffit over each walkway, and the void slot open
from the ground floor all the way to the roof glazing sixteen metres up. From anywhere on the
ground you can see three floors of balcony — which means from anywhere on the ground, three
floors of balcony can see you.

| | Metres | Studs (1 stud = 0.3 m) |
| --- | --- | --- |
| Atrium footprint | 60 × 40 | 200 × 133 |
| Atrium clear height | 16.6 | 55 |
| Wing length (each, per floor) | 110 | 367 |
| Wing open public width | 16.0 | 53 |
| — void slot | 6.0 | 20 |
| — walkway, each side | 5.0 | 16.7 |
| Unit depth | 12.0 | 40 |
| Service corridor width | 2.4 | 8 |
| Floor to floor | 5.20 | 17.3 |
| Walkway soffit | 4.40 | 14.7 |
| Service corridor ceiling | 2.45 | 8.2 |
| Shopfront glazing height | 3.30 | 11 |
| Staff door height | 2.05 | 6.8 |
| Balustrade height | 1.12 | 3.7 |
| Counter height | 0.95 | 3.2 |
| Ceiling tile | 0.60 × 0.60 | 2 × 2 |

**Unit count: 168 on the directory. Eleven still trading.** The rest are dark glass, vinyl
over the windows, or an empty shell with the fittings pulled out and the fascia still up. A
player walking a 110 m wing passes roughly forty units and perhaps three of them are lit.

**Walk times are a design tool.** The atrium to the far end of a wing is about 70 seconds at
walking pace with a torch. That is a long time to be alone, and the whole fear design depends
on it being a long time.

### Two kinds of space, and the game moves you between them all night

**The public mall is vast and exposed.** Sixteen metres wide, four storeys of open air over
your head, sightlines the length of a wing and up through every balcony. You cannot be crept
up on here — but you also cannot hide, you are visible from three floors, and the sheer volume
of unlit air above you is its own kind of dread. A red bulkhead lights four metres of floor in
a space that is sixteen wide and sixteen tall.

**Back of house is a pipe.** The service corridor behind the units is 2.4 m wide with a 2.45 m
ceiling, painted cinderblock, no signage, no terrazzo, no reflections, and one bare fitting
every fourteen metres of which most are dead. It runs the full length of every wing, it links
every unit's back door, and it is how you reach the stockroom, the staff room, the custodial
store, the security office, the camera room and the loading dock.

The contrast is the horror engine. A crew that feels watched in the open mall goes back of
house for relief and finds somewhere they cannot turn around in. The game should push them
between the two several times a night, and Rule 4 — *if someone calls your name from the
stockroom, don't answer* — lives entirely back here.

**Rig the avatar to 1.68 m eye height** (R15, scaled). Default Roblox proportions in a
photoreal set is the fastest way to make an environment look like a toy.

---

## 3. The light sources, and there are only five

**The mall at night is red.** When the general lighting goes off at 21:00 the building drops
onto its emergency circuit, and the emergency circuit is red: EXIT signs at every stair and
fire door, and caged red bulkhead fittings every eleven metres down every wing and around
every balcony. That is the light the crew works by. It is dim, it is uniform, it is the
colour of a darkroom, and after ten minutes it stops looking like safety lighting and starts
looking like the inside of something.

Red also does two things no other choice does. It is the worst possible light to identify
anything by — every surface goes to the same muddy monochrome, and a figure at forty metres
is a shape and nothing more. And it makes the few remaining colours in the building precious.

### 1. The red emergency circuit — the primary source
Caged bulkheads every 11 m per wing, EXIT signs every 22 m, all on battery-backed supply, all
at low output. Approximately 2000 K equivalent, deeply saturated, heavy falloff — a bulkhead
lights a 4 m pool of floor and nothing else. Between the pools it is genuinely black.

They are the mall's grammar: however lost you are, there is a small red glow somewhere, and
you can always get out. Which is precisely why killing them once, for four seconds, on one
night, is the largest scare in the game. Something that has been true for four nights stops
being true. Spend it once.

**And they hum.** See [`06-audio-direction.md`](06-audio-direction.md) — every fixture is its
own positional emitter, and that decision does more work than it sounds like it should.

### 2. Neon shopfront signage — the rarity
Eleven units in a building of a hundred and sixty-eight still trade, and their signs are the
only saturated colour in the place: magenta, cyan, amber, green, hot pink. Thirty years old,
so some letters are dead, some flicker on a failing transformer, and one has been reading
**"P ARMACY"** since 1994.

Because they are rare, each one is an event — a landmark visible from the far end of a wing,
a place the crew names and navigates by, and the only spot in a hundred metres where you can
see what colour something actually is. **Each wing still has a dominant hue** so the crew can
talk to each other ("I'm in the pink bit", "meet me where it goes green"), but that hue now
appears once or twice in a wing rather than forty times.

### 3. The things that are never switched off
Vending machine displays, the chest freezers in the supermarket, an ATM screen, a fire alarm
panel, a lift call button, a security desk monitor. Small, cold, isolated pools of light in
enormous darkness — and each one is a landmark, a hiding place, and a silhouette opportunity.

### 4. The work lights
The crew's own areas — the supermarket floor, the staff corridor, the stockroom, the loading
dock — have their strip lights on, because people are working. **These are the lit islands,
and the mall between them is the dark.** It is what makes Night 1 read as an ordinary job for
its first four minutes: you are in a lit room doing a task, and the doorway behind you is a
black rectangle.

### 5. The torch
Yours. 2900 K, slightly warm, slightly uneven, with a soft gobo on the cone so it reads as a
real housing rather than a perfect digital cone. It is the only light you control and the
only one that reveals detail.

---

## 4. Reflections do half the work

The terrazzo is polished and the mall has been mopped. **Every neon sign is doubled on the
floor.** This is worth an enormous amount:

- It roughly doubles the apparent light in a space without adding a single light source.
- It gives long empty wings a vanishing-point composition that photographs beautifully.
- **A figure crossing in front of a sign also crosses its reflection**, and the reflection
  reads a fraction of a second later. Two chances to be half-seen, and the delay is physically
  correct and deeply unsettling.
- A wet-mopped patch is a temporary mirror, which means the crew's own work creates
  reflective surfaces, which means the custodial tasks have a visual payoff.

Shopfront glass does the same job vertically — and is where the Presence appears standing in
an aisle that has nobody in it.

---

## 5. Materials

**Every hero surface is a `SurfaceAppearance`** with ColorMap, NormalMap, RoughnessMap and
MetalnessMap. Nothing ships on a raw `Enum.Material` except greybox.

- **Trim sheets and tiling atlases.** One 2048² trim sheet for the shopfront language across
  the whole mall; one 2048² tiling set for terrazzo, carpet tile, cinderblock, vinyl and
  ceiling tile. 1024² for props, 512² for small kit. Nothing at 4096 ships.
- **`AlphaMode = Overlay`** for the grime, scuff and water-stain layer. Eighty per cent of
  the realism lives here: uniform surfaces read as CG, and dirt that accumulates exactly where
  people touch things reads as photography. Impact chips at trolley height. Hand oil on the
  handrails at grip height. Terrazzo polished thin at the escalator mouths.
- **Roughness is the most important map in the project**, and it matters more here than in a
  lit game, because in the dark **a surface is defined entirely by how it takes the torch
  beam.** Terrazzo 0.25 with a polished lane at 0.12; brushed steel 0.35; laminate 0.4;
  carpet 0.9; mannequin plastic 0.55 with a faint sheen; the clock's brass 0.3 with tarnish
  variation.
- The building has not been refurbished since 1994 and every surface should say so.

---

## 6. Lighting — the hard budget

`Lighting.Technology = Future`. Non-negotiable for a game about a moving light source.

**Shadow-casting dynamic lights are what decides whether this ships.** Four players with
torches is already four of them.

### Hard rules

1. **Maximum 4 shadow-casting dynamic lights at once.** Those four are the crew's torches.
   That is the entire budget.
2. **Every architectural light has `Shadows = false`** — every neon sign, every EXIT sign,
   every vending machine, every work light. No exceptions.
3. **Most neon signs have no light object at all.** They are emissive geometry plus a glow
   sprite plus painted spill in the ColorMap of the wall and floor beneath. Attach a real
   `PointLight` only where the player will stand inside the spill. A wing with forty signs
   should have five or six actual lights in it.
4. **Contact shadows are painted, not rendered** — ambient occlusion baked into the ColorMap
   at wall/floor junctions and under fittings.
5. **Torch `SpotLight`:** `Angle` 60 (wide) / 18 (focus), `Range` 60 / 110 studs,
   `Brightness` 2.2 / 5.0, `Shadows = true`, `Color` `Color3.fromRGB(255, 214, 170)`.

### Baseline

```lua
Lighting.Technology               = Enum.Technology.Future
Lighting.Ambient                  = Color3.fromRGB(3, 3, 5)     -- near black
Lighting.OutdoorAmbient           = Color3.fromRGB(12, 14, 20)
Lighting.Brightness               = 0.15   -- the signage is the light, not the sun
Lighting.EnvironmentDiffuseScale  = 0.18
Lighting.EnvironmentSpecularScale = 0.65   -- high: wet floors and glass earn their keep
Lighting.ShadowSoftness           = 0.35
Lighting.ExposureCompensation     = -0.1
Lighting.ClockTime                = 1.5
```

**Atmosphere.** The air is dusty, which makes every neon sign bloom slightly and every torch
beam volumetric, for free:

```lua
Atmosphere.Density = 0.38   Atmosphere.Haze = 1.4   Atmosphere.Glare = 0.2
Atmosphere.Color   = Color3.fromRGB(180, 182, 190)
Atmosphere.Decay   = Color3.fromRGB(88, 92, 106)
```

**Post.** Bloom does the heavy lifting because saturated point sources in darkness is exactly
what it is for:

```lua
Bloom.Intensity = 0.75  Bloom.Size = 30   Bloom.Threshold = 1.35
ColorCorrection.Saturation = -0.05  -- keep the red and the neon saturated
ColorCorrection.Contrast   =  0.24  -- crush the blacks; that is where the game lives
DepthOfField.FarIntensity  =  0.12  DepthOfField.FocusDistance = 22
```

**Red is easy to overdo and easy to blow out.** The fixtures must stay *dim*: a bulkhead is a
source you can look straight at without squinting, and its pool of floor should be barely
enough to walk by. If the corridor is legible end to end, the lights are too bright. The test
is simple — stand at one end of a wing with the torch off and you should not be able to tell
where it ends.

Plus the screen-space overlay layer, authored as `ImageLabel`s since Roblox has no custom
post: fine grain at 5 %, vignette at 22 %, and a lens-dirt streak that only catches when a
bright source is near screen centre. Those three cheap layers do more for "photoreal" than
any amount of geometry.

**Crush the blacks and mean it.** The temptation on every dark game is to lift the shadows so
players can see. Do not. The brightness slider is clamped to a range that keeps the mall dark,
there is no night-vision mode, and the darkness is the product.

### Colour script

| Night | State |
| --- | --- |
| **1** | The red circuit, a handful of neon, work lights in the crew's areas. Warm islands in a red void. The most "normal" the mall ever looks, which is not very. |
| **2** | Fashion floor retail spots are on — hard white pools with absolute black between them, and a lot of glass. |
| **3** | **Everything on.** The one night the mall is lit like a mall, and it is over-lit, sickly, and colour-temperature-inconsistent shop to shop. Inverting the palette inverts the fear. |
| **4** | Mains gone. Neon dead, EXIT signs running on battery and dimming over the night, storm light at 6500 K through the atrium glass. Torch and red, and nothing else. |
| **5** | Signage failing wing by wing as the crew kills the breakers. Desaturated to near-grey, so the sunrise is the only saturated frame in the game. |

---

## 7. Performance and quality tiers

Most Roblox players are on a phone. A photoreal game without tiering does not launch.

| Tier | Target | What changes |
| --- | --- | --- |
| **High** | 60 fps | Everything above. 4 shadow-casting torches, full post, Atmosphere on. |
| **Medium** | 45 fps | 2 shadow-casting torches (yours + nearest), DoF off, fewer neon `PointLight`s. |
| **Low** | 30 fps | 1 shadow-casting torch, others as non-shadow cones, Atmosphere 0.2, Bloom only, neon reduced to emissive + sprite with no light objects. |

**Low tier must never be harder to play.** That is a test case, not a philosophy. In a game
this dark it is the easiest thing in the world to get wrong: if an entity is less visible at
the same distance with shadows off, compensate with a rim-light material at that tier.

The darkness helps here more than anywhere. Unlit geometry is cheap, `StreamingEnabled` has
an easy job when sightlines are short, and the wings are long corridors with natural occluders.

**Other budgets**
- `StreamingEnabled = true`, per-wing and per-floor model roots, `StreamingIntegrityMode` set
  so nobody lands on a floor that has not arrived.
- ≤ 40k triangles per room cluster. `RenderFidelity = Precise` only on the Great Clock and the
  mannequins.
- **No transparent-on-transparent stacking.** A mall is made of glass and this is a real
  draw-order risk. Every balustrade and shopfront is a single glazing plane with a thin frame,
  never two.

---

## 8. Characters and entities

**Crew** — R15, custom uniform (polo, tabard, lanyard, boots) with real cloth normals. Visible
arms and torch in first person, and **visible feet when you look down**, which costs nothing
and enormously helps embodiment in a game about being somewhere.

**Mannequins** — custom mesh, matte injection-moulded plastic at roughness 0.55 with a faint
sheen and a slight warm subsurface cheat baked into the ColorMap. Joint seams. Two body types,
four head types, headless variants available. **Glass eyes**, because the eyes mechanic needs
a floor full of legitimate retroreflective sources to hide among. The red-collared one is
distinct in **silhouette**, not just colour, so she reads at low tier and in the dark.

**The Night Manager** — never a model, never a reveal. He is a silhouette that exists only
where it interrupts something: a torch cone, a neon sign, a reflection. Outside that, there is
genuinely nothing there. No face, ever, including the ending. See
[`10-fear-design.md`](10-fear-design.md).

**The four shades** (Night 5) — light, soft-edged, translucent, no faces, moving like people
finishing a job rather than like ghosts. They should read as **relief**.

**The Great Clock** — the highest-fidelity asset in the game. Brass with real tarnish, a glass
dial with a hairline crack, a visible escapement behind an access panel, and a dedication
plate behind the face that the entire mystery turns on. `Precise` fidelity, its own 2048² set,
its own lighting treatment. Everything points at it and it has to survive being looked at for
five nights.

---

## 9. Pipeline

Blender → glTF/FBX → Roblox `MeshPart` + `SurfaceAppearance`. Substance Painter or Materialize
for maps. One Blender file per kit, one Studio model per kit, versioned here as `.rbxmx` where
practical so changes are reviewable.

**Modular kit first.** Build the mall from a wall/floor/ceiling/shopfront/escalator/signage kit
before any bespoke geometry exists. A greybox of the full mall at correct scale — all four
floors, all sixteen wings, walkable end to end, with the EXIT signs already placed — is
Milestone 0 and gates everything else. Walk it in the dark with a torch before a single
material is authored. If it is not frightening as grey boxes and red signs, no amount of
photoreal terrazzo will save it.
