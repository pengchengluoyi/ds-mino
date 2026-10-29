import { projectHref } from '../workbench/projectNavigation'
import { recordAudit } from '@/domains/admin/audit/auditLog'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Checkbox, Input, Select, errText } from '@/ui'
import { probeV5Control, saveV5Control, type V5Control } from '@/api/v5'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { unwrapOne } from '@/lib/unwrap'
import { assignedPageId, type LogicPage } from './groupControls'

export function ControlEditor({ projectId, appId, control, pages, conflict, onDirtyChange, onSaved }: {
  projectId: string
  appId?: string
  control: V5Control
  pages: LogicPage[]
  conflict: boolean
  onDirtyChange: (dirty: boolean) => void
  onSaved: (pageId: string) => void
}) {
  const qc = useQueryClient()
  const baseline = useRef<V5Control>(control)
  const [stale, setStale] = useState(false)
  const [kind, setKind] = useState('test_id')
  const [value, setValue] = useState('')
  const [name, setName] = useState('')
  const [cardinality, setCardinality] = useState('one')
  const [sensitive, setSensitive] = useState(false)
  const [pageId, setPageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [sn, setSn] = useState('')
  const [url, setUrl] = useState('')
  const [probe, setProbe] = useState<Record<string, unknown> | null>(null)
  const draftDirty = useRef(false)

  const apply = (row: V5Control) => {
    const cfg = row.locator_spec?.playwright
    setKind(cfg?.selector.kind || 'test_id')
    setValue(cfg?.selector.value || '')
    setName(cfg?.selector.name || '')
    setCardinality(cfg?.cardinality || 'one')
    setSensitive(!!row.sensitive)
    setPageId(assignedPageId(row, pages))
    setProbe(null)
    setStale(false)
  }

  useEffect(() => {
    if (baseline.current.control_id === control.control_id && draftDirty.current) {
      setStale(baseline.current.revision !== control.revision)
      return
    }
    baseline.current = control
    apply(control)
  }, [control, pages])

  const spec: V5Control['locator_spec'] = {
    playwright: {
      contract: 'web.locator.v1',
      scope: { kind: 'page', page_id: 'main' },
      selector: { kind, value, ...(kind === 'role' ? { name, exact: true } : kind === 'label' ? { exact: true } : {}) },
      cardinality,
    },
  }
  const saved = baseline.current.locator_spec?.playwright || control.locator_spec?.playwright
  const savedPage = assignedPageId(baseline.current, pages)
  const dirty = !saved || kind !== saved.selector.kind || value !== saved.selector.value
    || name !== (saved.selector.name || '') || cardinality !== saved.cardinality
    || sensitive !== baseline.current.sensitive || pageId !== savedPage
  draftDirty.current = dirty
  useUnsavedChanges(dirty)
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])

  async function save() {
    if (stale) return
    setBusy(true)
    setNotice('')
    try {
      await saveV5Control(projectId, control.control_id, { expected_revision: baseline.current.revision ?? control.revision, locator_spec: spec, sensitive, page_state_id: pageId })
      baseline.current = { ...control, locator_spec: spec, sensitive, revision: baseline.current.revision }
      draftDirty.current = false
      onDirtyChange(false)
      await qc.invalidateQueries({ queryKey: ['v5-controls', projectId] })
      recordAudit('控件保存')
      setNotice('控件已保存，后续执行使用最新定位。')
      onSaved(pageId)
    } catch (error) {
      setNotice(errText(error, '保存失败，请刷新检查版本冲突。'))
    } finally {
      setBusy(false)
    }
  }

  async function observe() {
    if (stale) return
    setBusy(true)
    setNotice('')
    try {
      setProbe(unwrapOne<Record<string, unknown>>(await probeV5Control(projectId, control.control_id, { expected_revision: control.revision, sn, url })) ?? null)
    } catch (error) {
      setNotice(errText(error, '只读探测失败'))
    } finally {
      setBusy(false)
    }
  }

  const pageOptions = [{ value: '', label: '未归页' }, ...pages.map(page => ({ value: page.state_id, label: page.label || page.state_id }))]

  return <div className="app-logic-editor">
    <p className="config-secondary">修订 {control.revision}</p>
    {control.scope !== 'page' && <p role="alert">首期仅支持主页面 scope；此控件需要人工调整作用域，不能静默映射。</p>}
    {stale && <p role="alert">此控件已有新版本，当前草稿保留。请重新读取并核对版本后再提交。</p>}
    <div className="w-form-grid config-control-fields">
      <label>归属页面<Select aria-label="归属页面" disabled={busy} value={pageId} onChange={setPageId} options={pageOptions} /></label>
      <label>定位类型<Select aria-label="定位类型" disabled={busy} value={kind} onChange={setKind} options={['test_id', 'role', 'label', 'css'].map(item => ({ value: item, label: item }))} /></label>
      <label>定位值<Input aria-label="定位值" disabled={busy} value={value} onChange={event => setValue(event.target.value)} /></label>
      {kind === 'role' && <label>准确名称<Input aria-label="准确名称" disabled={busy} value={name} onChange={event => setName(event.target.value)} /></label>}
      <label>目标数量<Select aria-label="目标数量" disabled={busy} value={cardinality} onChange={setCardinality} options={[{ value: 'one', label: '唯一目标' }, { value: 'set', label: '多个目标（仅读取）' }]} /></label>
    </div>
    <Checkbox disabled={busy} checked={sensitive} onChange={event => setSensitive(event.target.checked)}>敏感控件（禁止明文事实与模型输出）</Checkbox>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || stale || conflict || !value.trim() || control.scope !== 'page'} type="primary" onClick={() => void save()}>保存定位</Button>
      <Button disabled={busy || !dirty} onClick={() => { draftDirty.current = false; apply(baseline.current); setNotice('已放弃本控件草稿。') }}>放弃草稿</Button>
    </div>
    <details>
      <summary>只读探测（独立无登录浏览器，不点击或输入）</summary>
      <label>Web 设备标识<Input aria-label="探测设备" placeholder="web节点ID" value={sn} onChange={event => setSn(event.target.value)} /></label>
      <label>受控页面 URL<Input aria-label="探测页面" placeholder="https://..." value={url} onChange={event => setUrl(event.target.value)} /></label>
      <Button disabled={busy || dirty || !sn || !url || conflict} onClick={() => void observe()}>探测已保存定位</Button>
      {dirty && <p>请先保存本次修改，再探测对应版本。</p>}
      {probe && <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(probe, null, 2)}</pre>}
    </details>
    {notice && <p role="status">{notice}</p>}
    {appId && <p><Link to={projectHref(projectId, { tab: 'cases', appId })}>返回用例，核对受影响的执行配置</Link></p>}
  </div>
}
