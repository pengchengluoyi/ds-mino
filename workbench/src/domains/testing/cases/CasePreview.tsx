import type { CaseRow } from '@/api/projectCases'
import { Button, EmptyState } from '@/ui'
import { ScriptPathField } from './ScriptPathField'
import { scriptModule } from './scriptPath'

/** 点开一条用例。仓库里一份脚本，这里只改路径并显示当前文件。 */
export function CasePreview({ row, projectId = '', onBack }: { row: CaseRow; projectId?: string; onBack?: () => void }) {
  const path = String(row.script_path || '')
  const script = typeof row.script === 'string' ? row.script : ''
  const meta = [scriptModule(path), row.platform || '未指定'].join(' · ')
  return (
    <section className="task-detail">
      <header className="case-detail-heading">
        <div className="min-w-0"><h1>{row.title || '未命名用例'}</h1><p className="w-record-meta">{meta}</p></div>
        {onBack && <Button onClick={onBack}>返回用例</Button>}
      </header>
      <div className="w-page-scroll" role="region" aria-label="用例详情" tabIndex={0}>
        <dl className="task-info">
          <div><dt>用例编号</dt><dd>{row.case_id}</dd></div>
          <div><dt>模块</dt><dd>{row.module || '未分组'}</dd></div>
          <div><dt>平台</dt><dd>{row.platform || '未指定'}</dd></div>
          <div><dt>脚本路径</dt><dd>{projectId ? <ScriptPathField projectId={projectId} caseId={row.case_id} path={path} /> : path || '未设置'}</dd></div>
        </dl>
        <h2 className="case-script-heading">仓库内脚本</h2>
        {script ? <pre className="case-script-source">{script}</pre> : path ? <EmptyState title="工作目录里还没有这个文件" /> : null}
      </div>
    </section>
  )
}
