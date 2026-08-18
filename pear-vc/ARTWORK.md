# Artwork

The page tells its story as a **scroll-scrubbed film**: one continuous run of
frames in `public/sequences/film/`, with the copy laid over it. There is no
video element and nothing plays on its own — scroll position selects a frame.

## Why a film and not stills

The design this page chases joins its scenes with content, not effects. A
figure pulls a cloth across the lens; the cloth becomes the linen ribbon
binding a graft; two pear halves are drawn apart and the sky between them
becomes the next scene's background. None of that is reproducible with a
shader over photographs, because the motion is *in the subject* — hands,
cloth, a cut — not in the camera.

An earlier build did the camera-over-stills version, and it is still in the
tree as the fallback (`StoryCanvas`). `app/page.tsx` picks between them at
build time on whether `public/sequences/film/` has frames, so the site stays
whole when the footage is absent.

## The eight shots

Each shot's **end frame is the next shot's start frame**, which is what makes
the joins invisible. Generated with `veo3_1_lite` at 8s, 1344×768, silent —
that model takes both a start and an end image, which is the whole reason it
was chosen over cheaper ones.

| # | Shot | Ends on |
| - | ---- | ------- |
| 1 | Figure strides forward, sweeps a linen cloth across the lens | Cloth fills frame |
| 2 | Cloth narrows to a ribbon; camera follows it down to a graft being bound | Hands at the graft |
| 3 | Pull back along the branch to the tree, then in on one pear | Pear against blue |
| 4 | Hands split the pear; the sky between the halves expands | Empty blue field |
| 5 | Crane down from the sky onto a colossal pear under scaffolding | Scaffolded pear |
| 6 | Push in until the scene flattens into a sepia drawing on paper | Sepia workshop plate |
| 7 | Pull back; the paper washes out to blue, revealing a figure tending a sapling | Figure and sapling |
| 8 | Glide in on one pear until it glows inside a ring of light | Luminous pear |

Two joins deliberately carry no copy — the flattening into a drawing (6) and
the wash back out to sky (7). They are the best moments in the film and the
chapters are spaced around them, in `lib/film.ts`.

## Building the sequence

```bash
node scripts/build-film.mjs shot1.mp4 shot2.mp4 … shot8.mp4
```

Shots go in story order. The script cuts frames at **7 fps**, scales the long
edge to **1280px** (sources are 1344px, so it never upscales) and numbers every
frame **continuously across all shots** — the scrubber must not be able to tell
where one shot ends and the next begins.

At 8 shots × 8s that is ~450 frames, roughly 25–30 MB. The scrubber streams
them: it keeps about 14 decoded frames around the current one and releases the
rest, so memory stays flat regardless of length, and a fast flick degrades to a
nearer frame instead of stalling.

## Style

Every frame was generated against one suffix, and any new artwork should keep
it or the join will show:

> hyperrealistic oil painting in the style of 19th century academic religious
> art, luminous glazed brushwork, fine detail, museum quality, warm cream,
> ochre and gold against deep saturated cobalt blue, soft atmospheric light,
> no text, no lettering, no watermark

Compose with the copy in mind. Chapters sit **left** on shots 1, 2, 4 and 7,
and **right** on shots 3 and 5 — keep the subject off that side and leave some
quiet space.

## Still scenes

`public/scenes/` still holds the seven stills used by the fallback path and by
the FAQ and constellation sections. They are crops of a single painted orchard;
see git history for the crop regions.
