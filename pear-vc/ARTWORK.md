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
| 6 | A craftsman steps onto the scaffold and raises a drawing to the lens | Drawing held square |
| 7 | Into the drawing, then out of it as the paper washes to sky | Figure and sapling |
| 8 | Glide in on one pear until it glows inside a ring of light | Luminous pear |

Shot 7 does in one take what two shots did before, and does it better. The
earlier pair pushed into the drawing and then out of a *different* drawing —
the end frame was a separately generated plate that merely resembled the one
the craftsman holds, so the camera arrived somewhere it had not been going.
Doing the whole move in a single generation keeps one drawing throughout.

That first half is left clear of copy. The camera entering the drawing is the
best thing in the film and it plays unaccompanied; the chapters are spaced
around it, in `lib/film.ts`.

Shot 8 starts from shot 7's real last frame rather than a keyframe that merely
resembled it. Generated against the keyframe, it opened with the woman closer
and shifted — she stepped back and began watering again, which read as a cut in
the middle of a continuous move. Where a shot follows footage rather than
another generation, the join has to be built from the frame that is actually
there: extract it, upload it, use it as the next shot's start image.

Shots 4 and 5 are trimmed — see the `:head,tail` suffix below.

## Building the sequence

```bash
node scripts/build-film.mjs shot1.mp4 shot2.mp4 … shot8.mp4
```

Shots go in story order. The script cuts frames at **7 fps**, scales the long
edge to **1280px** (sources are 1344px, so it never upscales) and numbers every
frame **continuously across all shots** — the scrubber must not be able to tell
where one shot ends and the next begins.

At 8 shots that is 410 frames, roughly 28 MB. The scrubber streams
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

Compose with the copy in mind. Chapters sit **left** on most shots and
**right** on shot 3 — keep the subject off that side and leave some quiet
space.

Compose for the phone too. The page is full-bleed at every width, so a portrait
screen shows roughly the middle **45%** of each frame and nothing else. A
subject placed near an edge is simply absent there. Everything that matters
belongs in the central half; the sides are for air. Cutting the shots again at
9:16 is the only way around this, and nothing in the page needs to change to
use them — a second sequence and a source-set is all it would take.

## Still scenes

`public/scenes/` still holds the seven stills used by the fallback path and by
the FAQ and constellation sections. They are crops of a single painted orchard;
see git history for the crop regions.
