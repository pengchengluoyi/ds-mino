import { lazy, Suspense, useEffect } from 'react'
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button, EmptyState, ErrorBoundary, Select, Skeleton, errText } from '@/ui'
import { useProjects } from '../apps/queries'
import { APP_NAV, SUB_VIEW_DEFAULTS, isRetiredTab, resolveTab } from './nav'
import { projectHref } from './projectNavigation'
import { useAppRealtime } from './useAppRealtime'

const CasesPanel = lazy(() => import('../cases/CasesPanel').then(m => ({ default: m.CasesPanel })))
const TasksPanel = lazy(() => import('../tasks/TasksPanel').then(m => ({ default: m.TasksPanel })))
const AssetsPanel = lazy(() => import('../assets/AssetsPanel').then(m => ({ default: m.AssetsPanel })))
const ApplicationLogicPanel = lazy(() => import('../logic/ApplicationLogicPanel').then(m => ({ default: m.ApplicationLogicPanel })))
const EnvConfigPanel = lazy(() => import('../config/EnvConfigPanel').then(m => ({ default: m.EnvConfigPanel })))
export function ProjectWorkbench() {
  const { projectId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const projects = useProjects()
  const project = projects.data?.find(row => row.id === projectId)
  const apps = project?.apps || []
  const requested = params.get('appId') || ''
  const matched = requested ? apps.find(row => row.id === requested) : undefined
  const app = matched || (!requested ? apps[0] : undefined)
  const appId = app?.id || ''
  const fallbackAppId = !requested && apps[0] ? apps[0].id : ''
  useEffect(() => {
    if (!project || !fallbackAppId) return
    const query = new URLSearchParams(params)
    if (query.get('appId') === fallbackAppId) return
    query.set('appId', fallbackAppId)
    setParams(query, { replace: true })
  }, [project, fallbackAppId, params, setParams])
  const rawTab = params.get('tab')
  const tab = resolveTab(rawTab)
  useAppRealtime(appId, projectId)
  if (rawTab === 'navigation') {
    const query = new URLSearchParams(params)
    query.set('tab', 'logic')
    query.delete('nview')
    return <Navigate to={projectHref(projectId, query)} replace />
  }
  if (rawTab === 'config' && (params.get('configView') === 'login-evidence' || params.get('appConfig') === 'login')) {
    const query = new URLSearchParams(params)
    query.set('tab', 'logic')
    query.set('logicSection', 'login')
    query.delete('configView')
    query.delete('appConfig')
    return <Navigate to={projectHref(projectId, query)} replace />
  }
  if (rawTab === 'config' && params.get('configView') === 'account-facts' || rawTab === 'assets' && params.get('section') === 'device-apps') {
    const query = new URLSearchParams(params)
    query.set('tab', 'assets')
    query.set('section', 'logs')
    query.delete('configView')
    return <Navigate to={projectHref(projectId, query)} replace />
  }
  if (rawTab === 'config' && params.get('configView') === 'execution-resources') {
    const query = new URLSearchParams(params)
    query.delete('configView')
    return <Navigate to={projectHref(projectId, query)} replace />
  }
  if ((rawTab === 'config' && params.get('configView') === 'controls') || params.get('issueView') === 'pages' || (rawTab === 'assets' && params.get('section') === 'logic')) {
    const query = new URLSearchParams(params)
    query.set('tab', 'logic')
    query.delete('section')
    query.delete('configView')
    query.delete('issueView')
    return <Navigate to={projectHref(projectId, query)} replace />
  }
  if (isRetiredTab(rawTab)) {
    const query = new URLSearchParams(params)
    query.delete('tab')
    for (const key of ['run', 'tcase', 'unit', 'session', 'issueView']) query.delete(key)
    return <Navigate to={projectHref(projectId, query)} replace />
  }
  const choose = (id: string) => {
    // A different target must never inherit another application's run/session.
    const query = new URLSearchParams(params)
    for (const key of ['case', 'run', 'session', 'tcase', 'unit']) query.delete(key)
    query.set('appId', id)
    setParams(query)
  }
  if (projects.isPending) return <Skeleton active />
  if (projects.isError) return <EmptyState title="项目读取失败" hint={errText(projects.error)} action={<Button onClick={() => void projects.refetch()}>重试</Button>} />
  if (!project) return <EmptyState title="项目不存在或不可访问" action={<Link to="/testing">返回项目列表</Link>} />
  let panel: React.ReactNode
  if (tab === 'config') panel = <EnvConfigPanel projectId={projectId} appId={appId} />
  else if (tab === 'logic') panel = <ApplicationLogicPanel projectId={projectId} appId={appId} />
  else if (tab === 'assets') panel = <AssetsPanel projectId={projectId} />
  else if ((tab === 'cases' || tab === 'tasks') && !app) panel = <EmptyState
    title={requested ? '目标应用不属于当前项目或已不存在' : '项目尚未配置应用'}
    hint={apps.length ? '这个链接里的应用不属于当前项目。' : '在配置中添加应用后，即可执行测试。'}
    action={apps.length ? undefined : <Link to={projectHref(projectId, { tab: 'config', configView: 'apps' })}>管理项目应用</Link>}
  />
  else if (tab === 'cases') panel = <CasesPanel appId={appId} projectId={projectId} platforms={app?.platforms} />
  else if (tab === 'tasks') panel = <TasksPanel appId={appId} projectId={projectId} platforms={app?.platforms} />
  else panel = <EmptyState title="此项目视图暂未提供" action={<Link to={projectHref(projectId)}>返回项目用例</Link>} />
  const nav = APP_NAV.find(item => item.id === tab || item.alsoActiveOn?.includes(tab))
  const defaultView = SUB_VIEW_DEFAULTS[tab]
  const subView = defaultView ? params.get(defaultView.key) || defaultView.value : ''
  const child = nav?.children?.find(item => item.tab === tab || item.param?.value === subView)
  const sectionLabel = child?.label || nav?.label || '项目'
  const listQuery = new URLSearchParams(params)
  for (const key of ['case', 'run', 'tcase', 'unit', 'session']) listQuery.delete(key)
  const levels: { label: string; to?: string }[] = [
    { label: '项目', to: '/testing' },
    { label: project.name || '未命名项目', to: projectHref(projectId, appId ? { appId } : {}) },
    { label: sectionLabel },
  ]
  if (tab === 'cases' && params.get('case')) {
    levels[2].to = projectHref(projectId, listQuery)
    levels.push({ label: '用例详情' })
  } else if (tab === 'tasks' && params.get('run')) {
    levels[2].to = projectHref(projectId, listQuery)
    levels.push({ label: '任务详情' })
  }
  return <div className="project-workbench">
    <div className="project-context-bar">
      <nav aria-label="面包屑" className="project-breadcrumb"><ol className="project-breadcrumb-list">{levels.map((level, index) => <li key={`${index}:${level.label}`}>{index > 0 && <ChevronRight size={14} aria-hidden />}{level.to ? <Link to={level.to}>{level.label}</Link> : <span aria-current={index === levels.length - 1 ? 'page' : undefined}>{level.label}</span>}</li>)}</ol></nav>
    </div>
    {tab !== 'config' && !(tab === 'tasks' && params.get('run')) && !!apps.length && <div className="project-filter-bar" role="search"><Select aria-label="应用" value={app?.id} placeholder="选择应用" options={apps.map(row => ({ value: row.id, label: row.name || '未命名应用' }))} onChange={value => choose(String(value))} /></div>}
    <div className="project-workbench-panel"><ErrorBoundary resetKey={`${projectId}:${appId}:${params.toString()}`} label="项目面板"><Suspense fallback={<Skeleton active />}><div key={`${projectId}:${appId}:${tab}`} className="project-panel-content">{panel}</div></Suspense></ErrorBoundary></div>
  </div>
}
