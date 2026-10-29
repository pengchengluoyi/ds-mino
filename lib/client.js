var loader = typeof globalThis !== 'undefined' ? globalThis.__ModuleLoader__ : undefined
if (loader) loader.load({
  id: 'ds-mino',
  factory(require) {
    var React = null
    try { React = require('react') } catch (error) { React = null }
    var railWide = true
    var remote = null

    function doc() {
      return globalThis.document
    }

    function sidebarRight() {
      var page = doc()
      if (!page) return railWide ? 280 : 72
      var button = page.querySelector('button[title="DS Mino"]')
      var edge = button ? button.getBoundingClientRect().right : (railWide ? 280 : 72)
      var node = button && button.parentElement
      while (node && node !== page.body) {
        var rect = node.getBoundingClientRect()
        if (rect.width >= 48 && rect.width <= 420 && rect.left < 40 && rect.height > 200) edge = rect.right
        node = node.parentElement
      }
      return edge
    }

    function closePanel() {
      var page = doc()
      var panel = page && page.getElementById('ds-mino-panel')
      if (panel) panel.remove()
    }

    function openPanel() {
      var page = doc()
      if (!page || !page.body) return
      closePanel()
      var panel = page.createElement('div')
      panel.id = 'ds-mino-panel'
      panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;z-index:2147483000;display:flex;flex-direction:column;background:#fff;left:' + sidebarRight() + 'px'
      var bar = page.createElement('div')
      bar.style.cssText = 'display:flex;align-items:center;height:44px;padding:0 12px;flex:none'
      var title = page.createElement('strong')
      title.textContent = 'DS Mino'
      var update = page.createElement('button')
      update.type = 'button'
      update.textContent = '更新'
      update.style.cssText = 'margin-left:auto;border:0;background:transparent;cursor:pointer;font:inherit'
      update.onclick = function () {
        var manager = remote && remote.pluginManager
        if (!manager || !manager.installBundle) return
        update.disabled = true
        update.textContent = '更新中'
        Promise.resolve(manager.installBundle('github:pengchengluoyi/ds-mino', { enabled: true })).then(function () {
          update.textContent = '已更新，请退出重开'
        }, function () {
          update.disabled = false
          update.textContent = '更新失败'
        })
      }
      var close = page.createElement('button')
      close.type = 'button'
      close.textContent = '关闭'
      close.style.cssText = 'border:0;background:transparent;cursor:pointer;font:inherit'
      close.onclick = closePanel
      var frame = page.createElement('iframe')
      frame.title = 'DS Mino'
      frame.src = '/ds-mino/'
      frame.style.cssText = 'flex:1;width:100%;border:0'
      bar.append(title, update, close)
      panel.append(bar, frame)
      page.body.appendChild(panel)
    }

    function Entry(props) {
      if (!React) return null
      railWide = !props || props.wide !== false
      return React.createElement('button', {
        type: 'button',
        title: 'DS Mino',
        onClick: function (event) {
          if (event && event.preventDefault) event.preventDefault()
          if (event && event.stopPropagation) event.stopPropagation()
          try {
            var page = doc()
            if (page && page.getElementById('ds-mino-panel')) closePanel()
            else openPanel()
          } catch (error) {}
        },
        style: {
          display: 'flex',
          alignItems: 'center',
          width: railWide ? '100%' : 36,
          height: 36,
          padding: railWide ? '0 10px' : 0,
          justifyContent: railWide ? 'flex-start' : 'center',
          border: 0,
          borderRadius: 8,
          cursor: 'pointer',
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
        },
      }, railWide ? 'DS Mino' : 'DS')
    }

    return {
      name: 'ds-mino',
      inject: ['slots'],
      apply(ctx) {
        try { remote = ctx.remote || null } catch (error) { remote = null }
        try {
          ctx.slots.inject('sidebar.footer.action', function () {
            return ctx.slots.register({
              name: 'sidebar.footer.action',
              id: 'ds-mino',
              order: 20,
              label: function () { return 'DS Mino' },
            }, Entry)
          })
        } catch (error) {}
      },
    }
  },
})
