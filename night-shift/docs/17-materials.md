# Materials

> How the building is surfaced now, and exactly what changes when real textures
> go in.

---

## Where it stands

`src/greybox/Surfaces.luau` runs one pass over the finished building and gives
every part a real material. 1858 of the 2080 parts are surfaced; the rest are
things that were given a material deliberately when they were built — Neon on a
sign, Glass on a pane — and the pass leaves those alone on purpose.

This uses **Roblox's built-in materials**, which are genuine PBR maps shipped
inside the engine. Marble has a polish and a normal; CorrodedMetal has pitting;
Concrete has aggregate. Under Future lighting they respond to a red bulkhead the
way a real surface does, and they cost one property per part and nothing else.

| | |
| --- | --- |
| Shop floor, balconies | `Marble` — polished terrazzo, and the only reflective floor in the building |
| Supermarket, food court | `CeramicTiles` |
| Back of house, basement, dock | `Concrete` |
| Car park | `Asphalt` |
| Walls, ceilings, structure | `Concrete` |
| Shutters | `CorrodedMetal`, slats `Metal` |
| Racking, lockers, filing, plant | `Metal`, generator `DiamondPlate` |
| Seats, curtains, garments, coats | `Fabric` |
| Boxes, shelf facings | `Cardboard` |
| Pallets, hoardings | `WoodPlanks` |
| Desks, counters, boards | `Wood` |
| Glazing, mirrors, water | `Glass` with per-instance `Reflectance` |

On top of that:

- **Colour variation.** Every part's colour is nudged a few per cent from a hash
  of its own position. Seeded, so the building is identical every session — a
  place, not a roguelike.
- **Grime by height.** Anything within a metre and a half of a floor has been
  kicked, mopped and leaned on. Anything above seven and a half metres has forty
  years of dust on it. Both come out darker than the paint, and the band between
  them is where the building looks its cleanest.
- **Lettering.** `SurfaceGui` text, which also needs no uploads: EXIT boxes, shop
  fascias, the directory, aisle signs, lane numbers, the rule sheet, the time
  clock reading 03:33.
- **Dust in the air**, which is not decoration — it is the reason a torch beam is
  visible at all.

---

## What is still missing

Photographic texture. A built-in material is the same everywhere it is used, so
the mall floor is *a* terrazzo rather than *this* terrazzo, and no surface has
its own history: no water stain under the roof glazing, no wear pattern in the
walking line, no ghost of a sign that was unscrewed in 1994.

That needs `SurfaceAppearance`, and `SurfaceAppearance` needs uploaded maps.

---

## Putting real textures in

A `SurfaceAppearance` sits inside a `MeshPart` and overrides its look with four
maps: **ColorMap**, **NormalMap**, **RoughnessMap** and **MetalnessMap**. Two
routes, and the second is the one worth taking.

### The quick route — MaterialVariant

Roblox lets you override a *whole built-in material* at once with a
`MaterialVariant` in `MaterialService`. Make one called, say, `MallFloor` with
`BaseMaterial = Marble`, upload your four maps into it, and every part in the
building already set to `Marble` picks it up. No code changes at all.

1. Studio → *View* → *Explorer* → `MaterialService`
2. Right-click → *Insert Object* → `MaterialVariant`
3. Set `BaseMaterial`, name it, and drop your four texture ids in
4. Set `MaterialService.Use2022Materials = true`

This is the highest ratio of look to effort in the whole project. Five variants —
Marble, Concrete, Metal, CorrodedMetal, Fabric — would change how the entire
building reads.

### The thorough route — per-part SurfaceAppearance

For the handful of surfaces that carry a story beat (the rule sheet, the rota
wall, the clock panel, the standing water), a shared material is not enough and
the surface wants to be its own object. Those become `MeshPart`s with their own
`SurfaceAppearance`.

When you do that, add a rule to the top of `RULES` in `Surfaces.luau` so the pass
skips them:

```lua
{ "^RuleSheet", nil, 0 },  -- has its own SurfaceAppearance, leave it alone
```

The pass already skips anything whose material was set deliberately, so a part
you have converted to a MeshPart with an appearance on it will not be touched.

### Tiling

Roblox tiles a built-in material by world size in studs, and this project runs
at 1 stud = 0.3 m. A texture authored for a 1 m tile wants
`MaterialVariant.StudsPerTile = 3.33` to line up with the metric geometry.

---

## The one rule

Nothing in `src/server` or `src/client` knows what anything is made of. The look
lives entirely in `Surfaces.luau` and in `MaterialService`, and it is meant to
stay that way — it is what makes it possible to retexture the whole building
without touching a line of game code, and to check with `tools/verify.sh` that
you have not broken it.
