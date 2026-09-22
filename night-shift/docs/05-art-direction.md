# Art Direction — Photoreal, on Roblox, at 30 fps on a phone

The brief is **very realistic graphics**. That is achievable on Roblox in 2026, and the
work is mostly not where people expect it to be. Realism here comes from **material
authoring, real-world scale, and lighting restraint** — not from triangle counts. A
correctly lit terrazzo floor with a real roughness map sells this mall. A 90k-triangle
bench does not, and it will cost us the mobile audience.

---

## 1. The look

**Reference:** 1980s–90s Nordic and British municipal-commercial architecture; empty-mall
and liminal-space photography; long-exposure night interiors under mixed fluorescent and
sodium light; CCTV stills.

**The mall has not been refurbished since 1994.** Every surface should read as *maintained
but tired*: terrazzo polished thin at the escalator mouths, brushed steel handrails with
hand-oil patina at grip height, smoked glass balustrades with cleaning swirl, beige laminate
shopfronts with impact chips at trolley height, brown carpet tile with traffic lanes worn
into it, painted cinderblock and grey vinyl behind every staff door.

**Colour script**

| Night | Palette |
| --- | --- |
| 1 | Warm-neutral. 4100 K fluorescent, some tubes drifted pink with age. Reads as "a job". |
| 2 | Cooler, higher contrast. Retail spotlights make hard pools with black between them. |
| 3 | Over-lit and sickly. Everything on. Colour temperature inconsistent shop to shop. |
| 4 | Near-monochrome. Torchlight only, 2900 K, plus 6500 K storm light through the atrium glass. |
| 5 | Desaturated to near-grey, then the sunrise is the only saturated frame in the game. |

**The sunrise is deliberately unglamorous.** Grey northern morning through dirty glass. The
emotional payoff is that they get to go outside, not that it is beautiful.

---

## 2. Scale

Photoreal fails instantly at the wrong scale, and Roblox's default proportions fight us.

**Project convention: 1 stud = 0.3 m.** Everything is modelled to this and nothing is
eyeballed.

| Element | Metres | Studs |
| --- | --- | --- |
| Door height (staff) | 2.05 | 6.8 |
| Door height (shopfront) | 2.40 | 8.0 |
| Retail ceiling | 3.20 | 10.7 |
| Corridor ceiling | 2.80 | 9.3 |
| Atrium clear height | 14.0 | 46.7 |
| Corridor width | 6.00 | 20.0 |
| Handrail height | 1.10 | 3.7 |
| Counter height | 0.95 | 3.2 |
| Shelf bay width | 1.25 | 4.2 |
| Escalator rise per floor | 4.20 | 14.0 |
| Ceiling tile | 0.60 × 0.60 | 2 × 2 |

Use **R15 with a scaled rig** so eye height lands at ~1.68 m (5.6 studs). Default Roblox
avatar proportions in a photoreal set is the single fastest way to make an environment look
like a toy.

---

## 3. Materials

**Every hero surface is a `SurfaceAppearance`** with ColorMap, NormalMap, RoughnessMap and
MetalnessMap. Nothing ships on a raw `Enum.Material` except as a greybox placeholder.

- **Trim sheets and tiling atlases, not unique textures.** One 2048² trim sheet covers the
  shopfront language for the whole mall; one 2048² tiling set covers terrazzo, carpet tile,
  cinderblock, vinyl and ceiling tile.
- **1024² for props, 2048² for hero surfaces, 512² for small kit.** Nothing at 4096 ships.
- **`AlphaMode = Overlay`** for the grime, scuff and water-stain decal layer over the base
  material. This is where 80 % of the realism lives: uniform surfaces read as CG, and dirt
  that accumulates where people actually touch things reads as photography.
- **Roughness is the most important map in the project.** Terrazzo 0.25 with a polished lane
  at 0.12; brushed steel 0.35 anisotropic-ish; laminate 0.4; carpet 0.9; mannequin plastic
  0.55 with a faint sheen; the clock's brass 0.3 with tarnish variation.
- **`MaterialVariant` for the tiling set** so large areas do not need unique geometry.
- **No `Neon`.** Ever. Emissive signage is a low-emission SurfaceAppearance plus a small
  non-shadow light. Neon is the most recognisable "this is Roblox" tell in the engine.

---

## 4. Lighting — the hard budget

`Lighting.Technology = Future`. Non-negotiable for a game about a moving light source.

**This is the constraint that decides whether the game ships:** shadow-casting dynamic
lights are the dominant cost, and four players with torches is already four of them.

### Hard rules

1. **Maximum 4 shadow-casting dynamic lights rendering at once.** Those four are the crew's
   flashlights. That is the entire budget.
2. **Every architectural light has `Shadows = false`.** Ceiling fluorescents, shop
   spotlights, exit signs, vending machine glow — all non-shadow `PointLight`/`SurfaceLight`,
   sized generously and kept dim.
3. **Baked-feel contact shadows** come from the material and geometry — darkened ambient
   occlusion painted into the ColorMap at floor/wall junctions and under fixtures — not from
   real-time lights.
4. **Light count, not light intensity, is what costs.** One well-placed fixture per shop bay,
   not four.
5. **Torch `SpotLight`:** `Angle` 60 (wide) / 18 (focus), `Range` 60 / 110 studs,
   `Brightness` 2.2 / 5.0, `Shadows = true`, `Color` 2900 K warm white
   (`Color3.fromRGB(255, 214, 170)`). A slightly warm, slightly uneven beam with a soft
   gobo texture on the cone reads as a real torch; a pure white cone reads as a game asset.

### Settings baseline

