import { request } from '@/lib/request'
import { unwrapOne } from '@/lib/unwrap'

export type EntryEvidence = {
  source_kind: string
  source_ref: string
  relation: string
  quote: string
  weight: number
  data: Record<string, unknown>
  created_at: number
}

export type PageEntry = {
  entry_id: string
  app_id: string
  project_id: string
  from_state_id: string
  target_state_id: string
  target_label: string
  platform: string
  build_scope: string
  source_kind: string
  status: string
  confidence: number
  trigger: {
    kind?: string
    text?: string
    selector?: Record<string, string>
    locators?: { by: string; value: string }[]
    requires_visible?: boolean
  }
  preconditions: Record<string, unknown>
  expect: Record<string, unknown>
  fingerprint_hash: string
  fingerprint: { hash?: string; node_count?: number; anchors?: { label?: string; rid?: string; path?: string }[] }
  success_count: number
  fail_count: number
  fail_streak: number
  last_success_at: number
  last_fail_at: number
  conflict: boolean
  created_at: number
  updated_at: number
  evidence: EntryEvidence[]
}

export type PageEntrySummary = {
  app_id: string
  total: number
  by_status: Record<string, number>
  by_source: Record<string, number>
  open_gaps: number
  with_fingerprint: number
  clean: number
}

export type PageGap = {
  gap_id: string
  app_id: string
  project_id: string
  target_label: string
  target_state_id: string
  from_state_id: string
  platform: string
  kind: string
  status: string
  detail: string
  occurrence_count: number
  first_seen_at: number
  last_seen_at: number
  sample_refs: { case_id?: string; step?: number; quote?: string; edge_id?: string }[]
}

export const getPageEntrySummary = async (appId: string) =>
  unwrapOne<PageEntrySummary>(await request({ url: `/nav-fsm/${encodeURIComponent(appId)}/entries/summary`, method: 'get' }))

export const listPageEntries = async (appId: string, params: { target?: string; status?: string; platform?: string } = {}) =>
  unwrapOne<{ app_id: string; items: PageEntry[] }>(await request({ url: `/nav-fsm/${encodeURIComponent(appId)}/entries`, method: 'get', params }))

export const getPageEntry = async (appId: string, entryId: string) =>
  unwrapOne<PageEntry>(await request({ url: `/nav-fsm/${encodeURIComponent(appId)}/entries/${encodeURIComponent(entryId)}`, method: 'get' }))

export const listPageGaps = async (appId: string) =>
  unwrapOne<{ app_id: string; items: PageGap[] }>(await request({ url: `/nav-fsm/${encodeURIComponent(appId)}/entries/gaps`, method: 'get' }))

export const extractPageEntries = async (appId: string, body: { project_id: string; platform?: string; include_cases?: boolean; include_capture?: boolean }) =>
  unwrapOne<{ entry_count: number; gap_count: number }>(await request({ url: `/nav-fsm/${encodeURIComponent(appId)}/entries/extract`, method: 'post', data: body }))
