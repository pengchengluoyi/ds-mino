import { Button, Checkbox, FormField, FormSection, Input, Select } from '@/ui'
import type { AppRow } from '@/types/project'
import {
  emptySecrets, normalizeSlot, usesGmailAlias, usesPhone,
  type EnvDocument, type EnvSecrets, type LoginPolicy,
} from './envModel'

const OTP_OPTIONS = [{ value: 'auto', label: '自动（账号码、固定码、Gmail、问人）' }, { value: 'fixed', label: '只用固定码' }, { value: 'gmail', label: 'Gmail 收信' }, { value: 'hitl', label: '每次问人' }]
const LOGIN_OPTIONS = [{ value: 'auto', label: '自动（账号管理、问人）' }, { value: 'pool', label: '只用账号管理' }, { value: 'hitl', label: '真实号 / 问人' }]
const KIND_OPTIONS = [{ value: 'phone', label: '手机号' }, { value: 'email', label: '邮箱（支持别名）' }]

export function LoginPolicies({ doc, envKey, apps, disabled, onChange }: {
  doc: EnvDocument
  envKey: string
  apps: AppRow[]
  disabled?: boolean
  onChange: (policies: LoginPolicy[]) => void
}) {
  const policies = doc.login_policies || []
  const replace = (index: number, next: LoginPolicy) => onChange(policies.map((row, i) => i === index ? next : row))
  const add = () => {
    const secrets: LoginPolicy['secrets'] = {}
    const phone_seq: LoginPolicy['phone_seq'] = {}
    const gmail_alias: LoginPolicy['gmail_alias'] = {}
    for (const env of doc.environments) {
      secrets[env.key] = emptySecrets()
      phone_seq[env.key] = normalizeSlot(undefined, '17000000000')
      gmail_alias[env.key] = normalizeSlot(undefined, '')
    }
    onChange([...policies, { id: `lp${Date.now().toString(36)}`, label: '登录策略', apply: 'all', app_ids: [], secrets, phone_seq, gmail_alias }])
  }
  return <section className="config-stack">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="config-subsection-title">登录策略</h2>
      <Button disabled={disabled} onClick={add}>新增策略</Button>
    </div>
    {policies.map((policy, index) => {
      const secrets = policy.secrets[envKey] || emptySecrets()
      const phone = policy.phone_seq[envKey] || normalizeSlot(undefined, '17000000000')
      const gmail = policy.gmail_alias[envKey] || normalizeSlot(undefined, '')
      const selected = new Set(policy.apply === 'all' ? apps.map(app => app.id) : policy.app_ids)
      const patchSecrets = (next: EnvSecrets) => replace(index, { ...policy, secrets: { ...policy.secrets, [envKey]: next } })
      const toggle = (appId: string, checked: boolean) => {
        const ids = apps.map(app => app.id).filter(id => id === appId ? checked : selected.has(id))
        const all = apps.length > 0 && ids.length === apps.length
        replace(index, { ...policy, apply: all ? 'all' : 'selected', app_ids: all ? [] : ids })
      }
      return <article key={policy.id} className="w-surface-card" style={{ padding: 20 }}>
        <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 12 }}>
          <Input aria-label="登录策略名称" disabled={disabled} value={policy.label} onChange={event => replace(index, { ...policy, label: event.target.value })} style={{ maxWidth: 240 }} />
          {policies.length > 1 && <Button type="text" danger disabled={disabled} onClick={() => onChange(policies.filter(row => row.id !== policy.id))}>删除</Button>}
        </div>
        <FormSection title="生效应用" extra={policy.apply === 'all' ? <span className="config-secondary">{apps.length ? '含以后新增的应用' : '添加应用后自动生效'}</span> : undefined}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {apps.map(app => <Checkbox key={app.id} disabled={disabled} checked={selected.has(app.id)} onChange={event => toggle(app.id, event.target.checked)}>{app.name || '未命名应用'}</Checkbox>)}
            {!apps.length && <span className="config-secondary">还没有应用</span>}
          </div>
        </FormSection>
        <FormSection title="账号">
          <div className="w-form-grid">
            <FormField label="账号来源"><Select aria-label="登录账号来源" disabled={disabled} value={secrets.login.mode} options={LOGIN_OPTIONS} onChange={value => patchSecrets({ ...secrets, login: { ...secrets.login, mode: value } })} style={{ width: '100%' }} /></FormField>
            <FormField label="账号类型"><Select aria-label="登录账号类型" disabled={disabled} value={secrets.login.kind} options={KIND_OPTIONS} onChange={value => patchSecrets({ ...secrets, login: { ...secrets.login, kind: value } })} style={{ width: '100%' }} /></FormField>
            {usesPhone(secrets) && <FormField label="手机号起始位" hint={`下一号码 ${phone.next || phone.start || '未设置'}`}><Input aria-label="手机号起始位" disabled={disabled} value={phone.start} placeholder="17000000000" onChange={event => replace(index, { ...policy, phone_seq: { ...policy.phone_seq, [envKey]: normalizeSlot({ start: event.target.value, next: phone.next || event.target.value }) } })} /></FormField>}
            {usesGmailAlias(secrets) && <FormField label="Gmail 别名起始位" hint={`下一别名 ${gmail.next || gmail.start || '未设置'}`}><Input aria-label="Gmail 别名起始位" disabled={disabled} value={gmail.start} placeholder="10000" onChange={event => replace(index, { ...policy, gmail_alias: { ...policy.gmail_alias, [envKey]: normalizeSlot({ start: event.target.value, next: gmail.next || event.target.value }) } })} /></FormField>}
          </div>
        </FormSection>
        <FormSection title="验证码">
          <div className="w-form-grid">
            <FormField label="验证码来源" wide><Select aria-label="验证码来源" disabled={disabled} value={secrets.otp.mode} options={OTP_OPTIONS} onChange={value => patchSecrets({ ...secrets, otp: { ...secrets.otp, mode: value } })} style={{ width: '100%' }} /></FormField>
            {(secrets.otp.mode === 'fixed' || secrets.otp.mode === 'auto') && <FormField label="固定验证码"><Input aria-label="固定验证码" disabled={disabled} value={secrets.otp.fixed} onChange={event => patchSecrets({ ...secrets, otp: { ...secrets.otp, fixed: event.target.value } })} /></FormField>}
            {(secrets.otp.mode === 'gmail' || secrets.otp.mode === 'auto') && <>
              <FormField label="发件人白名单"><Input aria-label="验证码发件人白名单" disabled={disabled} placeholder="a@example.com, b@example.com" value={secrets.otp.from_allowlist.join(', ')} onChange={event => patchSecrets({ ...secrets, otp: { ...secrets.otp, from_allowlist: event.target.value.split(',').map(item => item.trim()).filter(Boolean) } })} /></FormField>
              <FormField label="邮件主题关键词"><Input aria-label="验证码邮件主题关键词" disabled={disabled} value={secrets.otp.subject_contains} onChange={event => patchSecrets({ ...secrets, otp: { ...secrets.otp, subject_contains: event.target.value } })} /></FormField>
            </>}
          </div>
        </FormSection>
      </article>
    })}
  </section>
}
