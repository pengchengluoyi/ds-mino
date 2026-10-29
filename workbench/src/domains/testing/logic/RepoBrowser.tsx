import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, Skeleton, errText } from '@/ui'
import { readCheckoutFile } from '@/api/scriptRepo'
import type { RepoRoot } from '../cases/scriptPath'
import { LoginEvidencePolicyPanel } from '../config/LoginEvidencePolicyPanel'
import { getRepoPage, type RepoPage } from './repoPage'
import { RepoPageDetail } from './RepoPageDetail'

type Node = { name: string; path: string; file: boolean; children: Node[] }

const ROOTS: RepoRoot[] = ['tests', 'scripts', 'pages']

function buildTree(paths: string[], root: RepoRoot): Node[] {
  const top: Node[] = []
  const ensure = (nodes: Node[], name: string, path: string, file: boolean) => {
    let child = nodes.find(item => item.name === name)
    if (!child) {
      child = { name, path, file, children: [] }
      nodes.push(child)
    }
    if (file) child.file = true
    return child
  }
  for (const path of paths.filter(item => item === root || item.startsWith(`${root}/`))) {
    const parts = path.split('/').slice(1)
    let nodes = top
    let acc: string = root
    parts.forEach((part, index) => {
      acc = `${acc}/${part}`
      const file = index === parts.length - 1
      const child = ensure(nodes, part, acc, file)
      nodes = child.children
    })
  }
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => Number(a.file) - Number(b.file) || a.name.localeCompare(b.name, 'zh'))
    nodes.forEach(node => sort(node.children))
  }
  sort(top)
  return top
}

function TreeNodes({ nodes, selected, onOpen }: { nodes: Node[]; selected: string; onOpen: (path: string) => void }) {
  return <>{nodes.map(node => node.file ? <button type="button" key={node.path} className={`app-logic-file${selected === node.path ? ' is-active' : ''}`} aria-current={selected === node.path ? 'true' : undefined} onClick={() => onOpen(node.path)}>{node.name}</button> : <div key={node.path}><p className="app-logic-kicker">{node.name}</p><TreeNodes nodes={node.children} selected={selected} onOpen={onOpen} /></div>)}</>
}

export function RepoBrowser({ projectId, appId, files, pages, caseIdForPath }: {
  projectId: string
  appId: string
  files: string[]
  pages: RepoPage[]
  caseIdForPath: (path: string) => string
}) {
  const [params, setParams] = useSearchParams()
  const login = params.get('logicSection') === 'login'
  const selected = params.get('logicFile') || ''
  const listed = pages.find(page => page.path === selected)
  useEffect(() => {
    if (login || selected || !pages[0]) return
    const next = new URLSearchParams(params)
    next.set('logicFile', pages[0].path)
    setParams(next, { replace: true })
  }, [login, selected, pages, params, setParams])
  const detail = useQuery({
    queryKey: ['repo-page', projectId, appId, listed?.page_key || ''],
    enabled: Boolean(appId && listed?.page_key),
    queryFn: () => getRepoPage(projectId, appId, listed!.page_key),
  })
  const page = detail.data || listed
  const caseId = selected ? caseIdForPath(selected) : ''
  const text = useQuery({
    queryKey: ['repo-file', projectId, selected, caseId],
    enabled: Boolean(selected) && !login,
    retry: false,
    queryFn: () => readCheckoutFile(projectId, selected, caseId),
  })
  const openFile = (path: string) => {
    const next = new URLSearchParams(params)
    next.delete('logicSection')
    next.set('logicFile', path)
    setParams(next, { replace: true })
  }
  const openLogin = () => {
    const next = new URLSearchParams(params)
    next.set('logicSection', 'login')
    next.delete('logicFile')
    setParams(next, { replace: true })
  }
  return <div className="app-logic-body">
    <nav className="app-logic-nav" aria-label="仓库目录">
      {ROOTS.map(root => <div key={root}>
        <p className="app-logic-kicker">{root}</p>
        <TreeNodes nodes={buildTree(files, root)} selected={selected} onOpen={openFile} />
      </div>)}
      <p className="app-logic-kicker">登录</p>
      <button type="button" className={`app-logic-item${login ? ' is-active' : ''}`} aria-current={login ? 'page' : undefined} onClick={openLogin}><span>登录校验</span></button>
    </nav>
    <div className="app-logic-detail">
      {login ? (appId ? <LoginEvidencePolicyPanel key={appId} appId={appId} /> : <EmptyState title="选择应用" />) : selected ? <>
        {page ? <RepoPageDetail page={page} /> : <h2><code>{selected}</code></h2>}
        {detail.isError ? <p role="alert">{errText(detail.error)}</p> : null}
        {!page && text.isPending ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {text.isSuccess && text.data ? <pre className="case-script-source">{text.data}</pre> : null}
        {!page && text.isError ? <EmptyState title={errText(text.error, '工作目录里还没有这个文件')} /> : null}
      </> : <EmptyState title="还没有页面" />}
    </div>
  </div>
}
