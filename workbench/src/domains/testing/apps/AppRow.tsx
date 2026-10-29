import { Link } from 'react-router-dom'
import { Folder } from 'lucide-react'
import type { ProjectRow as Project } from '@/types/project'

export function ProjectRow({ project, recent, focused, href, onHover, onOpen }: {
  project: Project; recent: boolean; focused: boolean; href: string; onHover: () => void; onOpen: () => void
}) {
  return <Link to={href} onClick={onOpen} onMouseEnter={onHover} data-focus={focused ? 'true' : 'false'} className="w-app-row w-hit" title={project.name}>
    <span className="min-w-0 flex items-center gap-2"><Folder size={16} /><strong className="truncate">{project.name || '未命名项目'}</strong>{recent && <small>最近</small>}</span>
    <span className="truncate w-app-tags" style={{ color: 'var(--w-text-tertiary)' }}>{project.description}</span>
    <span className="w-app-status" style={{ textAlign: 'right', color: 'var(--w-text-tertiary)' }} aria-hidden>›</span>
  </Link>
}
