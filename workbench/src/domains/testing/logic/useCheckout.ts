import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getScriptRepo, listCheckoutFiles, scriptRepoKey } from '@/api/scriptRepo'
import { useProjectCases } from '../cases/queries'
import { repoRoot } from '../cases/scriptPath'
import { listRepoPages, type RepoPage } from './repoPage'

const EMPTY_PAGES: RepoPage[] = []

export function useCheckout(projectId: string, appId: string) {
  const repo = useQuery({
    queryKey: scriptRepoKey(projectId),
    enabled: !!projectId,
    queryFn: () => getScriptRepo(projectId),
  })
  const configured = Boolean(repo.data?.url)
  const ready = configured && Boolean(repo.data?.workspace?.ready)
  const pages = useQuery({
    queryKey: ['repo-pages', projectId, appId],
    enabled: ready && !!appId,
    queryFn: () => listRepoPages(projectId, appId),
  })
  const tree = useQuery({
    queryKey: ['repo-tree', projectId],
    enabled: ready,
    queryFn: () => listCheckoutFiles(projectId),
  })
  const cases = useProjectCases(projectId, ready)
  const pageRows = pages.data ?? EMPTY_PAGES
  const files = useMemo(() => {
    if (!tree.isSuccess) return []
    const extra = pageRows.map(page => page.path)
    if (tree.data) return unique([...tree.data, ...extra])
    const fromCases = (cases.data || []).map(row => String(row.script_path || '')).filter(path => repoRoot(path))
    return unique([...fromCases, ...extra])
  }, [tree.isSuccess, tree.data, cases.data, pageRows])
  const filesLoading = ready && (tree.isPending || (tree.isSuccess && tree.data == null && cases.isLoading))
  return { repo, configured, ready, pages: pageRows, pagesQuery: pages, files, filesLoading, tree, cases }
}

function unique(paths: string[]) {
  return [...new Set(paths.map(path => path.replace(/\\/g, '/').replace(/^\.\//, '')).filter(path => repoRoot(path) && path.split('/').pop()?.includes('.')))]
}
