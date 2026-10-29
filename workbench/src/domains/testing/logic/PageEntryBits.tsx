import './PageEntryPanel.css'
import { StatusPill } from '@/ui'
import type { PageEntry } from '@/api/navEntries'

export const ENTRY_SOURCE: Record<string, string> = { capture: '采集', case: '用例', runtime: '运行', prior: '常识', manual: '人工' }
export const ENTRY_STATUS: Record<string, string> = { active: '可用', stale: '待复核', rejected: '已排除' }
export const GAP_KIND: Record<string, string> = {
  no_entry: '没有入口',
  target_only: '只有目标页',
  trigger_not_visible: '入口不在当前屏',
  arrival_mismatch: '到达不符',
  fingerprint_drift: '指纹漂移',
}

export const entryPct = (value: number) => `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`
export const stateLabel = (id: string) => id ? id.replace(/^page\./, '') : '任意页'

export function EntryDetail({ entry }: { entry: PageEntry }) {
  const selectors = entry.trigger?.locators || []
  const prior = entry.preconditions?.prior as { note?: string; rule_id?: string } | undefined
  return <div className="entry-detail">
    <div className="entry-detail-title">
      <div><h3>{entry.target_label || entry.target_state_id || '未命名目标页'}</h3><p className="config-secondary">{stateLabel(entry.from_state_id)} → {entry.target_state_id || entry.target_label}</p></div>
      <StatusPill status={entry.status === 'active' ? 'pass' : 'warn'}>{ENTRY_STATUS[entry.status] || entry.status}</StatusPill>
    </div>
    <dl>
      <dt>入口动作</dt><dd>{entry.trigger?.text || '未记录可点击文案'}</dd>
      <dt>来源</dt><dd>{ENTRY_SOURCE[entry.source_kind] || entry.source_kind} · 置信度 {entryPct(entry.confidence)}</dd>
      <dt>定位器优先级</dt><dd>{selectors.length ? <ol>{selectors.map((row, index) => <li key={`${row.by}:${row.value}:${index}`}><code>{row.by}</code> = {row.value}</li>)}</ol> : '仅入口文案'}</dd>
      <dt>到达条件</dt><dd><code>{JSON.stringify(entry.expect || {})}</code></dd>
      {prior?.note && <><dt>常识顺序</dt><dd>{prior.note}{prior.rule_id ? <small>（{prior.rule_id}）</small> : null}</dd></>}
      <dt>DOM 结构指纹</dt><dd>{entry.fingerprint_hash ? <><code>{entry.fingerprint_hash}</code><p className="config-secondary">节点 {entry.fingerprint.node_count || 0} · {(entry.fingerprint.anchors || []).slice(0, 6).map(row => row.label || row.rid).filter(Boolean).join(' / ') || '无锚点'}</p></> : '未采集'}</dd>
      <dt>运行结果</dt><dd>成功 {entry.success_count} · 失败 {entry.fail_count} · 连续失败 {entry.fail_streak}</dd>
    </dl>
    <h4>来源证据</h4>
    {entry.evidence.length ? <ul className="entry-evidence">{entry.evidence.map(row => {
      const ruleId = typeof row.data?.rule_id === 'string' ? row.data.rule_id : ''
      return <li key={`${row.source_kind}:${row.source_ref}:${row.relation}`}><span>{ENTRY_SOURCE[row.source_kind] || row.source_kind} · {row.source_ref}{ruleId ? ` · ${ruleId}` : ''}</span><p>{row.quote || '—'}</p></li>
    })}</ul> : <p className="config-secondary">没有证据</p>}
  </div>
}
