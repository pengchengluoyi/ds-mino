import { Button, FormField, FormSection, Input } from '@/ui'
import { channelConfigVar, type EnvChannel } from './envModel'

export function AppEnvCard({ channel, value, inheritHint, onValue, onRemove, onCopy, disabled = false }: {
  channel: EnvChannel; value: string; inheritHint: string
  onValue: (v: string) => void; onRemove?: () => void; onCopy: () => void; disabled?: boolean
}) {
  return <article className="w-surface-card" style={{ minWidth: 0 }}>
    <fieldset disabled={disabled} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <FormSection title="启动配置">
        <FormField label="启动标识 / 地址" hint={inheritHint || undefined}>
          <Input aria-label="当前渠道启动标识" disabled={disabled} value={value} placeholder={channel.placeholder || channel.field} spellCheck={false} onChange={e => onValue(e.target.value)} style={{ fontFamily: 'var(--w-font-mono)' }} />
        </FormField>
      </FormSection>
    </fieldset>
    <footer className="flex flex-wrap items-center gap-3" style={{ padding: '16px 24px', borderTop: '1px solid var(--w-border)' }}>
      <details className="w-env-advanced"><summary>参数引用</summary><div className="flex flex-wrap items-center gap-3"><code style={{ overflowWrap: 'anywhere' }}>{channelConfigVar(channel)}</code><Button onClick={onCopy}>复制参数引用</Button></div></details>
      {onRemove && <Button danger type="text" disabled={disabled} onClick={onRemove}>移除渠道</Button>}
    </footer>
  </article>
}
