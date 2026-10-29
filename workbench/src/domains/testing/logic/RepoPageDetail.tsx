import type { RepoControl, RepoPage } from './repoPage'

const CHANNEL: Record<string, string> = {
  uiautomator: 'android',
  xcuitest: 'ios',
  playwright: 'web',
  ax: 'mac',
  uia: 'win',
}

function locatorLine(spec: unknown) {
  if (!spec || typeof spec !== 'object') return ''
  const selector = (spec as { selector?: unknown }).selector
  if (!selector || typeof selector !== 'object') return ''
  const row = selector as { kind?: unknown; value?: unknown; name?: unknown }
  return [row.kind, row.value, row.name].map(item => String(item || '')).filter(Boolean).join(' · ')
}

function LocatorCells({ control }: { control: RepoControl }) {
  const cells = Object.entries(control.locator_spec)
  if (!cells.length) return <small>没有定位单元格</small>
  return <ul className="app-logic-locator">{cells.map(([key, spec]) => {
    const line = locatorLine(spec)
    return <li key={key}><strong>{CHANNEL[key] || key}</strong>{line ? <span>{line}</span> : null}</li>
  })}</ul>
}

export function RepoPageDetail({ page }: { page: RepoPage }) {
  return <div className="app-logic-knowledge">
    <div>
      <h2>{page.label}</h2>
      <p className="config-secondary"><code>{page.path}</code></p>
    </div>
    <section>
      <h3 className="config-subsection-title">状态</h3>
      {page.states.length ? page.states.map(state => <div key={state.id}>
        <strong>{state.id}</strong>
        {state.anchors.length ? <ul className="app-logic-slots">{state.anchors.map(item => <li key={item}>{item}</li>)}</ul> : <p className="config-secondary">没有锚点</p>}
      </div>) : <p className="config-secondary">没有状态</p>}
    </section>
    <section>
      <h3 className="config-subsection-title">控件</h3>
      {page.controls.length ? <ul className="app-logic-controls">{page.controls.map(control => <li key={control.id} className="app-logic-control">
        <strong>{control.label}</strong>
        <small>{control.id}{control.role ? ` · ${control.role}` : ''}</small>
        <LocatorCells control={control} />
      </li>)}</ul> : <p className="config-secondary">没有控件</p>}
    </section>
    <section>
      <h3 className="config-subsection-title">入口</h3>
      {page.entries.length ? <ul className="app-logic-slots">{page.entries.map((entry, index) => <li key={`${entry.from}:${entry.trigger}:${index}`}>{entry.from || '任意页'} → {entry.trigger || '未记录'}{entry.platforms.length ? ` · ${entry.platforms.join(' ')}` : ''}</li>)}</ul> : <p className="config-secondary">没有入口</p>}
    </section>
  </div>
}