```lua
Lighting.Technology          = Enum.Technology.Future
Lighting.Ambient             = Color3.fromRGB(6, 7, 10)
Lighting.OutdoorAmbient      = Color3.fromRGB(14, 16, 22)
Lighting.Brightness          = 0.6            -- indoor night; the torch is the key light
Lighting.EnvironmentDiffuseScale  = 0.25
Lighting.EnvironmentSpecularScale = 0.55
Lighting.ShadowSoftness      = 0.35
Lighting.GlobalShadows       = true
Lighting.ExposureCompensation = -0.15
Lighting.ClockTime           = 1.5             -- pre-dawn sky through the atrium glass
```

**Atmosphere** — the mall's air is dusty and the volumetric feel of a torch beam through it
is most of the atmosphere for free:

```lua
Atmosphere.Density  = 0.36
Atmosphere.Offset   = 0.1
Atmosphere.Haze     = 1.3
Atmosphere.Glare    = 0.15
Atmosphere.Color    = Color3.fromRGB(190, 192, 198)
Atmosphere.Decay    = Color3.fromRGB(96, 100, 112)
```

**Post-processing**

```lua
ColorCorrection.Saturation = -0.16
ColorCorrection.Contrast   =  0.12
ColorCorrection.TintColor  = Color3.fromRGB(232, 236, 255)   -- faint cool cast
Bloom.Intensity = 0.55   Bloom.Size = 26   Bloom.Threshold = 1.7
DepthOfField.FarIntensity = 0.12  DepthOfField.FocusDistance = 22
DepthOfField.InFocusRadius = 40   DepthOfField.NearIntensity = 0.05
```

Plus a screen-space overlay layer, authored as `ImageLabel`s, not shaders (Roblox has no
custom post): fine film grain at 4–6 % opacity, a soft vignette at 18 %, and a very subtle
lens-dirt streak that only catches when a bright light is near the screen centre. These
three cheap layers do more for "photoreal" than any amount of geometry.

**The camera room** gets its own stack: scanlines, chroma offset, 12 fps monitor refresh,
and a monochrome ColorCorrection — and because it is a *diegetic* screen effect, it is free
realism and reads instantly as CCTV.

---

## 5. Performance and quality tiers

Most Roblox players are on a phone. A photoreal game without tiering does not launch; it
just fails to retain.

| Tier | Target | What changes |
| --- | --- | --- |
| **High** (PC/console) | 60 fps | Everything above. 4 shadow-casting torches, full post, Atmosphere on. |
| **Medium** | 45 fps | 2 shadow-casting torches (yours + nearest), DoF off, grain at 3 %. |
| **Low** (phone) | 30 fps | 1 shadow-casting torch (yours only), others render as non-shadow cones, Atmosphere density 0.2, Bloom only, reduced `Lighting.Brightness` compensation so the game is not *darker* on low tier. |

Detection at join from device class and a 5-second frame-time sample, with a manual
override in settings. **Low tier must never be harder to play.** If dropping shadows makes
a mannequin easier to miss, compensate with a rim-light material on entities at that tier.

**Other budgets**
- `StreamingEnabled = true`, per-floor model roots, `StreamingIntegrityMode` set so a
  player never falls through a floor that has not streamed in.
- ≤ 40k triangles per room cluster; `RenderFidelity = Automatic` on props, `Precise` only on
  the Great Clock and the mannequins.
- ≤ 120 `BasePart`s visible per room after `MeshPart` consolidation. Kitbash in Blender, not
  in Studio.
- No transparent-on-transparent stacking. Mall glass everywhere is a real draw-order risk;
  every balustrade and shopfront is a single glazing plane with a thin frame, never two.

---

## 6. Characters and entities

**Crew** — R15, custom uniform mesh (polo, tabard, lanyard, boots) with real cloth normal
maps. Visible arms and torch in first person, and *visible feet when you look down*, which
costs nothing and enormously helps embodiment.

**Mannequins** — custom mesh, matte injection-moulded plastic: roughness 0.55, a faint
specular sheen, and a very slight warm subsurface cheat baked into the ColorMap. Seams at
the joints. Two body types, four head types, all headless variants available — a headless
mannequin at the end of a dark corridor is worth more than any amount of detailing.
The **red-collared** one is distinct in silhouette, not just colour, so she is readable at
low tier and in the dark.

**The Night Manager** — never a model. He is a **silhouette that only exists inside a torch
beam**: an entity rendered only where a Focus cone intersects it, with nothing there
otherwise. Implementation is a matter of masking and light-cone intersection, not of hiding a
character model in the dark. Outside the beam there is genuinely nothing to see, and players
will learn that pointing the torch at him is the only way to know where he is — which makes
the final 40 seconds at the clock work.

**The four shades** (Night 5) — light, soft-edged, translucent, no faces, and they move like
people finishing a job rather than like ghosts. They should read as *relief*.

**The Great Clock** — the single highest-fidelity asset in the game. Brass with real
tarnish, a glass dial with a hairline crack, visible escapement behind an access panel, and
a dedication plate behind the face. It gets `Precise` fidelity, its own 2048² set, and its
own lighting treatment. Everything in the game points at it; it has to survive being looked
at for five nights.

---

## 7. Art pipeline

Blender → glTF/FBX → Roblox `MeshPart` + `SurfaceAppearance`. Substance Painter or
Materialize for maps. One Blender file per kit, one Studio model per kit, versioned in this
repo as `.rbxmx` where practical so changes are reviewable.

**Modular kit first.** Build the mall from a wall/floor/ceiling/shopfront/escalator kit
before any bespoke geometry exists. A greybox of the full mall at correct scale, walkable
end to end, is Milestone 0 and gates everything else.
