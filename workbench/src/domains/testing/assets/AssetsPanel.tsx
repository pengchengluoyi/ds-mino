import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { Button, Form, Input, Modal, Select, DataTable, EmptyState, PageHeader, StatusPill, errText, useFeedback, type DataColumn } from '@/ui'
import {
  createProjectAccount, getDeviceAppSessions, getProjectAccounts, getResourceLogs,
  type AccountDraft, type AccountRow, type DeviceAppSessionRow, type ResourceLogRow,
} from '@/api/assets'
import { request } from '@/lib/request'
import { unwrapList, unwrapOne } from '@/lib/unwrap'

type Section = 'accounts' | 'logs'

/** 测试资源。账号管理和一份只含最新状态的日志。 */
export function AssetsPanel({ projectId }: { projectId: string }) {
  const [params] = useSearchParams()
  const raw = params.get('section') || 'accounts'
  const section: Section = raw === 'logs' || raw === 'device-apps' ? 'logs' : 'accounts'

  if (!projectId) {
    return (
      <Card>
        <EmptyState
          icon={<TriangleAlert size={28} strokeWidth={1.5} style={{ color: 'var(--w-warn)' }} />}
          title="缺少项目信息"
          hint="从项目列表重新进入。"
        />
      </Card>
    )
  }

  const title = section === 'logs' ? '日志' : '账号管理'
  return <section className="w-content-page"><PageHeader title={title} />{section === 'logs' ? <ResourceLogs projectId={projectId} /> : <Accounts projectId={projectId} />}</section>
}

function Accounts({ projectId }: { projectId: string }) {
  const [adding, setAdding] = useState(false)
  const fb = useFeedback()
  const q = useQuery({
    queryKey: ['assets', projectId, 'accounts'],
    queryFn: async () => {
      const response = await getProjectAccounts(projectId)
      return {
        accounts: unwrapList<AccountRow>(response, {
          keys: ['accounts'],
          label: 'GET /project/:id/accounts',
        }),
        environments: accountEnvironments(response.data?.environments),
        defaultProfile: String(response.data?.default_profile || '').trim(),
      }
    },
  })
  const environments = q.data?.environments || []

  const openCreate = () => {
    if (!environments.length) {
      fb.warn('先在「配置」里添加环境')
      return
    }
    setAdding(true)
  }

  const columns = useMemo<DataColumn<AccountRow>[]>(() => [
    {
      key: 'ident',
      title: '账号',
      alwaysVisible: true,
      render: (_: unknown, r) => (
        <div className="min-w-0">
          <div className="truncate" style={{ fontWeight: 650, color: 'var(--w-text)' }}>
            {r.account_ident || r.username || r.email || r.phone || r.account_id || '—'}
          </div>
          {r.display_name && (
            <div className="truncate" style={{ fontSize: 'var(--w-font-meta)', color: 'var(--w-text-quaternary)' }}>
              {r.display_name}
            </div>
          )}
        </div>
      ),
    },
    { key: 'env', title: '环境', dataIndex: 'env', width: 100, render: (v: string) => v || '—' },
    {
      key: 'state',
      title: '状态',
      width: 150,
      render: (_: unknown, r) => (
        <span className="flex items-center gap-1.5">
          {r.locked === true ? <StatusPill status="warn">占用中</StatusPill> : <StatusPill status="muted">{r.locked === false ? '未占用' : '占用未知'}</StatusPill>}
          <StatusPill status="muted">{r.registered === true ? '已登记' : r.registered === false ? '未登记' : '登记未知'}</StatusPill>
        </span>
      ),
    },
    { key: 'phone', title: '手机号', dataIndex: 'phone', width: 130, render: (v: string) => v || '—' },
    { key: 'email', title: '邮箱', dataIndex: 'email', ellipsis: true, render: (v: string) => v || '—' },
    { key: 'session', title: '会话', width: 140, render: (_: unknown, r) => r.session_display || '—' },
    { key: 'note', title: '备注', dataIndex: 'note', ellipsis: true, render: (v: string) => v || '—' },
  ], [])

  return (
    <>
      <DataTable<AccountRow>
        viewId="assets.accounts"
        renderCard={row => <><strong className="w-record-title">{row.account_ident || row.username || row.email || row.phone || row.display_name || '测试账号'}</strong><div className="w-record-line w-record-meta"><StatusPill status={row.locked ? 'warn' : 'muted'}>{row.locked === true ? '占用中' : row.locked === false ? '未占用' : '占用待确认'}</StatusPill><span>{row.env || '未指定环境'}</span></div>{row.note && <span className="w-record-excerpt">{row.note}</span>}</>}
        toolbar={<Button type="primary" disabled={!q.isSuccess} onClick={openCreate}>新增账号</Button>}
        columns={columns}
        dataSource={q.data ? withDisplayKeys(q.data.accounts) : undefined}
        rowKey={r => String(r.__viewKey)}
        loading={q.isLoading}
        error={q.isError ? q.error : undefined}
        onRetry={() => void q.refetch()}
        fill
        emptyTitle="这个项目还没有测试账号"
      />
      <AddAccountDialog
        projectId={projectId}
        open={adding}
        environments={environments}
        defaultProfile={q.data?.defaultProfile || ''}
        onClose={() => setAdding(false)}
      />
    </>
  )
}

