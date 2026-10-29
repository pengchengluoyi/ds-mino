import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, errText, useFeedback } from '@/ui'
import { request } from '@/lib/request'
import { caseKeys } from './queries'
import { normalizeScriptPath } from './scriptPath'

export function ScriptPathField({ projectId, caseId, path }: { projectId: string; caseId: string; path: string }) {
  const fb = useFeedback()
  const qc = useQueryClient()
  const [value, setValue] = useState(path)
  useEffect(() => setValue(path), [path, caseId])
  const save = useMutation({
    mutationFn: async () => {
      const next = normalizeScriptPath(value)
      if (next == null) throw new Error('脚本路径必须是仓库内的 .py 相对路径')
      await request({
        url: `/project/${projectId}/cases/${encodeURIComponent(caseId)}`,
        method: 'put',
        data: { script_path: next },
      })
    },
    onSuccess: () => {
      fb.ok('脚本路径已保存')
      void qc.invalidateQueries({ queryKey: caseKeys.list(projectId) })
    },
    onError: (error) => fb.fail(errText(error, '保存失败')),
  })
  const dirty = value.trim().replace(/\\/g, '/') !== path
  return <div className="config-toolbar">
    <Input aria-label="脚本路径" value={value} placeholder="tests/模块/用例.py" onChange={event => setValue(event.target.value)} style={{ flex: '1 1 240px' }} />
    <Button size="small" type="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>保存</Button>
  </div>
}
