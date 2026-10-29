import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Drawer, EmptyState, Select, Skeleton, Space, errText } from '@/ui'
import { useProjects } from '../apps/queries'
import { CreateDialog } from '../apps/CreateDialog'
import { formatPlatformTags } from '@/constants/appPlatforms'
import { EnvironmentSettings } from './EnvConfigPanel'
import { ScriptRepoCard } from './ScriptRepoCard'
import './ConfigWorkspace.css'

export function ProjectAppsPanel({ projectId, appId = '', legacySection }: { projectId: string; appId?: string; legacySection?: string }) {
  const projects = useProjects()
  const project = projects.data?.find(row => row.id === projectId)
  const [creating, setCreating] = useState(false)
  const [params, setParams] = useSearchParams()
  const requested = params.get('appId') || ''
  const app = project?.apps?.find(row => row.id === (appId || requested))
  const navigate = (appId: string, nextSection = 'runtime') => {
    const query = new URLSearchParams(params)
    query.set('configView', 'apps')
    if (appId) query.set('appId', appId); else query.delete('appId')
    if (nextSection === 'runtime') query.delete('appConfig'); else query.set('appConfig', nextSection)
    setParams(query)
  }
  const manageEnvironment = () => { const query = new URLSearchParams(params); query.set('configView', 'environment'); setParams(query) }
  const environmentPanel = <Drawer title="项目环境" open={legacySection === 'environment'} width="min(960px, 100vw)" onClose={() => navigate(requested)} destroyOnHidden styles={{ body: { display: 'flex', flexDirection: 'column', minHeight: 0 } }}><EnvironmentSettings key={projectId} projectId={projectId} /></Drawer>
  if (projects.isPending) return <Skeleton active />
  if (projects.isError || !project) return <EmptyState title="无法读取项目应用" hint={errText(projects.error)} />
  if (requested && !app) return <EmptyState title="该应用不属于当前项目或已不存在" />
  if (app) return <section className="config-workspace config-workspace--fill">
    <header className="config-workspace-heading"><div><h1>{app.name}</h1><p>{formatPlatformTags(app.platforms).join(' · ')}</p></div><Space wrap>{(project.apps || []).length > 1 && <Select aria-label="应用" value={app.id} options={(project.apps || []).map(row => ({ value: row.id, label: row.name || '未命名应用' }))} onChange={value => navigate(String(value))} style={{ minWidth: 160 }} />}<Button onClick={manageEnvironment}>项目环境</Button><Button type="primary" onClick={() => setCreating(true)}>新建应用</Button></Space></header>
    <div className="config-page-body"><ScriptRepoCard projectId={projectId} /><EnvironmentSettings projectId={projectId} application={app} /></div>
    {environmentPanel}
    <CreateDialog target={creating ? { kind: 'app', projects: [{ id: project.id, name: project.name || '当前项目' }] } : null} onClose={() => setCreating(false)} />
  </section>
  return <section className="config-workspace config-workspace--fill">
    <header className="config-workspace-heading"><div><h1>配置</h1></div><Space wrap><Button onClick={manageEnvironment}>项目环境</Button><Button type="primary" onClick={() => setCreating(true)}>新建应用</Button></Space></header>
    <div className="config-page-body"><ScriptRepoCard projectId={projectId} />{!(project.apps || []).length ? <EmptyState title="项目中还没有应用" />
      : <div className="w-surface-card">{project.apps!.map(row => <div key={row.id} className="config-app-row"><div className="config-stack"><strong>{row.name || '未命名应用'}</strong><span className="config-secondary">{formatPlatformTags(row.platforms).join(' · ')}{row.description ? ` · ${row.description}` : ''}</span></div><Button onClick={() => navigate(row.id)}>配置</Button></div>)}</div>}</div>
    {environmentPanel}
    <CreateDialog target={creating ? { kind: 'app', projects: [{ id: project.id, name: project.name || '当前项目' }] } : null} onClose={() => setCreating(false)} />
  </section>
}
