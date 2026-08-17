# Scene artwork

The story scenes are photographic artwork served from `public/scenes/`. Drop a
file in at the matching name and the scene picks it up on next load — no code
change. Anything missing falls back to the drawn version in `lib/scenes.ts`, so
the site is never broken by an absent file.

| File                          | Where it appears              | Subject |
| ----------------------------- | ----------------------------- | ------- |
| `01-hero-walk.jpg`            | Hero                          | Robed figure walking a sunlit path |
| `02-graft.jpg`                | "We build it"                 | Old hands grafting a pear scion |
| `03-orchard.jpg`              | "We rank it"                  | Pear tree heavy with golden fruit |
| `04-split-pear.jpg`           | "We share in what it earns"   | Hands holding a split golden pear |
| `05-dome.jpg`                 | "No fees"                     | Chapel dome with an oculus |
| `06-orchard-pale.jpg`         | FAQ background                | Pale misty pear tree |
| `07-night-tending.jpg`        | Constellations                | Figure watering a sapling at night |

## Format

Roughly square (1:1) suits the story scenes best: the canvas cover-fits them,
and a square crops gracefully in both landscape and portrait. Other ratios work
— the shader reads each image's real aspect — but a 16:9 source loses a lot of
its sides on a phone. Aim for **2048px** on the long edge and export as JPEG at
~80% quality; these are full-bleed backgrounds, so file size matters more than
pixel-perfect fidelity. `06` and `07` are decorative and can be 3:2.

Compose with the copy in mind. Text sits **left** on scenes 1, 2 and 5, **right**
on scene 3, and **centred** on scene 4 — keep the subject away from that side and
leave some quiet space for the headline.

## Prompts

Style suffix used on all of them:

> hyperrealistic oil painting, 19th century academic religious art, luminous
> golden hour light, soft atmospheric haze, warm ochre and gold against deep
> cobalt blue, fine brushwork, glazed oil texture, museum quality, extremely
> detailed

**01 — hero.** A tall bearded man in flowing cream and ochre linen biblical
robes walks along a sunlit stone path through an ancient olive and oak grove,
seen from behind and slightly to the side. Warm golden morning light through the
leaves, luminous blue sky above, distant hills. Generous open sky above the
figure, empty ground in the lower left.

**02 — graft.** Extreme close-up of the weathered calloused hands of an old
gardener grafting a young green pear scion onto a cut rootstock branch, binding
the union with strips of pale linen. Raking light from the upper left, deep
green foliage out of focus behind, dust motes, sap glistening on the fresh cut.
Rembrandt chiaroscuro.

**03 — orchard.** An ancient gnarled pear tree heavy with ripe golden pears
alone in a sunlit orchard meadow, deep luminous blue sky, long soft shadows,
distant orchard rows fading into silver haze. Majestic centred tree.

**04 — split pear.** The hands and torso of a bearded man in cream linen
biblical robes holding up two halves of a freshly split golden pear, the cut
faces catching a warm glow, seeds visible. A single shaft of light falls from
the upper left through a dark interior, dust drifting in the beam. Head cropped
above the frame. Caravaggio lighting, deep umber shadows.

**05 — dome.** The interior of an ancient stone chapel, a great coffered vaulted
dome overhead with an open circular oculus, golden light pouring down in visible
shafts onto worn marble, columns and arches receding into deep blue shadow.
Symmetrical perspective looking up, open space in the lower left.

**06 — pale orchard.** A solitary ancient pear tree in a misty meadow at first
light, in delicate cream, ivory and pale ochre, very low contrast, faded and
luminous as if through fog, plenty of empty pale sky.

**07 — night tending.** A robed bearded man kneels to water a small sapling from
an earthenware jar, silhouetted against a deep indigo twilight sky of faint
stars, a low warm lantern glow on his hands and the seedling. Mostly deep blue
and black with a small pool of gold. Baroque nocturne.
