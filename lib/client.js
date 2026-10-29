var loader = typeof globalThis !== 'undefined' ? globalThis.__ModuleLoader__ : undefined
if (loader) loader.load({
  id: 'ds-qa',
  factory(require) {
    const React = require('react')
    const ORIGIN = 'http://mino.local:50104'
    var opened = false
    var railWide = true
    var listeners = []

    function setOpened(next) {
      opened = next
      for (var i = 0; i < listeners.length; i++) listeners[i]()
    }

    function useOpened() {
      const state = React.useState(opened)
      const setState = state[1]
      React.useEffect(function () {
        function sync() { setState(opened) }
        listeners.push(sync)
        return function () {
          listeners = listeners.filter(function (fn) { return fn !== sync })
        }
      }, [])
      return opened
    }

    function WorkbenchFrame() {
      const state = React.useState(false)
      const down = state[0]
      const setDown = state[1]
      return React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1 } },
        down
          ? React.createElement('p', { role: 'alert', style: { margin: 24 } }, '无法连接服务器')
          : null,
        React.createElement('iframe', {
          title: 'Workbench',
          src: ORIGIN + '/',
          style: { flex: 1, width: '100%', border: 0, display: down ? 'none' : 'block' },
          onError: function () { setDown(true) },
        }),
      )
    }

    function WorkbenchEntry(props) {
      railWide = props.wide !== false
      const on = useOpened()
      return React.createElement('button', {
        type: 'button',
        'aria-pressed': on,
        title: 'Workbench',
        onClick: function () { setOpened(!opened) },
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: railWide ? '100%' : 36,
          height: 36,
          padding: railWide ? '0 10px' : 0,
          justifyContent: railWide ? 'flex-start' : 'center',
          border: 0,
          borderRadius: 8,
          cursor: 'pointer',
          background: on ? 'var(--dsw-alias-bg-secondary, rgba(0,0,0,0.06))' : 'transparent',
          color: 'var(--dsw-alias-text-primary, inherit)',
          font: 'inherit',
        },
      }, railWide ? 'Workbench' : 'W')
    }

    function WorkbenchLayer() {
      const on = useOpened()
      if (!on) return null
      return React.createElement('div', {
        style: {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: railWide ? 248 : 56,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          background: 'var(--dsw-alias-bg-primary, #fff)',
        },
      }, React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px' },
      }, React.createElement('strong', null, 'Workbench'), React.createElement('button', {
        type: 'button',
        onClick: function () { setOpened(false) },
        style: { marginLeft: 'auto', border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit' },
      }, '关闭')), React.createElement(WorkbenchFrame))
    }

    return {
      name: 'ds-qa',
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(function () {
          return ctx.slots.inject('sidebar.footer.action', function () {
            return ctx.slots.register({
              name: 'sidebar.footer.action',
              id: 'ds-qa',
              order: 20,
              label: function () { return 'Workbench' },
            }, WorkbenchEntry)
          })
        }, 'workbench entry')
        ctx.effect(function () {
          return ctx.slots.inject('shell.overlay', function () {
            return ctx.slots.register({
              name: 'shell.overlay',
              id: 'ds-qa',
              order: 40,
            }, WorkbenchLayer)
          })
        }, 'workbench layer')
      },
    }
  },
})
