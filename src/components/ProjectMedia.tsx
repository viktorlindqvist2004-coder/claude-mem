import { useState } from 'react'
import { ProjectArt } from './ProjectArt'
import type { Project } from '../data/content'

/**
 * Projektbilden. Ligger fotot på plats under `public/` visas det; saknas det
 * ritas den genererade grafiken i stället, så att sidan aldrig visar en
 * trasig bildruta medan bildbanken fylls på.
 */
export function ProjectMedia({ project, index }: { project: Project; index: number }) {
  const [missing, setMissing] = useState(false)

  if (missing) return <ProjectArt project={project} index={index} />

  return (
    <img
      className="card__art"
      src={`${import.meta.env.BASE_URL}${project.image}`}
      alt={`${project.name} — ${project.sector}`}
      loading="lazy"
      decoding="async"
      onError={() => setMissing(true)}
    />
  )
}
