import { request } from '@/lib/request'
import { unwrapOne } from '@/lib/unwrap'
import { getProjectCase } from './projectCases'

export type ScriptRepo = {
  url: string
  branch: string
  updated_at?: string
  workspace?: { root?: string; checkout?: string; venv?: string; ready?: boolean; error?: string }
}

export const scriptRepoKey = (projectId: string) => ['script-repo', projectId] as const

export const getScriptRepo = async (projectId: string) =>
  unwrapOne<ScriptRepo>(await request({ url: `/project/${projectId}/script-repo`, method: 'get' })) || { url: '', branch: '' }

export const putScriptRepo = (projectId: string, url: string, branch: string) =>
  request({ url: `/project/${projectId}/script-repo`, method: 'put', data: { url, branch } })

const statusOf = (error: unknown) => Number((error as { response?: { status?: number } })?.response?.status || 0)

function collectPaths(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.flatMap(item => {
      if (typeof item === 'string') return [item]
      if (item && typeof item === 'object' && typeof (item as { path?: unknown }).path === 'string') return [String((item as { path: string }).path)]
      return []
    })
  }
  if (!data || typeof data !== 'object') return []
  const body = data as Record<string, unknown>
  const out = collectPaths(body.files ?? body.items)
  for (const root of ['tests', 'scripts', 'pages'] as const) {
    if (!Array.isArray(body[root])) continue
    for (const item of body[root]) {
      if (typeof item === 'string') out.push(item.includes('/') ? item : `${root}/${item}`)
      else if (item && typeof item === 'object' && typeof (item as { path?: unknown }).path === 'string') out.push(String((item as { path: string }).path))
    }
  }
  return out
}

/** 检出文件列表。接口不存在时返回 null，调用方用用例路径和页面清单兜底。 */
export async function listCheckoutFiles(projectId: string): Promise<string[] | null> {
  try {
    const data = unwrapOne(await request({ url: `/project/${projectId}/script-repo/tree`, method: 'get' }))
    if (!data) return null
    return [...new Set(collectPaths(data).map(path => path.replace(/\\/g, '/').replace(/^\.\//, '')))]
  } catch (error) {
    if (statusOf(error) >= 500) throw error
    return null
  }
}

export async function readCheckoutFile(projectId: string, path: string, caseId = ''): Promise<string> {
  try {
    const data = unwrapOne<{ text?: string; content?: string }>(await request({
      url: `/project/${projectId}/script-repo/file`, method: 'get', params: { path },
    }))
    const text = data?.text ?? data?.content
    if (typeof text === 'string' && text.length) return text
  } catch (error) {
    if (statusOf(error) >= 500) throw error
  }
  if (caseId) {
    const row = (await getProjectCase(projectId, caseId)).data?.case
    const script = row && typeof row.script === 'string' ? row.script : ''
    if (script) return script
  }
  throw new Error('工作目录里还没有这个文件')
}
