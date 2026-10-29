import { screenshotSource } from '@/lib/screenshot'
import type { SessionEvent } from '@/api/sessions'
import { Button, EmptyState, StatusPill, type StatusKind } from '@/ui'
import { formatResourceFailure } from '../resources/resourceFailure'
import './SessionTimeline.css'

type AttributionRow = {
  kind?: string
  status?: string
  attribution_class?: string
  attribution_label?: string
  layer?: string
  reason_code?: string
  turn?: number
}
type Attribution = {
  first_blocker?: AttributionRow
  latest_error?: AttributionRow
  stop_reason?: AttributionRow & { kind?: string; status?: string }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const STOP_KIND: Record<string, string> = {
  dependency_blocked: '前置依赖阻塞',
  required_operation_unverified: '关键操作未核验',
  login_submission_unverified: '登录提交未核验',
  target_resolution_failed: '目标定位失败',
  assertion_mismatch: '断言不匹配',
  timeout_before_dispatch: '派发前超时',
}

const FIVE_STATE: Record<string, { kind: StatusKind; label: string }> = {
  pass: { kind: 'pass', label: '通过' },
  fail: { kind: 'fail', label: '失败' },
  skipped: { kind: 'cancel', label: '跳过' },
  blocked: { kind: 'warn', label: '受阻' },
  declined: { kind: 'cancel', label: '拒绝' },
}

const stateOf = (raw: unknown): { kind: StatusKind; label: string } => {
  const status = String(raw || '').trim().toLowerCase()
  return FIVE_STATE[status] || (status === 'running' || status === 'in_progress'
    ? { kind: 'running', label: '执行中' }
    : status === 'unverified' ? { kind: 'warn', label: '未核验' } : { kind: 'muted', label: status || '未知' })
}

const attrLabel = (row?: AttributionRow) => {
  if (!row?.attribution_class) return ''
  const label = row.attribution_label || ({ A: '平台缺口', B: '程序缺口', C: '守卫误拦' }[row.attribution_class] || row.attribution_class)
  return `${row.attribution_class} ${label}`
}
const attrKind = (row?: AttributionRow): StatusKind => row?.attribution_class === 'B' ? 'fail' : row?.attribution_class ? 'warn' : 'muted'

const stepLabel = (payload: Record<string, unknown>) => {
  const step = Number(payload.step)
  if (Number.isFinite(step) && step > 0) return `步骤 ${step}`
  const caseStep = Number(payload.case_step)
  if (Number.isFinite(caseStep) && caseStep > 0) return `用例步骤 ${caseStep}`
  return '前置'
}

const timeLabel = (raw?: string) => {
  const date = raw ? new Date(raw) : null
  return date && Number.isFinite(date.getTime()) ? date.toLocaleTimeString('zh-CN', { hour12: false }) : '—'
}

const rowSummary = (payload: Record<string, unknown>) => {
  const text = ['summary', 'thought', 'message', 'capability_id'].map((key) => payload[key]).find((value) => typeof value === 'string' && value)
  return typeof text === 'string' ? text : '未记录摘要'
}

const frameThumbs = (payload: Record<string, unknown>) => {
  const raw = payload.frames
  if (!Array.isArray(raw) || raw.length < 2) return []
  return raw.flatMap((item) => {
    const thumb = screenshotSource(record(item).thumb)
    return thumb ? [thumb] : []
  })
}

const timelineEvent = (event: SessionEvent) => {
  if (event.type !== 'stream/emit' && event.type !== 'tool/result') return false
  const payload = record(event.payload)
  if (!payload.status && !payload.result_status) return false
  return !['start', 'thumb', 'done'].includes(String(payload.phase || ''))
}

export function SessionTimeline({ events, attribution, sessionStatus, eventTotal, hasMore, loadMore, onOpenEvent }: {
  events: SessionEvent[]
  attribution?: Attribution
  sessionStatus?: string
  eventTotal: number
  hasMore: boolean
  loadMore: () => void
  onOpenEvent: (event: SessionEvent) => void
}) {
  const emitted = events.filter((event) => event.type === 'stream/emit').filter(timelineEvent)
  const rows = emitted.length ? emitted : events.filter(timelineEvent)
  const overall = attribution?.stop_reason || attribution?.first_blocker || attribution?.latest_error
  const overallText = attrLabel(overall)
    || (overall?.kind ? STOP_KIND[overall.kind] || overall.kind : '')
    || (overall?.reason_code ? formatResourceFailure({ reason_code: overall.reason_code }) || overall.reason_code : '')
    || overall?.status || ''
  const overallKind: StatusKind = overall?.attribution_class ? attrKind(overall)
    : overall?.status === 'fail' || overall?.status === 'failed' ? 'fail'
      : overall ? 'warn' : 'muted'
  const counts = rows.reduce<Record<string, number>>((acc, event) => {
    const key = String(record(event.payload).result_status || record(event.payload).status || 'unknown').toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return <section className="session-timeline" aria-label="执行时间线">
    <header className="session-timeline-head">
      <div>
        <h3>执行时间线</h3>
      </div>
      {overallText ? <StatusPill status={overallKind}>{overallText.startsWith('未分类') ? overallText : attrLabel(overall) ? overallText : `未分类 · ${overallText}`}</StatusPill>
        : <StatusPill status={sessionStatus === 'pass' ? 'pass' : 'muted'}>{sessionStatus === 'pass' ? '通过 · 无失败归因' : '归因未记录'}</StatusPill>}
    </header>
    <div className="session-timeline-counts" aria-label="五态计数">
      {['pass', 'fail', 'skipped', 'blocked', 'declined'].map((key) => <span key={key} data-state={key}>
        {FIVE_STATE[key].label} {counts[key] || 0}
      </span>)}
      {counts.running ? <span data-state="running">执行中 {counts.running}</span> : null}
    </div>
    {!rows.length ? <EmptyState title="暂时没有可展示的步骤" /> : <div className="session-timeline-list">
      {rows.map((event, index) => {
        const payload = record(event.payload)
        const state = stateOf(payload.result_status || payload.status)
        const attr = payload as AttributionRow
        const frames = frameThumbs(payload)
        const thumb = frames.at(-1) || screenshotSource(payload.thumb)
        const seq = event.seq ?? index + 1
        return <button type="button" className="session-timeline-row" key={`${seq}-${event.type}-${index}`} onClick={() => onOpenEvent(event)}>
          <span className={`session-timeline-shot${frames.length > 1 ? ' is-group' : ''}`}>{frames.length > 1 ? frames.map((src, frameIndex) => <img key={`${src}:${frameIndex}`} src={src} alt="" loading="lazy" />) : thumb ? <img src={thumb} alt={`${stepLabel(payload)} 执行截图`} loading="lazy" /> : <span>无截图</span>}</span>
          <span className="session-timeline-main">
            <span className="session-timeline-title">
              <strong>{stepLabel(payload)}</strong>
              <span>{String(payload.capability_id || payload.tool || '执行步骤')}</span>
              <StatusPill status={state.kind}>{state.label}</StatusPill>
              {attr.attribution_class ? <StatusPill status={attrKind(attr)}>{attrLabel(attr)}</StatusPill> : null}
            </span>
            <span className="session-timeline-summary">{rowSummary(payload)}</span>
            <span className="session-timeline-meta">
              {frames.length > 1 ? `一组 ${frames.length} 帧 · ` : ''}{event.phase || '阶段未标记'}
              {Number(payload.case_step) > 0 ? ` · 用例步骤 ${String(payload.case_step)}` : ''}
              {payload.loop_phase ? ` · ${String(payload.loop_phase)}` : ''}
              {payload.intent_id ? ` · ${String(payload.intent_id)}` : ''}
              {attr.reason_code ? ` · ${formatResourceFailure({ reason_code: attr.reason_code }) || String(attr.reason_code)}` : ''}
            </span>
          </span>
          <time className="session-timeline-time" dateTime={event.ts} title={event.ts}>{timeLabel(event.ts)}</time>
        </button>
      })}
    </div>}
    <footer className="session-timeline-footer">
      <span>时间线 {rows.length} 步 · 已加载 {events.length}/{eventTotal} 条事件</span>
      {hasMore ? <Button size="small" onClick={loadMore}>加载更多</Button> : null}
    </footer>
  </section>
}
