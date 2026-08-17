export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * The story shader. It cross-fades two scene textures through an expanding
 * vector mask (pear / circle / architectural aperture), while each scene runs
 * its own zoom and mouse parallax. Grain, vignette and a gold rim on the mask
 * edge keep the composite feeling painted rather than digital.
 */
export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2  uResolution;
uniform vec2  uMouse;      // -1..1, eased
uniform float uTime;
uniform float uProgress;   // 0..1 portal progress between A and B
uniform float uZoomA;
uniform float uZoomB;
uniform float uAspectA;    // width / height of each scene's artwork
uniform float uAspectB;
uniform float uMaskMode;   // 0 pear, 1 circle, 2 architectural aperture

const vec3 GOLD = vec3(1.0, 0.84, 0.42);

// Aspect-corrected, centred coordinates. Keeps the mask circular on any screen.
vec2 centred(vec2 uv) {
  return (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
}

// Cover-fit artwork of any aspect ratio into the viewport, then zoom and
// offset it. Photographic scenes are not guaranteed to be square, so the
// texture's own aspect has to come in rather than being assumed.
vec2 uvCover(vec2 uv, float zoom, vec2 parallax, float texAspect) {
  vec2 c = uv - 0.5;
  float screenAspect = uResolution.x / uResolution.y;
  vec2 k = screenAspect > texAspect
    ? vec2(1.0, texAspect / screenAspect)
    : vec2(screenAspect / texAspect, 1.0);
  return 0.5 + c * k / max(zoom, 0.001) + parallax;
}

// Radial chromatic split — strongest mid-transition, invisible at rest.
vec3 sampleScene(
  sampler2D tex, float zoom, vec2 parallax, float aberration, float texAspect
) {
  vec2 uv = uvCover(vUv, zoom, parallax, texAspect);
  vec2 dir = vUv - 0.5;
  vec2 shift = dir * aberration * 0.008;
  return vec3(
    texture2D(tex, uv + shift).r,
    texture2D(tex, uv).g,
    texture2D(tex, uv - shift).b
  );
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Two smooth-unioned circles read unmistakably as a pear silhouette.
float sdPear(vec2 p, float s) {
  p /= max(s, 0.0001);
  float bulb = length(p - vec2(0.0, -0.22)) - 0.60;
  float neck = length(p - vec2(0.0, 0.40)) - 0.33;
  return smin(bulb, neck, 0.30) * s;
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float maskDistance(vec2 p, float t) {
  float s = mix(0.0005, 2.8, t);
  if (uMaskMode < 0.5) return sdPear(p, s);
  if (uMaskMode < 1.5) return length(p) - s * 0.95;
  return sdRoundedBox(p, vec2(s * 1.5, s * 0.72), min(0.12, s * 0.4));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  // Ease the portal so it accelerates out of rest and settles into the reveal.
  float t = uProgress * uProgress * (3.0 - 2.0 * uProgress);

  // Aberration peaks in the middle of the transition.
  float turbulence = sin(uProgress * 3.14159265) ;

  vec3 colorA = sampleScene(uTexA, uZoomA, uMouse * 0.010, turbulence, uAspectA);
  vec3 colorB = sampleScene(uTexB, uZoomB, uMouse * 0.022, turbulence, uAspectB);

  vec2 p = centred(vUv);
  float d = maskDistance(p, t);

  // Antialias the mask edge in pixel units so it stays crisp at any DPR.
  float aa = 1.6 / uResolution.y;
  float inside = smoothstep(aa, -aa, d);

  vec3 color = mix(colorA, colorB, inside);

  // Luminous gold rim travelling with the portal edge.
  float rim = smoothstep(0.055, 0.0, abs(d));
  float rimGate = smoothstep(0.0, 0.10, uProgress) * (1.0 - smoothstep(0.88, 1.0, uProgress));
  color += GOLD * rim * rimGate * 0.6;

  // Film grain keeps flat sky gradients from banding on wide screens.
  float grain = hash(vUv * uResolution + fract(uTime) * 137.0) - 0.5;
  color += grain * 0.032;

  // Vignette anchors the composition.
  float vignette = smoothstep(1.25, 0.30, length(p));
  color *= mix(0.80, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;
