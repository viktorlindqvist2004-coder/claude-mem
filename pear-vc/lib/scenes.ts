/**
 * Procedural scene artwork.
 *
 * Every story frame is painted into an offscreen square canvas and uploaded to
 * the GPU as a texture. Painting rather than shipping photographs keeps the
 * page asset-free (nothing to download, nothing to license), lets each scene be
 * rendered at whatever resolution the device can afford, and means the artwork
 * scales crisply on a 5K display.
 *
 * The visual language is deliberately consistent: classical figures and orchard
 * forms rendered as soft-shaded painterly silhouettes, overlaid with the same
 * fine technical grid and crosshair annotations used by the DOM layer.
 */

export type ScenePainter = (ctx: CanvasRenderingContext2D, S: number) => void;

/* -------------------------------------------------------------------------- */
/* Palette                                                                     */
/* -------------------------------------------------------------------------- */

const SKY_DEEP = "#0f3fa8";
const SKY = "#2575fc";
const SKY_PALE = "#cfe1ff";
const CANVAS_WARM = "#fbf9f5";
const CANVAS_SHADE = "#d9cfba";
const GOLD = "#e8b229";
const GOLD_LIGHT = "#f7d878";
const GOLD_DEEP = "#a9701a";
const INK = "#14161a";
const LEAF = "#3f6b3a";

/* -------------------------------------------------------------------------- */
/* Small utilities                                                             */
/* -------------------------------------------------------------------------- */

/** Deterministic PRNG so every visitor sees the same composition. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function verticalGradient(
  ctx: CanvasRenderingContext2D,
  S: number,
  stops: [number, string][]
): void {
  const g = ctx.createLinearGradient(0, 0, 0, S);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
}

function radialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer = "rgba(0,0,0,0)"
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function technicalGrid(
  ctx: CanvasRenderingContext2D,
  S: number,
  step: number,
  color: string,
  width = 1
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let x = 0; x <= S; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, S);
  }
  for (let y = 0; y <= S; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(S, Math.round(y) + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

function crosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  lineWidth = 1.5
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Rounded, tapered limb drawn as a quadratic stroke. */
function limb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  width: number,
  color: string
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Pear geometry                                                               */
/* -------------------------------------------------------------------------- */

/** The silhouette used everywhere — fruit, masks, wireframe overlays. */
export function pearPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number
): void {
  const b = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.bezierCurveTo(
    cx + b * 0.42, cy - h * 0.44,
    cx + b * 0.34, cy - h * 0.10,
    cx + b * 0.62, cy + h * 0.06
  );
  ctx.bezierCurveTo(
    cx + b * 1.05, cy + h * 0.28,
    cx + b * 0.92, cy + h * 0.50,
    cx, cy + h * 0.50
  );
  ctx.bezierCurveTo(
    cx - b * 0.92, cy + h * 0.50,
    cx - b * 1.05, cy + h * 0.28,
    cx - b * 0.62, cy + h * 0.06
  );
  ctx.bezierCurveTo(
    cx - b * 0.34, cy - h * 0.10,
    cx - b * 0.42, cy - h * 0.44,
    cx, cy - h / 2
  );
  ctx.closePath();
}

