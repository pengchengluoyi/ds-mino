import { Link } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
export function Planned({ title }: { title: string; phase: string; note?: string; source?: string }) {
 return <div className="flex flex-col"><PageHeader title={title} count="暂未提供" /><div className="w-surface-card"><EmptyState title="当前版本暂未提供此页面" action={<div className="flex gap-3"><Link to="/testing">返回项目工作台</Link><Link to="/settings/runtime">查看 Scout 节点</Link></div>} /></div></div>
}
