/** 仓库内相对 `.py`。空字符串表示清空。非法路径返回 null。 */
export function normalizeScriptPath(value: string): string | null {
  const text = value.trim().replace(/\\/g, '/')
  if (!text) return ''
  if (text.startsWith('/') || /^[A-Za-z]:/.test(text)) return null
  const parts = text.split('/')
  if (parts.some(part => !part || part === '.' || part === '..')) return null
  if (!text.endsWith('.py')) return null
  return parts.join('/')
}

/** `tests/` 的下一级目录。没有模块目录时归在 `tests`。 */
export function scriptModule(path: string): string {
  const parts = path.trim().replace(/\\/g, '/').split('/').filter(Boolean)
  const tests = parts.indexOf('tests')
  if (tests < 0) return 'tests'
  const next = parts[tests + 1] || ''
  if (!next || next.endsWith('.py')) return 'tests'
  return next
}

export type RepoRoot = 'tests' | 'scripts' | 'pages'

export function repoRoot(path: string): RepoRoot | '' {
  const root = path.trim().replace(/\\/g, '/').replace(/^\.\//, '').split('/')[0]
  return root === 'tests' || root === 'scripts' || root === 'pages' ? root : ''
}
