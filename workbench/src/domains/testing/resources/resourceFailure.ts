/** Claim / device-busy failures keep a coarse reason and add ledger detail.
 *  Field names follow Nexus (MinoNexus write-safety exit): reason, reason_code, reason_detail.
 */

const GLOSS: Record<string, string> = {
  resource_busy: '资源被占用',
  resource_isolated: '资源已隔离',
  resource_account_lease_held: '账号租约仍被持有',
  resource_device_lease_held: '设备租约仍被持有',
  resource_held_by_other_attempt: '资源被其他执行占用',
  resource_state_isolated: '资源处于隔离状态',
  resource_lease_expired: '资源租约已过期',
  resource_lease_lost: '资源租约已失效',
  resource_lease_unavailable: '资源租约不可用',
  resource_reset_verification_required: '尚缺资源复位核验',
  resource_blocked: '资源被阻塞',
  resource_wait_deadline_exceeded: '资源等待已截止',
  write_outcome_unknown: '写入结果未知',
  write_safety_isolated: '写安全隔离未解除',
  stop_evidence_required: '尚缺停止证据',
  baseline_package_missing: '缺少被测包基线',
  nothing_open: '没有未结算的写动作',
  task_still_running: '任务仍在运行',
  task_not_found: '找不到任务',
}

const RESOURCE_CODES = new Set(Object.keys(GLOSS))

const DETAIL_LABEL: Record<string, string> = {
  holder_run_id: '持有任务',
  ledger_state: '账本',
  resource_key: '资源',
  state: '资源状态',
  epoch: '纪元',
  sn: '设备',
  package_id: '被测包',
  open_actions: '未结算动作',
}

export interface IsolationExitInfo {
  committed?: boolean
  blocked_reason?: string
  verification_kind?: string
  resource_reset_verified?: boolean
  account_leases_released?: string[]
  account_leases_held?: string[]
  device_resources_released?: string[]
}

const text = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export const isResourceCode = (value: unknown): boolean => RESOURCE_CODES.has(text(value))

export const codeWithGloss = (code: string): string => {
  const label = GLOSS[code]
  return label ? `${label}（${code}）` : code
}

export function detailParts(detail: unknown): string[] {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return []
  const row = detail as Record<string, unknown>
  const parts: string[] = []
  if (row.holder_isolated === true) parts.push('持有方仍隔离')
  const action = row.action_ref
  if (action && typeof action === 'object' && !Array.isArray(action)) {
    const ref = action as Record<string, unknown>
    const run = text(ref.run_id)
    const step = text(ref.step_idx)
    if (run || step) parts.push(`动作 ${[run, step].filter(Boolean).join(':')}`)
  }
  for (const [key, label] of Object.entries(DETAIL_LABEL)) {
    const value = row[key]
    if (value === undefined || value === null || value === '' || value === 0 || value === false || typeof value === 'object') continue
    parts.push(`${label} ${text(value)}`)
  }
  for (const [key, value] of Object.entries(row)) {
    if (key in DETAIL_LABEL || key === 'holder_isolated' || key === 'action_ref' || key === 'reason_code') continue
    if (value === undefined || value === null || value === '' || value === 0 || value === false || typeof value === 'object') continue
    parts.push(`${key} ${text(value)}`)
  }
  return parts
}

const mentions = (seen: string, value: string) => !!value && seen.includes(value)

