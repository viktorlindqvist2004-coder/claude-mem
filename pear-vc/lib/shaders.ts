export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * The story shader.
 *
 * Two scene textures, each with its own zoom, focal point and depth-weighted
 * parallax, mixed by a single fade. There is deliberately no mask and no wipe:
 * scenes are joined by travelling *through* them. The outgoing scene keeps
 * pushing into its focal point until one large form fills the frame, the
 * incoming scene is already pushed into a form of matching colour and angle,
 * and the fade happens at that peak where both are abstract. Nothing
 * recognisable is on screen at the moment of the change, so there is no seam to
 * see — the whole page reads as one continuous move rather than a sequence of
 * cuts.
 */
export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2  uResolution;
uniform vec2  uMouse;      // -1..1, eased
uniform float uTime;
uniform float uFade;       // 0 = outgoing scene, 1 = incoming
uniform float uZoomA;
uniform float uZoomB;
uniform vec2  uFocusA;     // point each scene zooms about, in texture UV
uniform vec2  uFocusB;
uniform float uAspectA;    // width / height of each scene's artwork
uniform float uAspectB;
uniform float uBloom;      // warm flare through the peak of a transition

const vec3 GOLD = vec3(1.0, 0.84, 0.42);

// Aspect-corrected, centred coordinates.
vec2 centred(vec2 uv) {
  return (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
}

/**
 * Cover-fit artwork of any aspect ratio, then zoom about focus.
 *
 * Zooming about a chosen point rather than the centre is what makes the join
 * work: the camera has to be able to travel into the specific form that the
 * next scene opens on.
 */
vec2 uvCover(vec2 uv, float zoom, vec2 parallax, float texAspect, vec2 focus) {
  vec2 c = uv - 0.5;
  float screenAspect = uResolution.x / uResolution.y;
  vec2 k = screenAspect > texAspect
    ? vec2(1.0, texAspect / screenAspect)
    : vec2(screenAspect / texAspect, 1.0);
  vec2 framed = 0.5 + c * k;
  return focus + (framed - focus) / max(zoom, 0.001) + parallax;
}

/**
 * Samples a scene with depth-weighted parallax and a radial chromatic split.
 *
 * No depth map is needed: these paintings carry depth in their value
 * structure, because the near forms — trunk, foliage, foreground grass — are
 * the dark ones and distance is what light and haze wash out. Inverted
 * luminance from an unshifted read is a serviceable proxy, so near pixels
 * displace further than far ones.
 *
 * The chromatic shift is divided by zoom because uvCover divides its sampling
 * coordinates by it; without that, a fixed step in texture space covers
 * proportionally more of the screen the further a scene is pushed in, and the
 * fringing grows into rainbow moiré exactly when a scene is largest.
 */
vec3 sampleScene(
  sampler2D tex, float zoom, vec2 parallax, float aberration,
  float texAspect, vec2 focus
) {
  vec2 base = uvCover(vUv, zoom, vec2(0.0), texAspect, focus);
  float luma = dot(texture2D(tex, base).rgb, vec3(0.299, 0.587, 0.114));
  float depth = 1.0 - luma;

  vec2 uv = uvCover(vUv, zoom, parallax * mix(0.3, 1.7, depth), texAspect, focus);
  vec2 dir = vUv - 0.5;
  vec2 shift = dir * aberration * 0.0022 / max(zoom, 0.001);
  return vec3(
    texture2D(tex, uv + shift).r,
    texture2D(tex, uv).g,
    texture2D(tex, uv - shift).b
  );
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/**
 * Pollen drifting in the light.
 *
 * Three cell grids at different densities, each scrolling at its own rate, so
 * the motes sit at separate distances instead of on one sheet. Kept sparse and
 * dim — the point is that the air is alive, not that there is glitter.
 */
float motes(vec2 uv, float t) {
  float acc = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 5.0 + fi * 6.0;
    vec2 drift = vec2(t * (0.012 + fi * 0.006), -t * (0.008 + fi * 0.003));
    vec2 p = uv * scale + drift * scale;
    vec2 cell = floor(p);
    vec2 f = fract(p);
    vec2 seed = vec2(hash(cell + fi * 17.0), hash(cell + fi * 17.0 + 5.7));
    float d = length(f - seed);
    acc += smoothstep(0.10 - fi * 0.02, 0.0, d) * (0.35 + 0.65 * seed.x)
         * (1.0 - fi * 0.25);
  }
  return acc;
}

void main() {
  // Aberration peaks with the travel, not with the fade.
  float turbulence = uBloom;

  vec3 colorA = sampleScene(
    uTexA, uZoomA, uMouse * 0.020, turbulence, uAspectA, uFocusA
  );
  vec3 colorB = sampleScene(
    uTexB, uZoomB, uMouse * 0.032, turbulence, uAspectB, uFocusB
  );

  vec3 color = mix(colorA, colorB, uFade);

  // A warm lift through the peak, as if travelling through the light rather
  // than past it. It also masks what little residue the fade leaves.
  color += GOLD * uBloom * 0.10;

  // Pollen sits in front of everything, brightest where the light already is.
  vec2 moteUv = vUv * vec2(uResolution.x / uResolution.y, 1.0) + uMouse * 0.03;
  float lit = smoothstep(0.25, 0.85, dot(color, vec3(0.299, 0.587, 0.114)));
  color += GOLD * motes(moteUv, uTime) * (0.05 + 0.16 * lit);

  // Film grain keeps flat sky gradients from banding on wide screens.
  float grain = hash(vUv * uResolution + fract(uTime) * 137.0) - 0.5;
  color += grain * 0.032;

  // Vignette anchors the composition.
  vec2 p = centred(vUv);
  float vignette = smoothstep(1.25, 0.30, length(p));
  color *= mix(0.80, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;
