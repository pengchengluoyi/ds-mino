import './ApplicationLogic.css'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, EmptyState, Skeleton, errText } from '@/ui'
import { LoginEvidencePolicyPanel } from '../config/LoginEvidencePolicyPanel'
import { projectHref } from '../workbench/projectNavigation'
import { RepoBrowser } from './RepoBrowser'
import { useCheckout } from './useCheckout'

export function ApplicationLogicPanel({ projectId, appId = '' }: { projectId: string; appId?: string }) {
  const [params] = useSearchParams()
  const checkout = useCheckout(projectId, appId)
  const login = params.get('logicSection') === 'login'
  if (!projectId) return <EmptyState title="缺少项目归属" />
  if (checkout.repo.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
  if (checkout.repo.isError) return <Alert type="error" message={errText(checkout.repo.error)} action={<Button onClick={() => void checkout.repo.refetch()}>重试</Button>} />
  if (!checkout.configured || !checkout.ready) {
    if (login) return appId ? <LoginEvidencePolicyPanel key={appId} appId={appId} /> : <EmptyState title="选择应用" />
    return <EmptyState title="仓库未就绪" hint={checkout.repo.data?.workspace?.error || undefined} action={<Link to={projectHref(projectId, { tab: 'config' })}>脚本仓库</Link>} />
  }
  if ((checkout.filesLoading || checkout.pagesQuery.isLoading) && !login) return <Skeleton active paragraph={{ rows: 8 }} />
  const caseIdForPath = (path: string) => checkout.cases.data?.find(row => String(row.script_path || '').replace(/\\/g, '/') === path)?.case_id || ''
  return <section className="app-logic" aria-label="应用逻辑">
    <header className="config-workspace-heading"><h1>应用逻辑</h1></header>
    {checkout.pagesQuery.isError ? <Alert type="error" message={errText(checkout.pagesQuery.error)} action={<Button onClick={() => void checkout.pagesQuery.refetch()}>重试</Button>} /> : null}
    {checkout.tree.isError ? <Alert type="error" message={errText(checkout.tree.error)} action={<Button onClick={() => void checkout.tree.refetch()}>重试</Button>} /> : null}
    <RepoBrowser projectId={projectId} appId={appId} files={checkout.files} pages={checkout.pages} caseIdForPath={caseIdForPath} />
  </section>
}