function drawPear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts: { stem?: boolean; leaf?: boolean; shadow?: boolean } = {}
): void {
  const { stem = true, leaf = false, shadow = true } = opts;

  if (shadow) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    pearPath(ctx, cx + w * 0.06, cy + h * 0.03, w, h);
    ctx.filter = "blur(2px)";
    ctx.fill();
    ctx.restore();
  }

  const g = ctx.createRadialGradient(
    cx - w * 0.22, cy - h * 0.12, w * 0.04,
    cx, cy, h * 0.62
  );
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(0.45, GOLD);
  g.addColorStop(1, GOLD_DEEP);

  pearPath(ctx, cx, cy, w, h);
  ctx.fillStyle = g;
  ctx.fill();

  // Specular highlight.
  ctx.save();
  pearPath(ctx, cx, cy, w, h);
  ctx.clip();
  radialGlow(
    ctx,
    cx - w * 0.24,
    cy - h * 0.10,
    w * 0.34,
    "rgba(255,252,235,0.75)"
  );
  ctx.restore();

  if (stem) {
    ctx.save();
    ctx.strokeStyle = "#6b4a20";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, w * 0.055);
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.48);
    ctx.quadraticCurveTo(cx + w * 0.10, cy - h * 0.62, cx + w * 0.04, cy - h * 0.72);
    ctx.stroke();
    ctx.restore();
  }

  if (leaf) {
    ctx.save();
    ctx.translate(cx + w * 0.06, cy - h * 0.64);
    ctx.rotate(-0.5);
    ctx.fillStyle = LEAF;
    ctx.beginPath();
    ctx.ellipse(w * 0.22, 0, w * 0.26, w * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* -------------------------------------------------------------------------- */
/* Classical figure                                                            */
/* -------------------------------------------------------------------------- */

type Pose = "walk" | "tend" | "hold" | "water";

/**
 * Faces are the one thing canvas primitives cannot fake at scale — a blank
 * oval with a hair blob reads as a mannequin the moment it gets large. Figures
 * are therefore drawn from behind or in near-profile, which is also how
 * classical processional figures are usually staged.
 */

/**
 * A robed classical figure. Proportions follow the ~7.5-head canon so the
 * silhouette reads as a Renaissance study rather than a cartoon.
 */
function drawFigure(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    ground: number;
    h: number;
    pose: Pose;
    robeLight?: string;
    robeDark?: string;
    skin?: string;
    flip?: boolean;
  }
): void {
  const {
    x,
    ground,
    h,
    pose,
    robeLight = CANVAS_WARM,
    robeDark = CANVAS_SHADE,
    skin = "#e7c39c",
    flip = false,
  } = opts;

  const dir = flip ? -1 : 1;
  const headR = h * 0.058;
  const headY = ground - h * 0.925;
  const shoulderY = ground - h * 0.795;
  const hipY = ground - h * 0.50;
  const shoulderHalf = h * 0.105;
  const hemHalf = h * 0.205;

  ctx.save();

  // Contact shadow.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, ground + h * 0.01, hemHalf * 1.25, h * 0.022, 0, 0, Math.PI * 2);
  ctx.filter = "blur(3px)";
  ctx.fill();
  ctx.restore();

  // Forward leg for walking poses, drawn before the robe so the hem overlaps.
  if (pose === "walk") {
    limb(
      ctx,
      x + dir * h * 0.02, hipY,
      x + dir * h * 0.11, ground - h * 0.20,
      x + dir * h * 0.17, ground - h * 0.005,
      h * 0.048,
      "#dcc7a6"
    );
    ctx.fillStyle = "#c9ad86";
    ctx.beginPath();
    ctx.ellipse(x + dir * h * 0.175, ground, h * 0.028, h * 0.010, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Robe.
  const robe = ctx.createLinearGradient(x - hemHalf, 0, x + hemHalf, 0);
  robe.addColorStop(0, robeLight);
  robe.addColorStop(0.45, robeLight);
  robe.addColorStop(1, robeDark);

  ctx.beginPath();
  ctx.moveTo(x - shoulderHalf, shoulderY);
  ctx.bezierCurveTo(
    x - shoulderHalf * 1.12, hipY,
    x - hemHalf * 0.82, ground - h * 0.14,
    x - hemHalf, ground
  );
  ctx.quadraticCurveTo(x, ground - h * 0.022, x + hemHalf, ground);
  ctx.bezierCurveTo(
    x + hemHalf * 0.82, ground - h * 0.14,
    x + shoulderHalf * 1.12, hipY,
    x + shoulderHalf, shoulderY
  );
  ctx.quadraticCurveTo(x, shoulderY - h * 0.048, x - shoulderHalf, shoulderY);
  ctx.closePath();
  ctx.fillStyle = robe;
  ctx.fill();

  // Drapery folds — the detail that sells the classical read.
  ctx.save();
  ctx.clip();
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const topX = lerp(x - shoulderHalf * 0.9, x + shoulderHalf * 0.9, t);
    const botX = lerp(x - hemHalf * 0.94, x + hemHalf * 0.94, t);
    const dark = i % 2 === 0;
    ctx.strokeStyle = dark ? "rgba(90,72,44,0.16)" : "rgba(255,255,255,0.42)";
    ctx.lineWidth = h * (dark ? 0.009 : 0.005);
    ctx.beginPath();
    ctx.moveTo(topX, shoulderY + h * 0.02);
    ctx.quadraticCurveTo(
      lerp(topX, botX, 0.5) + (dark ? h * 0.012 : -h * 0.01),
      lerp(shoulderY, ground, 0.55),
      botX,
      ground
    );
    ctx.stroke();
  }
  // Ambient occlusion under the hem.
  const hemShade = ctx.createLinearGradient(0, ground - h * 0.10, 0, ground);
  hemShade.addColorStop(0, "rgba(80,60,30,0)");
  hemShade.addColorStop(1, "rgba(80,60,30,0.28)");
  ctx.fillStyle = hemShade;
  ctx.fillRect(x - hemHalf * 1.2, ground - h * 0.10, hemHalf * 2.4, h * 0.10);
  ctx.restore();

  // Arms.
  const armW = h * 0.052;
  const armColor = robeLight;
  const shoulderL = { x: x - shoulderHalf * 0.85, y: shoulderY + h * 0.015 };
  const shoulderR = { x: x + shoulderHalf * 0.85, y: shoulderY + h * 0.015 };
  let handL = { x: shoulderL.x - h * 0.02, y: hipY };
  let handR = { x: shoulderR.x + h * 0.02, y: hipY };

  if (pose === "walk") {
    // Hands must clear the robe silhouette (half-width ~0.13h at the hip),
    // otherwise they read as buttons sitting on the fabric.
    handL = { x: x - h * 0.152, y: hipY + h * 0.055 };
    handR = { x: x + h * 0.155, y: hipY + h * 0.015 };
  } else if (pose === "tend") {
    handL = { x: x + dir * h * 0.16, y: ground - h * 0.30 };
    handR = { x: x + dir * h * 0.23, y: ground - h * 0.26 };
  } else if (pose === "hold") {
    handL = { x: x - h * 0.17, y: shoulderY + h * 0.16 };
    handR = { x: x + h * 0.17, y: shoulderY + h * 0.16 };
  } else if (pose === "water") {
    handL = { x: x - h * 0.05, y: hipY - h * 0.02 };
    handR = { x: x + dir * h * 0.26, y: shoulderY + h * 0.10 };
  }

  limb(ctx, shoulderL.x, shoulderL.y, shoulderL.x - h * 0.04, lerp(shoulderL.y, handL.y, 0.6), handL.x, handL.y, armW, armColor);
  limb(ctx, shoulderR.x, shoulderR.y, shoulderR.x + h * 0.04, lerp(shoulderR.y, handR.y, 0.6), handR.x, handR.y, armW, armColor);

  // Forearm and hand emerging from each sleeve.
  for (const [shoulder, hand] of [
    [shoulderL, handL],
    [shoulderR, handR],
  ] as const) {
    limb(
      ctx,
      lerp(shoulder.x, hand.x, 0.72),
      lerp(shoulder.y, hand.y, 0.72),
      lerp(shoulder.x, hand.x, 0.86),
      lerp(shoulder.y, hand.y, 0.86),
      hand.x,
      hand.y,
      h * 0.030,
      "#dcb086"
    );
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y, h * 0.022, h * 0.019, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck.
  ctx.fillStyle = "#c9a179";
  ctx.fillRect(x - h * 0.020, headY + headR * 0.45, h * 0.040, h * 0.06);

  // Head, seen from behind: a hair mass over a sliver of nape.
  const hair = ctx.createRadialGradient(
    x - dir * headR * 0.4, headY - headR * 0.45, headR * 0.15,
    x, headY, headR * 1.25
  );
  hair.addColorStop(0, "#6b4e33");
  hair.addColorStop(1, "#3a2818");
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(x, headY, headR * 0.90, headR, 0, 0, Math.PI * 2);
  ctx.fill();

  // A few strands to break the silhouette.
  ctx.save();
  ctx.strokeStyle = "rgba(20,12,4,0.20)";
  ctx.lineWidth = Math.max(1, headR * 0.07);
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * headR * 0.28, headY - headR * 0.75);
    ctx.quadraticCurveTo(
      x + i * headR * 0.42,
      headY,
      x + i * headR * 0.30,
      headY + headR * 0.85
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Trees                                                                       */
/* -------------------------------------------------------------------------- */

function drawTrunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  ground: number,
  height: number,
  width: number,
  rand: () => number
): void {
  const g = ctx.createLinearGradient(x - width, 0, x + width, 0);
  g.addColorStop(0, "#6b4f33");
  g.addColorStop(0.4, "#8a6844");
  g.addColorStop(1, "#4c3722");

  ctx.beginPath();
  ctx.moveTo(x - width, ground);
  ctx.bezierCurveTo(
    x - width * 0.7, ground - height * 0.45,
    x - width * 0.42, ground - height * 0.72,
    x - width * 0.30, ground - height
  );
  ctx.lineTo(x + width * 0.30, ground - height);
  ctx.bezierCurveTo(
    x + width * 0.42, ground - height * 0.72,
    x + width * 0.7, ground - height * 0.45,
    x + width, ground
  );
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // Bark striations.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(30,18,8,0.30)";
  for (let i = 0; i < 26; i++) {
    const px = x - width + rand() * width * 2;
    const py = ground - rand() * height;
    ctx.lineWidth = width * (0.03 + rand() * 0.06);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + width * 0.1, py - height * 0.08, px, py - height * 0.16);
    ctx.stroke();
  }
  ctx.restore();

  // Main boughs.
  ctx.save();
  ctx.strokeStyle = "#6b4f33";
  ctx.lineCap = "round";
  const boughs: [number, number, number][] = [
    [-1, 0.34, 0.62],
    [1, 0.30, 0.70],
    [-1, 0.22, 0.86],
    [1, 0.24, 0.90],
  ];
  for (const [side, spread, at] of boughs) {
    const baseY = ground - height * at;
    ctx.lineWidth = width * 0.55 * (1 - at * 0.4);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(
      x + side * height * spread * 0.6,
      baseY - height * 0.06,
      x + side * height * spread,
      baseY - height * 0.20
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawCanopy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: () => number,
  count = 520
): void {
  const palette = ["#2f5a2c", "#3f6b3a", "#4d7d3f", "#649a4c", "#7fae57", "#96c268"];

  for (let i = 0; i < count; i++) {
    // Rejection-free polar placement, biased outward so the mass reads full.
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.98;
    const px = cx + Math.cos(a) * rx * r;
    const py = cy + Math.sin(a) * ry * r;

    // Light falls from upper-left.
    const light = 1 - (Math.cos(a) * -0.5 + Math.sin(a) * -0.5) * 0.5 - r * 0.25;
    const idx = Math.min(
      palette.length - 1,
      Math.max(0, Math.round(light * (palette.length - 1) + (rand() - 0.5)))
    );

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rand() * Math.PI);
    ctx.globalAlpha = 0.55 + rand() * 0.45;
    ctx.fillStyle = palette[idx];
    const len = rx * (0.045 + rand() * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, len, len * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* -------------------------------------------------------------------------- */
/* Scene 0 — Hero: a figure crossing a pedestal under an open sky              */
/* -------------------------------------------------------------------------- */

const heroScene: ScenePainter = (ctx, S) => {
  const rand = mulberry32(11);

  verticalGradient(ctx, S, [
    [0, SKY_DEEP],
    [0.42, SKY],
    [0.78, "#7fb0ff"],
    [1, SKY_PALE],
  ]);

  // Sun bloom behind the subject.
  radialGlow(ctx, S * 0.66, S * 0.52, S * 0.40, "rgba(255,246,214,0.50)");
  radialGlow(ctx, S * 0.66, S * 0.56, S * 0.13, "rgba(255,252,238,0.80)");

  // Drifting cloud bands. Blurred and very low contrast — sharp ellipses read
  // as flat stickers against the gradient.
  ctx.save();
  ctx.filter = `blur(${S * 0.018}px)`;
  for (let i = 0; i < 9; i++) {
    const y = S * (0.10 + rand() * 0.52);
    const w = S * (0.20 + rand() * 0.40);
    ctx.globalAlpha = 0.05 + rand() * 0.055;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(S * rand(), y, w, S * 0.016 * (0.5 + rand()), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  technicalGrid(ctx, S, S / 16, "rgba(255,255,255,0.10)");

  // Horizon haze.
  const haze = ctx.createLinearGradient(0, S * 0.62, 0, S * 0.80);
  haze.addColorStop(0, "rgba(255,255,255,0)");
  haze.addColorStop(1, "rgba(255,255,255,0.35)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, S * 0.62, S, S * 0.18);

  // Minimalist pedestal, pushed right of centre so the headline has clear
  // ground on the left at every viewport width.
  const pedTop = S * 0.745;
  const pedH = S * 0.055;
  const pedX = S * 0.33;
  const pedW = S * 0.72;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#0a2a6b";
  ctx.beginPath();
  ctx.ellipse(S * 0.66, pedTop + pedH + S * 0.010, pedW * 0.45, S * 0.015, 0, 0, Math.PI * 2);
  ctx.filter = "blur(6px)";
  ctx.fill();
  ctx.restore();

  const stone = ctx.createLinearGradient(0, pedTop, 0, pedTop + pedH);
  stone.addColorStop(0, CANVAS_WARM);
  stone.addColorStop(1, "#c8bda6");
  ctx.fillStyle = stone;
  ctx.fillRect(pedX, pedTop, pedW, pedH);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(pedX, pedTop, pedW, S * 0.005);
  ctx.strokeStyle = "rgba(20,22,26,0.20)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pedX, pedTop, pedW, pedH);

  drawFigure(ctx, {
    x: S * 0.66,
    ground: pedTop + S * 0.003,
    h: S * 0.255,
    pose: "walk",
  });

  // Floating leaves catching the light.
  for (let i = 0; i < 14; i++) {
    ctx.save();
    ctx.translate(S * rand(), S * (0.15 + rand() * 0.7));
    ctx.rotate(rand() * Math.PI * 2);
    ctx.globalAlpha = 0.25 + rand() * 0.4;
    ctx.fillStyle = i % 3 === 0 ? GOLD_LIGHT : "#bcd9a0";
    const l = S * (0.006 + rand() * 0.010);
    ctx.beginPath();
    ctx.ellipse(0, 0, l, l * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  crosshair(ctx, S * 0.66, pedTop + pedH * 0.5, S * 0.018, "rgba(255,255,255,0.55)");
};

/* -------------------------------------------------------------------------- */
/* Scene 1 — "We build it": grafting a scion onto rootstock                    */
/* -------------------------------------------------------------------------- */

const graftScene: ScenePainter = (ctx, S) => {
  const rand = mulberry32(29);

  verticalGradient(ctx, S, [
    [0, "#22421f"],
    [0.5, "#3d6033"],
    [1, "#8a9a52"],
  ]);

  // Defocused foliage bokeh — the shallow-depth close-up read. Blurred and
  // small; large hard-edged discs look like polka dots, not out-of-focus light.
  ctx.save();
  ctx.filter = `blur(${S * 0.012}px)`;
  for (let i = 0; i < 120; i++) {
    const r = S * (0.010 + rand() * 0.038);
    ctx.globalAlpha = 0.04 + rand() * 0.09;
    ctx.fillStyle = rand() > 0.82 ? GOLD_LIGHT : rand() > 0.4 ? "#9fc46f" : "#5d8a42";
    ctx.beginPath();
    ctx.arc(S * rand(), S * rand(), r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  radialGlow(ctx, S * 0.30, S * 0.18, S * 0.5, "rgba(255,240,200,0.30)");

  // Rootstock — a thick branch rising from lower-left.
  const rootPath = () => {
    ctx.beginPath();
    ctx.moveTo(-S * 0.05, S * 1.02);
    ctx.bezierCurveTo(S * 0.22, S * 0.86, S * 0.34, S * 0.72, S * 0.44, S * 0.50);
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3a2a19";
  ctx.lineWidth = S * 0.115;
  rootPath();
  ctx.stroke();
  ctx.strokeStyle = "#7d5c39";
  ctx.lineWidth = S * 0.095;
  rootPath();
  ctx.stroke();
  ctx.strokeStyle = "rgba(214,183,140,0.6)";
  ctx.lineWidth = S * 0.022;
  ctx.translate(-S * 0.022, -S * 0.014);
  rootPath();
  ctx.stroke();
  ctx.restore();

  // Bark texture along the rootstock.
  ctx.save();
  ctx.strokeStyle = "rgba(25,15,6,0.35)";
  for (let i = 0; i < 60; i++) {
    const t = rand();
    const px = lerp(-S * 0.05, S * 0.44, t) + (rand() - 0.5) * S * 0.07;
    const py = lerp(S * 1.02, S * 0.50, t) + (rand() - 0.5) * S * 0.05;
    ctx.lineWidth = S * (0.002 + rand() * 0.004);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + S * 0.03, py - S * 0.035);
    ctx.stroke();
  }
  ctx.restore();

  // Scion — the younger, paler graft angled in from the right.
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2f4a1f";
  ctx.lineWidth = S * 0.048;
  ctx.beginPath();
  ctx.moveTo(S * 0.44, S * 0.50);
  ctx.quadraticCurveTo(S * 0.63, S * 0.35, S * 0.80, S * 0.14);
  ctx.stroke();
  ctx.strokeStyle = "#5e8a3a";
  ctx.lineWidth = S * 0.034;
  ctx.beginPath();
  ctx.moveTo(S * 0.44, S * 0.50);
  ctx.quadraticCurveTo(S * 0.63, S * 0.35, S * 0.80, S * 0.14);
  ctx.stroke();
  ctx.restore();

  // Fresh buds on the scion.
  for (const [bx, by] of [[0.58, 0.375], [0.68, 0.285], [0.76, 0.19]] as const) {
    ctx.save();
    ctx.translate(S * bx, S * by);
    ctx.rotate(-0.7);
    ctx.fillStyle = "#8fbe5c";
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.030, S * 0.013, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Graft binding — the union wrapped in tape.
  ctx.save();
  ctx.translate(S * 0.44, S * 0.50);
  ctx.rotate(-0.68);
  for (let i = -4; i <= 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(251,249,245,0.94)" : "rgba(226,218,201,0.94)";
    ctx.fillRect(-S * 0.065, i * S * 0.019 - S * 0.009, S * 0.13, S * 0.018);
  }
  ctx.strokeStyle = "rgba(20,22,26,0.16)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-S * 0.065, -S * 0.095, S * 0.13, S * 0.19);
  ctx.restore();

  // Ink hatching across the rootstock, in the manner of a botanical plate.
  ctx.save();
  ctx.strokeStyle = "rgba(20,12,4,0.20)";
  ctx.lineWidth = Math.max(1, S * 0.0012);
  for (let i = 0; i < 34; i++) {
    const t = i / 34;
    const px = lerp(S * 0.02, S * 0.40, t);
    const py = lerp(S * 0.94, S * 0.54, t);
    ctx.beginPath();
    ctx.moveTo(px - S * 0.035, py - S * 0.028);
    ctx.lineTo(px + S * 0.030, py + S * 0.036);
    ctx.stroke();
  }
  ctx.restore();

  crosshair(ctx, S * 0.44, S * 0.50, S * 0.05, "rgba(255,255,255,0.7)");

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.setLineDash([S * 0.012, S * 0.012]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(S * 0.44, S * 0.50);
  ctx.lineTo(S * 0.88, S * 0.50);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${S * 0.016}px ui-monospace, Menlo, monospace`;
  ctx.fillText("UNION / 01", S * 0.60, S * 0.485);
};

/* -------------------------------------------------------------------------- */
/* Scene 2 — "We rank it": the orchard in full bearing                         */
/* -------------------------------------------------------------------------- */

const orchardScene: ScenePainter = (ctx, S) => {
  const rand = mulberry32(73);

  verticalGradient(ctx, S, [
    [0, "#1550d8"],
    [0.45, SKY],
    [0.72, "#a9cbff"],
    [0.74, "#93b46a"],
    [1, "#4e6b32"],
  ]);

  radialGlow(ctx, S * 0.78, S * 0.20, S * 0.34, "rgba(255,244,206,0.55)");
  technicalGrid(ctx, S, S / 16, "rgba(255,255,255,0.07)");

  const ground = S * 0.80;

  // Distant orchard rows. Small, opaque and desaturated toward the sky —
  // large translucent blobs read as bubbles floating on the horizon.
  for (let i = 0; i < 13; i++) {
    const dx = S * (0.02 + i * 0.080 + rand() * 0.02);
    const dh = S * (0.030 + rand() * 0.014);
    const base = S * 0.752;
    ctx.fillStyle = "#5c7f57";
    ctx.fillRect(dx - S * 0.0035, base - dh * 0.2, S * 0.007, dh * 0.55);
    ctx.fillStyle = i % 3 === 0 ? "#5f855a" : "#547a50";
    ctx.beginPath();
    ctx.ellipse(dx, base - dh * 0.5, dh * 0.62, dh * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Atmospheric haze over the far rows.
  const rowHaze = ctx.createLinearGradient(0, S * 0.70, 0, S * 0.79);
  rowHaze.addColorStop(0, "rgba(190,215,255,0.55)");
  rowHaze.addColorStop(1, "rgba(190,215,255,0)");
  ctx.fillStyle = rowHaze;
  ctx.fillRect(0, S * 0.70, S, S * 0.09);

  // Grass strokes.
  ctx.save();
  ctx.strokeStyle = "rgba(30,60,20,0.35)";
  for (let i = 0; i < 400; i++) {
    const gx = S * rand();
    const gy = ground + rand() * (S - ground) * 0.9;
    const scale = (gy - ground) / (S - ground);
    ctx.lineWidth = 1 + scale * 2.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + (rand() - 0.5) * S * 0.012, gy - S * (0.008 + scale * 0.02));
    ctx.stroke();
  }
  ctx.restore();

  // Hero tree.
  const treeX = S * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#1d3312";
  ctx.beginPath();
  ctx.ellipse(treeX + S * 0.03, ground + S * 0.012, S * 0.26, S * 0.03, 0, 0, Math.PI * 2);
  ctx.filter = "blur(6px)";
  ctx.fill();
  ctx.restore();

  drawTrunk(ctx, treeX, ground, S * 0.34, S * 0.035, rand);
  drawCanopy(ctx, treeX, ground - S * 0.46, S * 0.30, S * 0.22, rand, 900);

  // Golden fruit hanging in the canopy.
  const fruit: [number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.6;
    const fx = treeX + Math.cos(a) * S * 0.30 * r;
    const fy = ground - S * 0.46 + Math.sin(a) * S * 0.22 * r;
    fruit.push([fx, fy]);
  }
  fruit.sort((a, b) => a[1] - b[1]);
  for (const [fx, fy] of fruit) {
    const w = S * (0.030 + rand() * 0.014);
    drawPear(ctx, fx, fy, w, w * 1.32, { stem: true, shadow: false });
  }

  // Windfall.
  drawPear(ctx, treeX - S * 0.22, ground + S * 0.045, S * 0.034, S * 0.045, { stem: false });
  drawPear(ctx, treeX + S * 0.26, ground + S * 0.075, S * 0.038, S * 0.050, { stem: true });

  crosshair(ctx, treeX, ground - S * 0.46, S * 0.03, "rgba(255,255,255,0.45)");
};

/* -------------------------------------------------------------------------- */
/* Scene 3 — "We share in what it earns": the split pear                       */
/* -------------------------------------------------------------------------- */

const splitPearScene: ScenePainter = (ctx, S) => {
  const rand = mulberry32(131);

  verticalGradient(ctx, S, [
    [0, "#0a1020"],
    [0.5, "#132542"],
    [1, "#2a3550"],
  ]);

  // Shaft of light from upper left — chiaroscuro staging.
  ctx.save();
  ctx.globalAlpha = 0.20;
  const shaft = ctx.createLinearGradient(S * 0.1, 0, S * 0.75, S);
  shaft.addColorStop(0, "rgba(255,240,200,0.9)");
  shaft.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(S * 0.02, 0);
  ctx.lineTo(S * 0.46, 0);
  ctx.lineTo(S * 0.95, S);
  ctx.lineTo(S * 0.28, S);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Dust motes.
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = 0.06 + rand() * 0.22;
    ctx.fillStyle = "#fff3d0";
    ctx.beginPath();
    ctx.arc(S * rand(), S * rand(), S * (0.0012 + rand() * 0.0024), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Figure cropped at the shoulders — a painterly crop that puts the opened
  // fruit at eye level and keeps the head, which is the one form these
  // primitives cannot carry at close range, out of frame on landscape screens.
  const figureH = S * 1.15;
  const figureGround = S * 1.23;

  drawFigure(ctx, {
    x: S * 0.5,
    ground: figureGround,
    h: figureH,
    pose: "hold",
    robeLight: "#efe7d8",
    robeDark: "#8d8069",
  });

  const handY = figureGround - figureH * 0.795 + figureH * 0.16;
  const leftX = S * 0.5 - figureH * 0.17;
  const rightX = S * 0.5 + figureH * 0.17;

  // Light spilling from the opened fruit.
  radialGlow(ctx, S * 0.5, handY, S * 0.26, "rgba(255,214,120,0.50)");
  radialGlow(ctx, S * 0.5, handY, S * 0.10, "rgba(255,245,214,0.70)");

  // The two halves, cut faces turned toward the viewer.
  const halfW = S * 0.125;
  const halfH = S * 0.165;

  const drawHalf = (cx: number, side: 1 | -1) => {
    ctx.save();
    ctx.translate(cx, handY);
    ctx.rotate(side * 0.18);

    // Skin.
    pearPath(ctx, 0, 0, halfW, halfH);
    const skinGrad = ctx.createLinearGradient(-halfW / 2, 0, halfW / 2, 0);
    skinGrad.addColorStop(0, GOLD);
    skinGrad.addColorStop(1, GOLD_DEEP);
    ctx.fillStyle = skinGrad;
    ctx.fill();

    // Cut flesh, inset from the skin.
    ctx.save();
    pearPath(ctx, 0, 0, halfW * 0.88, halfH * 0.9);
    ctx.clip();
    const flesh = ctx.createRadialGradient(0, 0, halfW * 0.05, 0, 0, halfH * 0.6);
    flesh.addColorStop(0, "#fffaea");
    flesh.addColorStop(1, "#f0dfb4");
    ctx.fillStyle = flesh;
    ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);

    // Core and seeds.
    ctx.fillStyle = "rgba(190,160,100,0.5)";
    ctx.beginPath();
    ctx.ellipse(0, halfH * 0.10, halfW * 0.18, halfH * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a3116";
    for (const [sx, sy] of [[-0.07, 0.06], [0.07, 0.06], [0, 0.16]] as const) {
      ctx.save();
      ctx.translate(halfW * sx, halfH * sy);
      ctx.rotate(sx * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW * 0.045, halfH * 0.048, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Fibre lines toward the stem.
    ctx.strokeStyle = "rgba(180,150,90,0.35)";
    ctx.lineWidth = Math.max(1, S * 0.0015);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, halfH * -0.02);
      ctx.quadraticCurveTo(halfW * 0.05 * i, -halfH * 0.25, halfW * 0.03 * i, -halfH * 0.44);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  };

  drawHalf(leftX - S * 0.015, -1);
  drawHalf(rightX + S * 0.015, 1);

  // Thin gold thread connecting the halves — the shared upside.
  ctx.save();
  ctx.strokeStyle = "rgba(255,220,140,0.8)";
  ctx.lineWidth = Math.max(1, S * 0.0018);
  ctx.setLineDash([S * 0.008, S * 0.010]);
  ctx.beginPath();
  ctx.moveTo(leftX + halfW * 0.4, handY);
  ctx.lineTo(rightX - halfW * 0.4, handY);
  ctx.stroke();
  ctx.restore();

  technicalGrid(ctx, S, S / 12, "rgba(255,255,255,0.045)");
};

/* -------------------------------------------------------------------------- */
/* Scene 4 — "No fees": the architectural blueprint                            */
/* -------------------------------------------------------------------------- */

const blueprintScene: ScenePainter = (ctx, S) => {
  const rand = mulberry32(211);

  verticalGradient(ctx, S, [
    [0, "#0b2f8f"],
    [0.55, "#1a5ae0"],
    [1, "#0d3ba6"],
  ]);
  radialGlow(ctx, S * 0.5, S * 0.42, S * 0.6, "rgba(120,180,255,0.22)");

  technicalGrid(ctx, S, S / 48, "rgba(255,255,255,0.06)");
  technicalGrid(ctx, S, S / 12, "rgba(255,255,255,0.14)");

  const line = "rgba(255,255,255,0.85)";
  const faint = "rgba(255,255,255,0.45)";

  // --- Wireframe dome ------------------------------------------------------
  const dx = S * 0.5;
  const dy = S * 0.56;
  const R = S * 0.24;

  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1.2, S * 0.0016);

  ctx.beginPath();
  ctx.arc(dx, dy, R, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Meridians.
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const rx = Math.abs(Math.cos(Math.PI * t)) * R;
    ctx.beginPath();
    ctx.ellipse(dx, dy, rx, R, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  // Parallels.
  ctx.strokeStyle = faint;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const y = dy - Math.sin((Math.PI / 2) * t) * R;
    const rx = Math.cos((Math.PI / 2) * t) * R;
    ctx.beginPath();
    ctx.ellipse(dx, y, rx, rx * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Springing line and oculus.
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(dx - R * 1.25, dy);
  ctx.lineTo(dx + R * 1.25, dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(dx, dy - R, R * 0.12, R * 0.03, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // --- Pear silhouette in wireframe, inscribed over the dome ---------------
  ctx.save();
  ctx.strokeStyle = "rgba(232,178,41,0.85)";
  ctx.lineWidth = Math.max(1.4, S * 0.002);
  ctx.setLineDash([S * 0.010, S * 0.008]);
  pearPath(ctx, dx, dy - R * 0.30, R * 1.02, R * 1.42);
  ctx.stroke();
  ctx.restore();

  // --- Floorplan, lower left ----------------------------------------------
  ctx.save();
  ctx.translate(S * 0.08, S * 0.72);
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1.2, S * 0.0016);
  const pw = S * 0.30;
  const ph = S * 0.20;
  ctx.strokeRect(0, 0, pw, ph);
  ctx.strokeRect(pw * 0.06, ph * 0.08, pw * 0.36, ph * 0.5);
  ctx.strokeRect(pw * 0.50, ph * 0.08, pw * 0.44, ph * 0.34);
  ctx.strokeRect(pw * 0.50, ph * 0.50, pw * 0.44, ph * 0.42);
  ctx.strokeStyle = faint;
  ctx.beginPath();
  ctx.arc(pw * 0.06, ph * 0.72, pw * 0.16, -Math.PI / 2, 0);
  ctx.stroke();
  ctx.restore();

  // --- Elevation study, upper right ---------------------------------------
  ctx.save();
  ctx.translate(S * 0.66, S * 0.10);
  ctx.strokeStyle = faint;
  ctx.lineWidth = Math.max(1, S * 0.0014);
  const ew = S * 0.26;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (ew / 6) * i * 0.7);
    ctx.lineTo(ew, (ew / 6) * i * 0.7);
    ctx.stroke();
  }
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(0, ew * 0.7);
  ctx.lineTo(ew * 0.5, 0);
  ctx.lineTo(ew, ew * 0.7);
  ctx.stroke();
  ctx.restore();

  // --- Dimension lines and annotations ------------------------------------
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.lineWidth = Math.max(1, S * 0.0012);
  ctx.font = `${S * 0.0155}px ui-monospace, Menlo, monospace`;

  const dim = (x1: number, y: number, x2: number, label: string) => {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.moveTo(x1, y - S * 0.010);
    ctx.lineTo(x1, y + S * 0.010);
    ctx.moveTo(x2, y - S * 0.010);
    ctx.lineTo(x2, y + S * 0.010);
    ctx.stroke();
    ctx.fillText(label, (x1 + x2) / 2 - S * 0.028, y - S * 0.016);
  };

  dim(dx - R, S * 0.90, dx + R, "SPAN 24.0");
  dim(S * 0.08, S * 0.955, S * 0.38, "PLAN 30.0");

  const notes: [number, number, string][] = [
    [0.055, 0.075, "PEAR / MODEL 01"],
    [0.055, 0.105, "NO MANAGEMENT FEE"],
    [0.055, 0.135, "CARRY  ——  SHARED"],
    [0.72, 0.62, "R = 12.0"],
    [0.72, 0.65, "OCULUS ø 2.4"],
  ];
  for (const [nx, ny, text] of notes) ctx.fillText(text, S * nx, S * ny);
  ctx.restore();

  // Registration marks in the corners.
  for (const [cx, cy] of [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]] as const) {
    crosshair(ctx, S * cx, S * cy, S * 0.018, "rgba(255,255,255,0.5)", 1.2);
  }

  // Scattered data points, faintly connected.
  ctx.save();
  ctx.strokeStyle = "rgba(232,178,41,0.35)";
  ctx.fillStyle = GOLD;
  ctx.lineWidth = Math.max(1, S * 0.0012);
  const pts: [number, number][] = [];
  for (let i = 0; i < 7; i++) {
    pts.push([S * (0.42 + rand() * 0.5), S * (0.16 + rand() * 0.28)]);
  }
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
  for (const [px, py] of pts) {
    ctx.beginPath();
    ctx.arc(px, py, S * 0.0035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/* -------------------------------------------------------------------------- */
/* Exports                                                                     */
/* -------------------------------------------------------------------------- */

export const SCENE_PAINTERS: ScenePainter[] = [
  heroScene,
  graftScene,
  orchardScene,
  splitPearScene,
  blueprintScene,
];

/** Average colour of each scene — used for the 1x1 placeholder texture so the
 *  first frame is never black while the artwork is still being painted. */
export const SCENE_BASE_COLORS: [number, number, number][] = [
  [37, 117, 252],
  [61, 96, 51],
  [37, 117, 252],
  [19, 37, 66],
  [26, 90, 224],
];

/**
 * Photographic artwork for each scene, served from `public/scenes/`.
 *
 * These are the real deliverable: hyperrealistic religious-painting scenes.
 * The procedural painters above stay as the fallback — they render instantly
 * while a photograph is still downloading, and they carry the page unchanged
 * if a file is missing. Drop a file in at the matching name and the scene
 * upgrades itself with no code change. Any aspect ratio works; the shader
 * cover-fits whatever it is handed.
 */
export const SCENE_ART_SLOTS = [
  "01-hero-walk",
  "02-graft",
  "03-orchard",
  "04-split-pear",
  "05-dome",
  // Decorative, used by the DOM sections rather than the canvas.
  "06-orchard-pale",
  "07-night-tending",
] as const;

/** The first five slots, in scene order, back the WebGL story. */
export const STORY_ART_SLOTS = SCENE_ART_SLOTS.slice(0, 5);

/** Mask shape used for each transition i -> i+1. 0 pear, 1 circle, 2 aperture. */
export const MASK_MODES = [0, 1, 0, 2];

export const SCENE_COUNT = SCENE_PAINTERS.length;
