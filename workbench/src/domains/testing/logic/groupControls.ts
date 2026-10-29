import type { FlowCatalogBlock } from '@/api/adminCatalog'
import type { V5Control } from '@/api/v5'

export interface LogicGroup {
  id: string
  title: string
  members: FlowCatalogBlock[]
}

const plainName = (row: FlowCatalogBlock) => (row.display_name || row.block_id).replace(/（[^）]*）/g, '').trim()
const nameStem = (row: FlowCatalogBlock) => plainName(row).split('：')[0].trim()

/** 子块并进父块；名称在冒号前相同的分支并成一条逻辑。 */
export function groupFlowBlocks(rows: FlowCatalogBlock[]): LogicGroup[] {
  const ids = rows.map(row => row.block_id)
  const parentOf = (id: string) => ids.filter(other => other !== id && id.startsWith(`${other}.`)).sort((a, b) => b.length - a.length)[0] || ''
  const nested = new Map<string, FlowCatalogBlock[]>()
  const roots: FlowCatalogBlock[] = []
  for (const row of rows) {
    const parent = parentOf(row.block_id)
    if (!parent) roots.push(row)
    else nested.set(parent, [...(nested.get(parent) || []), row])
  }
  const groups: LogicGroup[] = []
  const loose = new Map<string, FlowCatalogBlock[]>()
  for (const root of roots) {
    const children = nested.get(root.block_id) || []
    if (children.length) groups.push(asGroup(root.block_id, [root, ...children]))
    else loose.set(nameStem(root), [...(loose.get(nameStem(root)) || []), root])
  }
  for (const [stem, members] of loose) {
    groups.push(members.length > 1 ? asGroup(stem, members) : asGroup(members[0].block_id, members))
  }
  return groups.sort((a, b) => a.title.localeCompare(b.title, 'zh'))
}

function asGroup(id: string, members: FlowCatalogBlock[]): LogicGroup {
  const stems = members.map(nameStem)
  const title = stems.every(item => item === stems[0]) && stems[0] ? stems[0] : plainName(members[0]) || id
  return { id, title, members }
}

export function logicRoot(group: LogicGroup) {
  return group.members.find(row => group.members.every(other => other.block_id === row.block_id || other.block_id.startsWith(`${row.block_id}.`)))
}

/** 子块步骤已经在父块链条里时，只展示这一条链。 */
export function logicBranches(group: LogicGroup) {
  const root = logicRoot(group)
  if (!root || group.members.length === 1) return root ? [root] : group.members
  const rootIds = new Set((root.steps_json || []).map(step => step.id).filter(Boolean))
  const extra = group.members.some(row => row.block_id !== root.block_id && (row.steps_json || []).some(step => step.id && !rootIds.has(step.id)))
  return extra ? group.members : [root]
}

export interface LogicPage {
  state_id: string
  label: string
  version: string
  positive: string[]
}

/** 控件挂到已知页面上。Web 定位里的 `main` 不是导航页。 */
export function assignedPageId(control: V5Control, pages: LogicPage[]) {
  const bound = control.page_state_id || control.locator_value?.nav_state_id || ''
  if (bound && pages.some(page => page.state_id === bound)) return bound
  const pageId = control.locator_spec?.playwright?.scope?.page_id || ''
  if (!pageId || pageId === 'main') return ''
  return pages.some(page => page.state_id === pageId) ? pageId : ''
}

export function controlsOnPage(controls: V5Control[], pages: LogicPage[], pageId: string) {
  return controls.filter(control => assignedPageId(control, pages) === pageId)
}

export function locatorLine(control: V5Control) {
  const selector = control.locator_spec?.playwright?.selector
  if (!selector?.value) return '未定位'
  return selector.kind === 'role' && selector.name ? `${selector.kind} · ${selector.value} · ${selector.name}` : `${selector.kind || '定位'} · ${selector.value}`
}
