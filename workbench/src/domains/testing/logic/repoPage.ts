import { request } from '@/lib/request'

export type RepoState = { id: string; anchors: string[] }
export type RepoControl = { id: string; label: string; role: string; locator_spec: Record<string, unknown> }
export type RepoEntry = { from: string; trigger: string; platforms: string[] }
export type RepoPage = {
  page_key: string
  label: string
  path: string
  states: RepoState[]
  controls: RepoControl[]
  entries: RepoEntry[]
}

const statusOf = (error: unknown) => Number((error as { response?: { status?: number } })?.response?.status || 0)

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item ?? '')).filter(Boolean) : []
}

function asStates(value: unknown): RepoState[] | null {
  if (!Array.isArray(value)) return null
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    return [{ id: String(row.id || 'default'), anchors: strings(row.anchors) }]
  })
}

function asControls(value: unknown): RepoControl[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const id = String(row.id || row.control_id || '').trim()
    if (!id) return []
    const locator = row.locator_spec
    return [{
      id,
      label: String(row.label || row.target_desc || id),
      role: String(row.role || row.semantic_role || ''),
      locator_spec: locator && typeof locator === 'object' ? locator as Record<string, unknown> : {},
    }]
  })
}

function asEntries(value: unknown): RepoEntry[] {
  const rows = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items) ? (value as { items: unknown[] }).items : []
  return rows.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const trigger = typeof row.trigger === 'string' ? row.trigger : row.trigger && typeof row.trigger === 'object' ? String((row.trigger as { text?: unknown }).text || '') : ''
    return [{ from: String(row.from || row.from_state_id || ''), trigger, platforms: strings(row.platforms) }]
  })
}

/** 只认仓库 YAML 的形状。库表页面没有 `states`，也不会带 `pages/` 路径。 */
export function asRepoPage(raw: unknown): RepoPage | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const nested = row.page && typeof row.page === 'object' ? row.page as Record<string, unknown> : null
  const source = nested ? { ...nested, controls: nested.controls ?? row.controls, entries: nested.entries ?? row.entries ?? row.entry } : row
  const states = asStates(source.states)
  const file = String(source.path || source.file || '')
  if (!states && !file.replace(/\\/g, '/').startsWith('pages/')) return null
  const fromFile = file.split('/').pop()?.replace(/\.ya?ml$/i, '') || ''
  const pageKey = String(source.page_key || fromFile).trim()
  if (!pageKey) return null
  const path = file.replace(/\\/g, '/').startsWith('pages/') ? file.replace(/\\/g, '/') : `pages/${pageKey}.yaml`
  return {
    page_key: pageKey,
    label: String(source.label || pageKey),
    path,
    states: states || [],
    controls: asControls(source.controls),
    entries: asEntries(source.entries ?? source.entry),
  }
}

export async function listRepoPages(projectId: string, appId: string): Promise<RepoPage[]> {
  const pages: RepoPage[] = []
  let offset = 0
  for (let i = 0; i < 20; i += 1) {
    const res = await request<{ items?: unknown[]; next_offset?: number | null }>({
      url: `/project/${projectId}/apps/${encodeURIComponent(appId)}/logic/pages`,
      method: 'get',
      params: { limit: 200, offset },
    })
    const body = res.data
    for (const item of body?.items || []) {
      const page = asRepoPage(item)
      if (page && !pages.some(row => row.page_key === page.page_key)) pages.push(page)
    }
    if (body?.next_offset == null) break
    offset = Number(body.next_offset)
  }
  return pages
}

export async function getRepoPage(projectId: string, appId: string, pageKey: string): Promise<RepoPage | null> {
  try {
    const res = await request({
      url: `/project/${projectId}/apps/${encodeURIComponent(appId)}/logic/pages/${encodeURIComponent(pageKey)}`,
      method: 'get',
    })
    return asRepoPage(res.data)
  } catch (error) {
    if (statusOf(error) === 404) return null
    throw error
  }
}
