export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v

export const clamp01 = (v: number) => clamp(v, 0, 1)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Mappar v från [inMin,inMax] till [outMin,outMax] och klipper i ändarna. */
export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin = 0,
  outMax = 1,
) => {
  if (inMax === inMin) return outMin
  return clamp(((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin,
    Math.min(outMin, outMax), Math.max(outMin, outMax))
}

/** Som mapRange men utan klippning. */
export const mapRangeUnclamped = (
  v: number, inMin: number, inMax: number, outMin = 0, outMax = 1,
) => (inMax === inMin ? outMin : ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin)

export const smoothstep = (edge0: number, edge1: number, v: number) => {
  const t = clamp01((v - edge0) / (edge1 - edge0 || 1))
  return t * t * (3 - 2 * t)
}

/**
 * Bildruteoberoende utjämning. `amount` är hur stor andel av avståndet som
 * ska tas per 60 Hz-bildruta; dt normaliserar mot faktisk bildfrekvens så att
 * rörelsen känns likadan på 60 och 144 Hz.
 */
export const damp = (current: number, target: number, amount: number, dt: number) =>
  lerp(current, target, 1 - Math.pow(1 - amount, dt / (1000 / 60)))

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export const easeInCubic = (t: number) => t * t * t

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export const easeInOutQuint = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2

export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Deterministisk pseudoslump — samma seed ger samma serie. */
export const seeded = (seed: number) => {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}