/** Human line for reason_code plus reason_detail. Empty when this is not a resource failure. */
export function formatResourceFailure(input: {
  reason?: unknown
  reason_code?: unknown
  reason_detail?: unknown
}, seen = ''): string {
  const reason = text(input.reason)
  const code = text(input.reason_code)
  const parts = detailParts(input.reason_detail)
  const resource = isResourceCode(code) || isResourceCode(reason)
    || parts.some((part) => part.startsWith('持有任务') || part.startsWith('资源 ') || part.startsWith('账本'))
  if (!resource) return ''
  const out: string[] = []
  const push = (line: string) => {
    if (!line || mentions(seen, line) || out.includes(line)) return
    out.push(line)
  }
  if (code && !mentions(seen, code)) push(codeWithGloss(code))
  else if (code && GLOSS[code] && !mentions(seen, GLOSS[code])) push(GLOSS[code])
  if (reason && reason !== code && isResourceCode(reason) && !mentions(seen, reason)) push(`粗原因 ${reason}`)
  for (const part of parts) {
    const raw = part.replace(/^(持有任务|资源状态|未结算动作|账本|资源|纪元|设备|被测包|动作) /, '')
    if (mentions(seen, part) || (raw.length >= 6 && mentions(seen, raw))) continue
    push(part)
  }
  return out.join(' · ')
}

function idList(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const ids = value.map((item) => text(item)).filter(Boolean)
  if (!ids.length) return ''
  return ids.length > 4 ? `${ids.slice(0, 4).join('、')} 等 ${ids.length} 个` : ids.join('、')
}

/** Notice for POST /case-runner/tasks/{id}/write-safety/recheck.
 *  isolation_exit is present only after the unified stop+baseline exit.
 */
export function recheckNotice(data: {
  actions?: { stop_confirmed?: boolean }[]
  isolation_exit?: IsolationExitInfo | null
} | undefined): string {
  const exit = data?.isolation_exit
  if (!exit || typeof exit.committed !== 'boolean') {
    const stopped = (data?.actions || []).filter((action) => action.stop_confirmed).length
    return `已取得 ${stopped} 条停止证据。响应里没有 isolation_exit，不能据此认为隔离和账号租约已一起解除。停止不等于复位，原业务结论不变。`
  }
  if (exit.committed) {
    const accounts = idList(exit.account_leases_released) || '0'
    const devices = idList(exit.device_resources_released) || '0'
    const kind = text(exit.verification_kind)
    const reset = exit.resource_reset_verified === true ? '业务复位已核验。' : '业务复位仍未核验，原业务结论不变。'
    return `退出已完成${kind ? `（${kind}）` : ''}：隔离与账号租约在同一次提交中解除。释放账号 ${accounts}，设备资源 ${devices}。${reset}`
  }
  const blocked = text(exit.blocked_reason) || 'unknown'
  const held = idList(exit.account_leases_held)
  return `退出未提交：${codeWithGloss(blocked)}。隔离和账号租约仍保留${held ? `，仍持有账号 ${held}` : ''}。`
}

function errorDetail(error: unknown): Record<string, unknown> | undefined {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return detail && typeof detail === 'object' && !Array.isArray(detail) ? detail as Record<string, unknown> : undefined
}

/** Device-admission 409 keeps busy_task_id / sn and adds reason, reason_code, reason_detail.
 *  Returns '' when the error is not that failure, so callers can fall back to errText.
 */
export function formatAdmission(error: unknown): string {
  const detail = errorDetail(error)
  if (!detail) return ''
  const reason = text(detail.reason)
  const code = text(detail.reason_code)
  const message = text(detail.message)
  const parts = detailParts(detail.reason_detail)
  const resource = message === 'device busy' || isResourceCode(reason) || isResourceCode(code)
    || (parts.length > 0 && (isResourceCode(reason) || isResourceCode(code)))
  if (!resource) return ''
  const line = formatResourceFailure({ reason, reason_code: code, reason_detail: detail.reason_detail })
  const bits = [message === 'device busy' ? '设备占用，任务未创建' : message, line]
  const busy = text(detail.busy_task_id)
  const holder = text((detail.reason_detail as { holder_run_id?: unknown } | undefined)?.holder_run_id)
  if (busy && busy !== holder && !line.includes(busy)) bits.push(`占用任务 ${busy}`)
  const sn = text(detail.sn)
  if (sn && !line.includes(sn)) bits.push(`设备 ${sn}`)
  return bits.filter(Boolean).join(' · ')
}
