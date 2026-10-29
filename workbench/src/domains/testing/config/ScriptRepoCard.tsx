import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, errText, useFeedback } from '@/ui'
import { getScriptRepo, putScriptRepo, scriptRepoKey } from '@/api/scriptRepo'

export function ScriptRepoCard({ projectId }: { projectId: string }) {
  const fb = useFeedback()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: scriptRepoKey(projectId),
    queryFn: () => getScriptRepo(projectId),
  })
  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('')
  useEffect(() => {
    setUrl(query.data?.url || '')
    setBranch(query.data?.branch || '')
  }, [query.data?.url, query.data?.branch])
  const save = useMutation({
    mutationFn: () => putScriptRepo(projectId, url.trim(), branch.trim()),
    onSuccess: (response) => {
      const failed = Boolean((response as { data?: { workspace?: { error?: string } } })?.data?.workspace?.error)
      fb.ok(failed ? '地址已保存，检出失败' : '脚本仓库已保存')
      void qc.invalidateQueries({ queryKey: scriptRepoKey(projectId) })
      void qc.invalidateQueries({ queryKey: ['repo-tree', projectId] })
      void qc.invalidateQueries({ queryKey: ['repo-pages', projectId] })
      void qc.invalidateQueries({ queryKey: ['repo-file', projectId] })
    },
    onError: (error) => fb.fail(errText(error, '保存失败')),
  })
  const saved = query.data
  const failure = saved?.workspace?.error || ''
  return (
    <section className="w-surface-card config-stack">
      <h2 className="config-subsection-title">脚本仓库</h2>
      {query.isError ? <p role="alert">{errText(query.error)}</p> : null}
      <p className="config-secondary">{saved?.url ? '已配置' : '未配置'}</p>
      {saved?.url ? <code className="config-secondary">{saved.url}</code> : null}
      <p className="config-secondary">分支 {saved?.branch || '默认分支'}</p>
      {failure ? <p className="config-secondary" role="alert">{failure}</p> : null}
      <div className="config-toolbar">
        <label className="config-stack" style={{ flex: '1 1 280px' }}>Git 地址
          <Input value={url} placeholder="https://example.com/cases.git" onChange={event => setUrl(event.target.value)} />
        </label>
        <label className="config-stack" style={{ flex: '0 1 180px' }}>分支
          <Input value={branch} placeholder="默认分支" onChange={event => setBranch(event.target.value)} />
        </label>
      </div>
      <div><Button type="primary" loading={save.isPending} onClick={() => save.mutate()}>保存</Button></div>
    </section>
  )
}
