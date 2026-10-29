import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PlatformInput } from '@/constants/appPlatforms'
import { useSession } from '@/lib/session'
import { useSearchParams } from 'react-router-dom'
import { CircleSlash, Search, TriangleAlert, Upload } from 'lucide-react'
import {
  Button, Drawer, DataTable, EmptyState, Input, Modal, PageHeader, Select, Segmented, Skeleton, StatusPill, errText, useFeedback,
  type DataColumn,
} from '@/ui'
import { deleteProjectCases, type CaseRow } from '@/api/projectCases'
import { SavedCaseReadingView } from './SavedCaseReadingView'
import { CasePreviewLegend } from './CaseScriptSections'
import { CaseAutomationBadge } from './CaseAutomationBadge'
import { RunBar, type DispatchedRun } from './RunBar'
import { CasePreview } from './CasePreview'
import { caseKeys, useCasePage, useLastResults, useProjectCase, useProjectCases, type LastResult } from './queries'
import { scriptModule } from './scriptPath'
import { beginListNavigation, useListPerformance } from '../workbench/performance'

const CaseImportDialog = lazy(() => import('./CaseImportDialog').then(module => ({ default: module.CaseImportDialog })))

type ResultFilter = 'all' | 'failed' | 'never'

const EMPTY_RESULTS: Record<string, LastResult> = {}
const EMPTY_CASES: CaseRow[] = []