function AddAccountDialog({
  projectId,
  open,
  environments,
  defaultProfile,
  onClose,
}: {
  projectId: string
  open: boolean
  environments: { key: string; label: string }[]
  defaultProfile: string
  onClose: () => void
}) {
  const [form] = Form.useForm<AccountDraft>()
  const fb = useFeedback()
  const qc = useQueryClient()

  useEffect(() => {
    if (!open) return
    const env = environments.some(item => item.key === defaultProfile) ? defaultProfile : environments[0]?.key || 'test'
    form.setFieldsValue({ env, display_name: '', phone: '', username: '', email: '', password: '', otp: '', note: '' })
  }, [open, environments, defaultProfile, form])

  const create = useMutation({
    mutationFn: (values: AccountDraft) => createProjectAccount(projectId, {
      env: values.env,
      display_name: values.display_name?.trim() || '',
      phone: values.phone?.trim() || '',
      email: values.email?.trim() || '',
      username: values.username?.trim() || '',
      ...(values.password ? { password: values.password } : {}),
      otp: values.otp?.trim() || '',
      note: values.note?.trim() || '',
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assets', projectId, 'accounts'] })
      fb.ok('账号已添加')
      onClose()
    },
    onError: (error) => fb.fail(errText(error, '添加失败')),
  })

  const submit = (values: AccountDraft) => {
    if (![values.display_name, values.phone, values.email, values.username].some(value => String(value || '').trim())) {
      fb.warn('至少填展示名、手机号、邮箱或用户名之一')
      return
    }
    create.mutate(values)
  }

  return (
    <Modal
      open={open}
      title="新增测试账号"
      onCancel={() => { if (!create.isPending) onClose() }}
      closable={!create.isPending}
      maskClosable={!create.isPending}
      keyboard={!create.isPending}
      destroyOnHidden
      footer={[
        <Button key="cancel" disabled={create.isPending} onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" loading={create.isPending} onClick={() => form.submit()}>保存</Button>,
      ]}
    >
      <Form form={form} disabled={create.isPending} layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item name="env" label="环境" rules={[{ required: true, message: '请选择环境' }]}>
          <Select options={environments.map(item => ({ value: item.key, label: item.label }))} />
        </Form.Item>
        <Form.Item name="display_name" label="展示名">
          <Input placeholder="列表主标题，可与手机号重复" maxLength={80} autoComplete="off" autoFocus />
        </Form.Item>
        <Form.Item name="phone" label="手机号">
          <Input placeholder="推荐填写" maxLength={32} autoComplete="off" />
        </Form.Item>
        <Form.Item name="username" label="用户名">
          <Input maxLength={80} autoComplete="off" />
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input maxLength={80} autoComplete="off" />
        </Form.Item>
        <Form.Item name="password" label="密码">
          <Input.Password maxLength={120} autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="otp" label="验证码">
          <Input placeholder="固定验证码，可留空" maxLength={32} autoComplete="off" />
        </Form.Item>
        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function accountEnvironments(raw: unknown) {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: { key: string; label: string }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const key = String((item as { key?: unknown }).key || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const label = String((item as { label?: unknown }).label || '').trim() || key
    out.push({ key, label })
  }
  return out
}

type LogLine = { kind: string; subject: string; status: string; tone: 'pass' | 'warn' | 'fail' | 'muted'; detail: string; at: string }

const RESOURCE_STATUS: Record<string, { label: string; tone: LogLine['tone'] }> = {
  lease_claim: { label: '占用中', tone: 'warn' },
  lease_release: { label: '已释放', tone: 'muted' },
  lease_fail: { label: '分配失败', tone: 'fail' },
  facet_update: { label: '资料已更新', tone: 'pass' },
}

const FACT_LABELS: Record<string, string> = {
  login_flow: '登录状态',
  registered_days: '注册天数',
  unknown: '未知',
  logged_out: '已退出',
  logged_in: '已登录',
}

function factWord(value: string) {
  return FACT_LABELS[value] || value
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function resourceDetail(row: ResourceLogRow) {
  const message = typeof row.message === 'string' ? row.message.trim() : ''
  if (message) return message
  return ''
}

function factStatus(row: { stale?: boolean; expired?: boolean; status?: string }): { label: string; tone: LogLine['tone'] } {
  if (row.stale) return { label: '事实已变化', tone: 'warn' }
  if (row.expired) return { label: '已过期', tone: 'warn' }
  if (row.status === 'confirmed') return { label: '已确认', tone: 'pass' }
  if (row.status === 'rejected') return { label: '已拒绝', tone: 'muted' }
  return { label: '待复核', tone: 'warn' }
}

function latestLines(lines: LogLine[]) {
  const seen = new Set<string>()
  const out: LogLine[] = []
  for (const line of [...lines].sort((a, b) => b.at.localeCompare(a.at))) {
    const key = `${line.kind}\0${line.subject}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

function ResourceLogs({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ['assets', projectId, 'logs', 'latest'],
    queryFn: async () => {
      const [resources, devices, facts] = await Promise.all([
        getResourceLogs(projectId, { latest: true, page_size: 100 }),
        getDeviceAppSessions(projectId),
        request({ url: `/project/${encodeURIComponent(projectId)}/account-facts`, method: 'get', params: { latest: 1, limit: 200 } }),
      ])
      const resourceRows = unwrapList<ResourceLogRow>(resources, { keys: ['items', 'logs'], label: '资源日志' })
      const deviceRows = unwrapList<DeviceAppSessionRow>(devices, { keys: ['sessions'], label: '设备应用记录' })
      const factRows = unwrapOne<{ items?: { account_name?: string; account_id?: string; env?: string; stale?: boolean; expired?: boolean; status?: string; proposed?: Record<string, string>; before?: Record<string, string>; created_at?: string }[] }>(facts).items || []
      const resourceStatus = (action?: string) => RESOURCE_STATUS[action || ''] || { label: action || '未记录', tone: 'muted' as const }
      const lines = latestLines([
        ...resourceRows.map(row => {
          const status = resourceStatus(row.action)
          return {
            kind: '资源',
            subject: row.account_ident || '未指定账号',
            status: status.label,
            tone: status.tone,
            detail: resourceDetail(row),
            at: row.created_at || '',
          }
        }),
        ...deviceRows.filter(row => row.created_at || row.app_version || row.session_display || row.note).map(row => ({
          kind: '设备应用',
          subject: [row.sn, row.package_id].filter(Boolean).join(' · ') || '未记录设备',
          status: row.session_display || row.app_version_display || row.app_version || '已记录',
          tone: 'muted' as const,
          detail: [row.app_version_display || row.app_version, row.note].filter(Boolean).join(' · '),
          at: row.created_at || '',
        })),
        ...factRows.map(row => {
          const status = factStatus(row)
          return {
            kind: '账号事实',
            subject: [row.account_name || row.account_id, row.env].filter(Boolean).join(' · ') || '未记录账号',
            status: status.label,
            tone: status.tone,
            detail: Object.entries(row.proposed || {}).map(([key, value]) => `${factWord(key)}：${factWord(row.before?.[key] || 'unknown')} → ${factWord(value)}`).join('；'),
            at: row.created_at || '',
          }
        }),
      ])
      return lines
    },
  })
  const columns = useMemo<DataColumn<LogLine>[]>(() => [
    { key: 'kind', title: '类型', dataIndex: 'kind', width: 110 },
    { key: 'subject', title: '对象', dataIndex: 'subject', alwaysVisible: true, ellipsis: true },
    { key: 'status', title: '最新状态', width: 120, render: (_, row) => <StatusPill status={row.tone}>{row.status}</StatusPill> },
    { key: 'at', title: '时间', width: 150, render: (_, row) => <span className="w-mono" style={{ whiteSpace: 'nowrap' }}>{formatWhen(row.at)}</span> },
    { key: 'detail', title: '说明', dataIndex: 'detail', ellipsis: true, render: (value: string) => value || '—' },
  ], [])
  return (
    <DataTable<LogLine>
      viewId="assets.logs"
      renderCard={row => <><strong className="w-record-title">{row.subject}</strong><span className="w-record-meta">{row.kind} · {row.status}</span><span className="w-record-excerpt">{row.detail || row.at || '暂无说明'}</span></>}
      columns={columns}
      dataSource={q.data ? withDisplayKeys(q.data) : undefined}
      rowKey={row => String((row as LogLine & { __viewKey?: string }).__viewKey)}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={() => void q.refetch()}
      fill
      emptyTitle="还没有日志"
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--w-surface)', border: '1px solid var(--w-border)', borderRadius: 'var(--w-radius-lg)' }}>
      {children}
    </div>
  )
}

function stableRowKey(row: object) { return JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))) }

function withDisplayKeys<T extends object>(rows: T[]): (T & { __viewKey: string })[] { const seen = new Map<string, number>(); return rows.map(row => { const id = String((row as Record<string, unknown>).account_id || (row as Record<string, unknown>).id || stableRowKey(row)); const occurrence = seen.get(id) || 0; seen.set(id, occurrence + 1); return { ...row, __viewKey: `${id}:${occurrence}` } }) }
