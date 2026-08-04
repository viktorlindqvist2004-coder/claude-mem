import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { computeCamera, insideness, type Camera } from '../lib/scene'
import { easeInOutCubic } from '../lib/math'
import { useViewport } from '../lib/hooks'

const CameraContext = createContext<Camera>(computeCamera(1440, 900))

export const useCamera = () => useContext(CameraContext)

export function CameraProvider({ children }: { children: ReactNode }) {
  const { vw, vh } = useViewport()
  const camera = useMemo(() => computeCamera(vw, vh), [vw, vh])
  return <CameraContext.Provider value={camera}>{children}</CameraContext.Provider>
}

/** Kamerans position längs resan: 0 vid skrivbordet, 1 inne i skärmen. */
export const cameraProgress = (act1: number, act3: number) =>
  insideness(act1, act3, easeInOutCubic)