/** 用例清单。选择后可重新编译或删除。 */
type CasesPanelProps = { appId: string; projectId: string; platforms?: PlatformInput }
export function CasesPanel(props: CasesPanelProps) {
  const accountId = useSession(state => state.user?.user_id || '')
  const [importOpen, setImportOpen] = useState(false)
  const [importLoaded, setImportLoaded] = useState(false)
  const [importSession, setImportSession] = useState(0)
  useEffect(() => { setImportOpen(false); setImportLoaded(false) }, [props.projectId, accountId])
  return <>
    <CasesPanelContent {...props} onImport={() => { setImportSession(value => value + 1); setImportLoaded(true); setImportOpen(true) }} />
    {importLoaded && <Suspense fallback={importOpen ? <Modal open title="正在打开用例导入" footer={null} onCancel={() => setImportOpen(false)}><Skeleton active paragraph={{ rows: 3 }} /></Modal> : null}>
      <CaseImportDialog key={`${props.projectId}:${props.appId}:${accountId}:${importSession}`} projectId={props.projectId} appId={props.appId} open={importOpen} onClose={() => setImportOpen(false)} />
    </Suspense>}
  </>
}
function CasesPanelContent({ appId, projectId, onImport }: CasesPanelProps & { onImport: () => void }) {
  const fb = useFeedback()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()

  const moduleKey = params.get('caseModule') || ''
  const kw = params.get('caseSearch') || ''
  const resultValue = params.get('caseResult') || 'all'
  const resultFilter: ResultFilter = resultValue === 'failed' || resultValue === 'never' ? resultValue : 'all'
  const pageValue = Number(params.get('casePage'))
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.trunc(pageValue) || 1) : 1
  const sizeValue = Number(params.get('caseSize'))
  const size = [20, 50, 100, 200].includes(sizeValue) ? sizeValue : 50
  const settledSearch = useDebouncedValue(kw)
  const cases = useCasePage(projectId, { appId, page, size, search: settledSearch, module: '', result: resultFilter })
  const allCases = useProjectCases(projectId)
  const rows = cases.data?.items ?? EMPTY_CASES
  const pathById = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of allCases.data ?? EMPTY_CASES) map.set(row.case_id, String(row.script_path || ''))
    return map
  }, [allCases.data])
  const pathOf = (row: CaseRow) => pathById.get(row.case_id) ?? String(row.script_path || '')
  const moduleRows = useMemo(() => {
    if (!moduleKey) return null
    const needle = settledSearch.trim().toLowerCase()
    return (allCases.data ?? EMPTY_CASES).filter(row => {
      if (scriptModule(String(row.script_path || '')) !== moduleKey) return false
      if (!needle) return true
      return `${row.title || ''} ${row.case_id} ${row.script_path || ''} ${row.module || ''}`.toLowerCase().includes(needle)
    })
  }, [moduleKey, settledSearch, allCases.data])
  useListPerformance(appId, 'cases', cases.isSuccess && !params.get('case'), cases.isError, !!cases.data,
    JSON.stringify([page, size, kw, moduleKey, resultFilter]))
  const resultIds = moduleRows
    ? (resultFilter === 'all' ? moduleRows.slice((page - 1) * size, page * size) : moduleRows).map(row => row.case_id)
    : rows.map(row => row.case_id)
  const lastResults = useLastResults(appId, resultIds)
  const moduleVisible = useMemo(() => {
    if (!moduleRows) return null
    if (resultFilter === 'all' || !lastResults.isSuccess) return moduleRows
    return moduleRows.filter(row => {
      const last = lastResults.data?.[row.case_id]
      return resultFilter === 'never' ? !last : last?.status === 'fail'
    })
  }, [moduleRows, resultFilter, lastResults.isSuccess, lastResults.data])
  const tableRows = useMemo(() => {
    const scriptPath = (row: CaseRow) => pathById.get(row.case_id) ?? String(row.script_path || '')
    const source = moduleVisible ? moduleVisible.slice((page - 1) * size, page * size) : rows
    return [...source].sort((a, b) => scriptModule(scriptPath(a)).localeCompare(scriptModule(scriptPath(b)), 'zh') || String(a.title || '').localeCompare(String(b.title || ''), 'zh'))
  }, [moduleVisible, page, size, rows, pathById])
  const total = moduleVisible ? moduleVisible.length : (cases.data?.total || 0)
  const moduleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of allCases.data ?? EMPTY_CASES) {
      const name = scriptModule(String(row.script_path || ''))
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    return [...counts].sort((a, b) => a[0].localeCompare(b[0], 'zh')).map(([name, count]) => ({ value: name, label: `${name} · ${count}` }))
  }, [allCases.data])

  const updateFilters = (patch: Record<string, string>, resetPage = true) => {
    beginListNavigation(appId, 'cases')
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete('case')
    if (resetPage) next.delete('casePage')
    setParams(next, { replace: true })
  }
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(total / size))
    const settled = moduleVisible ? !allCases.isFetching : cases.isSuccess && !cases.isFetching
    if (settled && page > pages) {
      const next = new URLSearchParams(params)
      next.set('casePage', String(pages))
      setParams(next, { replace: true })
    }
  }, [moduleVisible, allCases.isFetching, cases.isSuccess, cases.isFetching, total, page, size, params, setParams])
  const [selected, setSelected] = useState<React.Key[]>([])
  const [selectionLabels, setSelectionLabels] = useState<Record<string, string>>({})
  useEffect(() => { if (tableRows.length) setSelectionLabels(prev => ({ ...prev, ...Object.fromEntries(tableRows.map(row => [row.case_id, row.title || row.case_id])) })) }, [tableRows])
  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteProjectCases(projectId, ids),
    onSuccess: (_res, ids) => {
      setSelected(prev => prev.filter(id => !ids.includes(String(id))))
      if (ids.includes(params.get('case') || '')) {
        const next = new URLSearchParams(params)
        next.delete('case')
        setParams(next, { replace: true })
      }
      void qc.invalidateQueries({ queryKey: caseKeys.list(projectId) })
      fb.ok(`已删除 ${ids.length} 条用例`)
    },
    onError: (error) => fb.fail(errText(error, '删除失败')),
  })
  const removeSelected = async () => {
    const ids = selected.map(String)
    if (!ids.length) return
    const ok = await fb.confirm({
      title: `删除选中的 ${ids.length} 条用例？`,
      content: <div><p>删除后不能从这里恢复。包含不在当前页的已选用例，请核对完整清单。</p><ul style={{ maxHeight: 280, overflow: 'auto', paddingLeft: 20 }}>{ids.map(id => <li key={id} style={{ overflowWrap: 'anywhere' }}>{selectionLabels[id] || '名称未读取'} · {id}</li>)}</ul></div>,
      okText: '删除',
      danger: true,
    })
    if (ok) remove.mutate(ids)
  }
  const [dispatched, setDispatched] = useState<DispatchedRun | null>(null)
  const previewId = params.get('case') || ''
  const preview = useProjectCase(projectId, previewId)

  // 使用稳定空对象，避免列表列配置在每次渲染时重建。
  const results = lastResults.data ?? EMPTY_RESULTS

  const columns = useMemo<DataColumn<CaseRow>[]>(() => [
    {
      key: 'title', title: '用例', width: '18%', alwaysVisible: true,
      render: (_: unknown, row, index) => {
        const last = results[row.case_id]
        const scriptPath = (item: CaseRow) => pathById.get(item.case_id) ?? String(item.script_path || '')
        const path = scriptPath(row)
        const moduleName = scriptModule(path)
        const previous = typeof index === 'number' && index > 0 ? scriptModule(scriptPath(tableRows[index - 1])) : ''
        return <div className="case-identity">
          {moduleName !== previous ? <div className="case-module-head">{moduleName}</div> : null}
          <div className="case-identity-title">{row.title || '未命名用例'}</div>
          <div className="case-identity-meta">{row.platform || '未指定'}</div>
          <code className="case-script-path">{path || '未设置'}</code>
          <div className="case-identity-badges">
            <CaseAutomationBadge row={row} />
            <StatusPill status={last?.status === 'pass' ? 'pass' : last?.status === 'fail' ? 'fail' : 'muted'}>{lastResults.isError ? '结果暂不可用' : !lastResults.isSuccess ? '读取结果中' : !last ? '未跑过' : last.status === 'pass' ? '通过' : last.status === 'fail' ? '失败' : '其他'}</StatusPill>
          </div>
          {last?.status === 'fail' && last.reason ? <div className="case-identity-reason">{last.reason}</div> : null}
          <div><Button size="small" onClick={() => {
            const next = new URLSearchParams(params)
            next.set('case', row.case_id)
            setParams(next)
          }}>用例详情</Button></div>
        </div>
      },
    },
    {
      key: 'preview', title: '原文与解析', width: '82%', alwaysVisible: true,
      render: (_: unknown, row) => <SavedCaseReadingView key={row.case_id} projectId={projectId} row={row} />,
    },
  ], [projectId, params, setParams, results, lastResults.isError, lastResults.isSuccess, tableRows, pathById])

  if (!projectId) {
    return (
      <Card>
        <EmptyState
          icon={<TriangleAlert size={28} strokeWidth={1.5} style={{ color: 'var(--w-warn)' }} />}
          title="缺少项目信息"
          hint="从项目列表重新进入。"
        />
      </Card>
    )
  }

  if ((!moduleKey && cases.isLoading) || (moduleKey && (allCases.isLoading || (resultFilter !== 'all' && lastResults.isLoading)))) return <Skeleton active paragraph={{ rows: 8 }} title={{ width: 160 }} />


  if (cases.isSuccess && !cases.data?.total && !params.get('case') && !kw && !moduleKey && resultFilter === 'all') {
    return (
      <section className="w-content-page">
        <PageHeader title="用例" />
        <Card>
          <EmptyState
            icon={<CircleSlash size={28} strokeWidth={1.5} />}
            title="这个项目还没有用例"
            action={<Button size="small" icon={<Upload size={13} />} onClick={onImport}>导入用例</Button>}
          />
        </Card>
      </section>
    )
  }

  return (
    <div className="case-library flex flex-col" style={{ minHeight: 0, height: '100%' }}>
      <PageHeader title="用例" count={total} extra={<Button icon={<Upload size={14} />} onClick={onImport}>导入用例</Button>} />
      {dispatched && <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 'var(--w-space-3)', padding: '10px 14px', borderRadius: 'var(--w-radius-lg)', background: 'var(--w-running-bg)', border: '1px solid var(--w-running)' }}>
        <StatusPill status="running">已下发</StatusPill>
        <span style={{ fontWeight: 650 }}>已下发 {dispatched.caseCount} 条用例</span>
        <span style={{ flex: 1 }} />
        <Button size="small" onClick={() => { const next = new URLSearchParams(params); next.set('tab', 'tasks'); next.set('run', dispatched.runId); next.delete('case'); setParams(next) }}>查看任务</Button>
        <Button size="small" type="text" onClick={() => setDispatched(null)}>知道了</Button>
      </div>}
      <div className="case-library-filters">
        <Select aria-label="模块筛选" value={moduleKey} onChange={value => updateFilters({ caseModule: value })} options={[{ value: '', label: '全部模块' }, ...moduleOptions]} />
        <Input
          allowClear
          size="small"
          prefix={<Search size={13} style={{ color: 'var(--w-text-quaternary)' }} />}
          placeholder="搜索用例"
          value={kw}
          onChange={(e) => updateFilters({ caseSearch: e.target.value })}
          style={{ width: 200 }}
        />
        <Segmented
          size="small"
          value={resultFilter}
          onChange={(value) => updateFilters({ caseResult: String(value) })}
          options={[
            { value: 'all', label: '全部' },
            { value: 'failed', label: '上次失败' },
            { value: 'never', label: '未跑过' },
          ]}
        />
      </div>
          <DataTable<CaseRow>
            viewId="testing.cases"
            toolbar={<div className="case-library-toolbar"><CasePreviewLegend /><strong>用例清单 · {tableRows.length}</strong></div>}
            columns={columns}
            dataSource={tableRows}
            rowKey="case_id"
            rowLabel={row => row.title || '未命名用例'}
            renderCard={row => {
              const last = results[row.case_id]
              const path = pathOf(row)
              return <><strong className="w-record-title">{row.title || '未命名用例'}</strong><div className="w-record-meta">{scriptModule(path)}{row.platform ? ` · ${row.platform}` : ''}</div><code className="case-script-path">{path || '未设置'}</code><StatusPill status={last?.status === 'pass' ? 'pass' : last?.status === 'fail' ? 'fail' : 'muted'}>{lastResults.isError ? '结果暂不可用' : !lastResults.isSuccess ? '读取结果中' : !last ? '未跑过' : last.status === 'pass' ? '通过' : last.status === 'fail' ? '失败' : '其他'}</StatusPill><Button size="small" onClick={() => { const next = new URLSearchParams(params); next.set('case', row.case_id); setParams(next) }}>用例详情</Button><SavedCaseReadingView key={row.case_id} projectId={projectId} row={row} /></>
            }}
            loading={cases.isFetching && !cases.data}
            error={cases.isError ? cases.error : undefined}
            onRetry={() => void cases.refetch()}
            pagination={{ page, pageSize: size, total,
              onChange: (next, nextSize) => updateFilters({ casePage: String(next), caseSize: String(nextSize) }, false) }}
            fill
            virtualThreshold={Infinity}
            selection={{
              selectedKeys: selected,
              onChange: setSelected,
              actions: null,
            }}
            emptyTitle="没有匹配的用例"
          />
      <Drawer title="用例详情" width="min(1080px, 100vw)" open={!!previewId} onClose={() => { const next = new URLSearchParams(params); next.delete('case'); setParams(next, { replace: true }) }} destroyOnHidden>
        {previewId && (preview.isPending ? <Skeleton active paragraph={{ rows: 8 }} /> : preview.isError ? <EmptyState title="用例详情读取失败" hint={errText(preview.error)} action={<Button onClick={() => void preview.refetch()}>重试</Button>} /> : <CasePreview key={previewId} projectId={projectId} row={preview.data!} />)}
      </Drawer>
      {lastResults.isError ? <span role="alert" style={{ color: 'var(--w-warn)', fontSize: 'var(--w-font-sm)' }}>上次结果读取失败。<Button size="small" type="text" onClick={() => void lastResults.refetch()}>重试</Button></span> : null}
      {allCases.isError ? <span role="alert" style={{ color: 'var(--w-warn)', fontSize: 'var(--w-font-sm)' }}>脚本路径读取失败。<Button size="small" type="text" onClick={() => void allCases.refetch()}>重试</Button></span> : null}

      <RunBar
        appId={appId}
        projectId={projectId}
        selected={selected.map(String)}
        labels={selectionLabels}
        currentPageIds={tableRows.map(row => row.case_id)}
        onClear={() => setSelected([])}
        deleting={remove.isPending}
        onDelete={() => void removeSelected()}
        onDispatched={(run) => { setDispatched(run); setSelected([]) }}
      />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--w-surface)', border: '1px solid var(--w-border)', borderRadius: 'var(--w-radius-lg)' }}>
      {children}
    </div>
  )
}
