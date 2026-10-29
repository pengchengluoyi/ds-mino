import { FlaskConical, ListChecks, Settings2, Boxes, Waypoints } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * 应用内导航。
 * 工作区、待处理问题、任务和执行记录已砍，旧链接回到用例。
 * 页面地图并入应用逻辑，不再单独占导航。
 */
export const VALID_TABS = ['cases', 'tasks', 'logic', 'assets', 'config'] as const
export type Tab = (typeof VALID_TABS)[number]

/** 原默认是 process，该 tab 已砍 —— 不改默认值会白屏。 */
export const DEFAULT_TAB: Tab = 'cases'

/** 已砍或并入其他页面的旧 tab 值，旧链接由工作台重定向。 */
export const RETIRED_TABS = ['process', 'knowledge', 'docs', 'intel', 'dispatch', 'collab', 'work', 'navigation', 'issues', 'session-log'] as const

export type SubParamKey = 'view' | 'nview' | 'section' | 'configSection' | 'configView' | 'issueView'

export interface SubItem {
  label: string
  /** 子项要么切 tab 本身，要么只改子视图参数 —— 沿用原划分，避免旧链接失效 */
  tab?: Tab
  param?: { key: SubParamKey; value: string }
}

export interface NavItem {
  id: Tab
  label: string
  icon: LucideIcon
  /** 属于同一导航项的其他 tab 值（高亮用） */
  alsoActiveOn?: Tab[]
  children?: SubItem[]
}

export const APP_NAV: NavItem[] = [
  { id: 'cases', label: '用例', icon: FlaskConical },
  { id: 'tasks', label: '任务', icon: ListChecks },
  { id: 'logic', label: '应用逻辑', icon: Waypoints },
  {
    id: 'assets',
    label: '测试资源',
    icon: Boxes,
    children: [
      { label: '账号管理', param: { key: 'section', value: 'accounts' } },
      { label: '日志', param: { key: 'section', value: 'logs' } },
    ],
  },
  { id: 'config', label: '配置', icon: Settings2 },
]

/** 每个 tab 的子视图参数名与默认值，读 URL 时兜底。 */
export const SUB_VIEW_DEFAULTS: Partial<Record<Tab, { key: SubParamKey; value: string }>> = {
  assets: { key: 'section', value: 'accounts' },
}

export const resolveTab = (raw: unknown): Tab => {
  const t = String(raw || '')
  return (VALID_TABS as readonly string[]).includes(t) ? (t as Tab) : DEFAULT_TAB
}

export const isRetiredTab = (raw: unknown): boolean =>
  (RETIRED_TABS as readonly string[]).includes(String(raw || ''))
