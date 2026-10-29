var loader = typeof globalThis !== 'undefined' ? globalThis.__ModuleLoader__ : undefined
if (loader) loader.load({
  id: 'ds-mino',
  factory(require) {
    const React = require('react')
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

    function DsMinoFrame() {
      const state = React.useState(false)
      const down = state[0]
      const setDown = state[1]
      return React.createElement(
        'div',
        { style: { display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' } },
        down
          ? React.createElement('p', { role: 'alert', style: { margin: 24 } }, '无法连接服务器')
          : null,
        React.createElement('iframe', {
          title: 'DS Mino',
          src: '/ds-mino/',
          style: { flex: 1, width: '100%', height: '100%', border: 0, display: down ? 'none' : 'block' },
          onError: function () { setDown(true) },
        }),
      )
    }

    function DsMinoEntry(props) {
      railWide = props.wide !== false
      const on = useOpened()
      return React.createElement('button', {
        type: 'button',
        'aria-pressed': on,
        title: 'DS Mino',
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
      }, railWide ? 'DS Mino' : 'DS')
    }

    function sidebarEdge() {
      var button = document.querySelector('button[title="DS Mino"]')
      if (!button) return railWide ? 280 : 72
      var node = button.parentElement
      var edge = button.getBoundingClientRect().right
      while (node && node !== document.body) {
        var rect = node.getBoundingClientRect()
        if (rect.width >= 48 && rect.width <= 420 && rect.left < 40 && rect.height > 200) edge = rect.right
        node = node.parentElement
      }
      return edge
    }

    function DsMinoLayer(props) {
      const on = useOpened()
      const edgeState = React.useState(sidebarEdge)
      const edge = edgeState[0]
      const setEdge = edgeState[1]
      const noteState = React.useState('')
      const note = noteState[0]
      const setNote = noteState[1]
      React.useEffect(function () {
        function measure() { setEdge(sidebarEdge()) }
        measure()
        window.addEventListener('resize', measure)
        return function () { window.removeEventListener('resize', measure) }
      }, [])
      if (!on) return null
      function update() {
        var remote = props.remote || (props.ctx && props.ctx.remote)
        var manager = remote && remote.pluginManager
        if (!manager) {
          setNote('在插件页用 github:pengchengluoyi/ds-mino 更新')
          return
        }
        setNote('正在更新')
        Promise.resolve(manager.installBundle('github:pengchengluoyi/ds-mino', { enabled: true })).then(function () {
          setNote('已更新，请完全退出后重新打开')
        }, function () {
          setNote('更新失败')
        })
      }
      return React.createElement('div', {
        style: {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: edge,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          background: 'var(--dsw-alias-bg-primary, #fff)',
        },
      }, React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px' },
      }, React.createElement('strong', null, 'DS Mino'), React.createElement('span', {
        style: { color: 'var(--dsw-alias-text-secondary, #666)', fontSize: 12 },
      }, note), React.createElement('button', {
        type: 'button',
        onClick: update,
        style: { marginLeft: 'auto', border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit' },
      }, '更新'), React.createElement('button', {
        type: 'button',
        onClick: function () { setOpened(false) },
        style: { border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit' },
      }, '关闭')), React.createElement(DsMinoFrame))
    }

    return {
      name: 'ds-mino',
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(function () {
          return ctx.slots.inject('sidebar.footer.action', function () {
            return ctx.slots.register({
              name: 'sidebar.footer.action',
              id: 'ds-mino',
              order: 20,
              label: function () { return 'DS Mino' },
            }, DsMinoEntry)
          })
        }, 'workbench entry')
        ctx.effect(function () {
          return ctx.slots.inject('shell.overlay', function () {
            return ctx.slots.register({
              name: 'shell.overlay',
              id: 'ds-mino',
              order: 40,
            }, function Layer() { return React.createElement(DsMinoLayer, { remote: ctx.remote }) })
          })
        }, 'workbench layer')
      },
    }
  },
})
