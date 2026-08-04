import { clamp, smoothstep } from './math'

/**
 * KAMERAN
 * ───────
 * Rummet byggs som ett antal plana lager på olika djup framför en virtuell
 * kamera. I stället för CSS 3D projicerar vi själva: ett lager på djupet `z`
 * som kameran flyttat sig `zc` framåt mot skalas med
 *
 *     m = (P - z) / (P - z - zc)
 *
 * där P är perspektivavståndet. Alla lager skalas kring samma punkt — mitten
 * av bildskärmen — så skärmen ligger stilla i bild medan rummet sveper förbi.
 * Lager närmare kameran får större m och rusar därför ut ur bild först, vilket
 * ger äkta parallax i stället för en platt inzoomning.
 *
 * Scenen är en 16:9-yta som alltid täcker fönstret (cover). Eftersom skärmen
 * också är 16:9 blir slutskalan exakt 1 / SCREEN.w oavsett fönsterformat.
 */

export const STAGE_AR = 16 / 9

/** Skärmens plats på scenen, som andel av scenens bredd respektive höjd. */
export const SCREEN = { x: 0.43, y: 0.355, w: 0.14, h: 0.14 } as const

export const SCREEN_CENTER = {
  x: SCREEN.x + SCREEN.w / 2,
  y: SCREEN.y + SCREEN.h / 2,
} as const

/** Perspektivavstånd i "scenbredder". */
export const PERSPECTIVE = 1.15

/** Djup per lager. Mindre värde = längre bort från kameran. */
export const Z = {
  wall: -0.46,
  window: -0.45,
  posters: -0.43,
  shelf: -0.42,
  plant: -0.4,
  monitor: -0.35,
  desk: -0.22,
  props: -0.16,
  lamp: -0.05,
  foreground: 0.2,
} as const

export type Camera = {
  stageW: number
  stageH: number
  /** Skärmens storlek i px vid vila. */
  screenW: number
  screenH: number
  /** Slutskala som får skärmen att täcka fönstret. */
  scale: number
  /** Kameraförflyttning som centrerar skärmen i fönstret. */
  dx: number
  dy: number
  /** Transform-origin i px, relativt scenens låda. */
  originX: number
  originY: number
  /** Kamerans maximala framåtrörelse. */
  zMax: number
}

export function computeCamera(vw: number, vh: number): Camera {
  // Cover: scenen är minst lika bred och hög som fönstret.
  const stageW = Math.max(vw, vh * STAGE_AR)
  const stageH = stageW / STAGE_AR

  const screenW = stageW * SCREEN.w
  const screenH = stageH * SCREEN.h

  const scale = Math.max(vw / screenW, vh / screenH)

  const stageLeft = (vw - stageW) / 2
  const stageTop = (vh - stageH) / 2

  const originX = SCREEN_CENTER.x * stageW
  const originY = SCREEN_CENTER.y * stageH

  const dx = vw / 2 - (stageLeft + originX)
  const dy = vh / 2 - (stageTop + originY)

  const zMax = (PERSPECTIVE - Z.monitor) * (1 - 1 / scale)

  return { stageW, stageH, screenW, screenH, scale, dx, dy, originX, originY, zMax }
}

/** Avstånd från kameran till ett lager, i scenbredder. */
const depthOf = (z: number, zc: number) => PERSPECTIVE - z - zc

export type LayerState = { scale: number; opacity: number }

/**
 * Skala och synlighet för ett lager vid kameraposition `zc`.
 *
 * Bara lager framför bildskärmen tonas ut: de passerar faktiskt kameran och
 * skulle annars explodera i storlek. Skärmen och allt bakom den behåller full
 * opacitet hela vägen in — de är målet för resan, inte kuliss som sveper förbi.
 */
export function layerState(z: number, zc: number): LayerState {
  const d = depthOf(z, zc)
  if (d <= 0.1) return { scale: 1, opacity: 0 }

  const scale = depthOf(z, 0) / d
  const opacity = z > Z.monitor ? smoothstep(0.1, 0.34, d) : 1

  return { scale, opacity }
}

/**
 * "Insidan" — 0 i rummet, 1 när skärmen fyller fönstret.
 * Under akt 3 backar samma värde tillbaka mot 0.
 */
export function insideness(act1: number, act3: number, ease: (t: number) => number) {
  return clamp(ease(act1) * (1 - ease(act3)), 0, 1)
}
