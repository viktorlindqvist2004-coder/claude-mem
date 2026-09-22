# tools

## preview_render.py

An offline CPU renderer that builds the same geometry as
[`src/shared/MallLayout.luau`](../src/shared/MallLayout.luau) and path-traces it with a
lighting model approximating [`docs/05-art-direction.md`](../docs/05-art-direction.md):
emissive neon and EXIT signage, no general lighting, dusty volumetric haze, a polished
floor that doubles every sign, a torch on the camera, ACES tone mapping, bloom, grain and
vignette.

```bash
pip install numpy pillow
python3 tools/preview_render.py     # writes to previews/
```

**This is not the game, and it is not a screenshot.** It is a way to look at the floor plan
at correct scale, with the intended lighting, before Roblox Studio is involved — so the
scale can be argued about while it is still one number in one file.

Cameras are defined at the bottom of the file. Change the numbers in `MallLayout.luau`,
mirror them at the top of this script, and re-render.
