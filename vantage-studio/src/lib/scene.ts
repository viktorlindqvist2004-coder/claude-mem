import { clamp } from './math'
import { PHOTO, type PhotoScreen } from '../data/scene-photo'

/**
 * KAMERAN
 * ───────
 * Bakgrunden är ett enda plan — fotografiet. Kameran åker rakt fram mot
 * bildskärmen i bilden, vilket motsvarar att skala fotot kring skärmens
 * mittpunkt:
 *
 *     m = (P - z) / (P - z - zc)
 *
 * där P är perspektivavståndet och zc hur långt kameran flyttat sig framåt.
 * Formeln i stället för en rak `scale(1 → 7)` gör att rörelsen accelererar
 * som en riktig framåtåkning: långsamt på håll, snabbt de sista metrarna.
 *
 * Fotot täcker alltid fönstret (cover), så slutskalan blir densamma oavsett
 * fönsterformat.
 */

export const PERSPECTIVE = 1.15

/** Fotoplanets djup. */
export const Z_PLANE = -0.35

export type Camera = {
  stageW: number
  stageH: number
  screenW: number
  screenH: number
  /** Skala som får skärmytan att täcka fönstret. */
  scale: number
  /** Förflyttning som centrerar skärmytan i fönstret. */
  dx: number
  dy: number
  /** Transform-origin i px, relativt scenens låda. */
  originX: number
  originY: number
  /** Kamerans maximala framåtrörelse. */
  zMax: number
}

export function computeCamera(
  vw: number,
  vh: number,
  aspect: number = PHOTO.aspect,
  screen: PhotoScreen = PHOTO.screen,
): Camera {
  // Cover: scenen är minst lika bred och hög som fönstret.
  const stageW = Math.max(vw, vh * aspect)
  const stageH = stageW / aspect

  const screenW = stageW * screen.w
  const screenH = stageH * screen.h

  const scale = Math.max(vw / screenW, vh / screenH)

  const stageLeft = (vw - stageW) / 2
  const stageTop = (vh - stageH) / 2

  const originX = (screen.x + screen.w / 2) * stageW
  const originY = (screen.y + screen.h / 2) * stageH

  const dx = vw / 2 - (stageLeft + originX)
  const dy = vh / 2 - (stageTop + originY)

  const zMax = (PERSPECTIVE - Z_PLANE) * (1 - 1 / scale)

  return { stageW, stageH, screenW, screenH, scale, dx, dy, originX, originY, zMax }
}

/** Fotoplanets skala vid kamerapositionen `zc`. */
export function planeScale(zc: number) {
  const d0 = PERSPECTIVE - Z_PLANE
  return d0 / Math.max(d0 - zc, 0.001)
}

/**
 * "Insidan" — 0 i rummet, 1 när skärmen fyller fönstret.
 * Under akt 3 backar samma värde tillbaka mot 0.
 */
export function insideness(act1: number, act3: number, ease: (t: number) => number) {
  return clamp(ease(act1) * (1 - ease(act3)), 0, 1)
}
