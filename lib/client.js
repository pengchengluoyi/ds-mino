var loader = typeof globalThis !== 'undefined' ? globalThis.__ModuleLoader__ : undefined
if (loader) loader.load({
  id: 'ds-mino',
  factory(require) {
    var railWide = true
    var remote = null

    function sidebarRight() {
      var button = document.querySelector('button[title="DS Mino"]')
      if (!button) return railWide ? 280 : 72
      var edge = button.getBoundingClientRect().right
      var node = button.parentElement
      while (node && node !== document.body) {
        var rect = node.getBoundingClientRect()
        if (rect.width >= 48 && rect.width <= 420 && rect.left < 40 && rect.height > 200) edge = rect.right
        node = node.parentElement
      }
      return edge
    }

    function closePanel() {
      var panel = document.getElementById('ds-mino-panel')
      if (panel) panel.remove()
    }

    function openPanel() {
      closePanel()
      var left = sidebarRight()
      var panel = document.createElement('div')
      panel.id = 'ds-mino-panel'
      panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;z-index:2147483000;display:flex;flex-direction:column;background:#fff;left:' + left + 'px'
      var bar = document.createElement('div')
      bar.style.cssText = 'display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;flex:none'
      var title = document.createElement('strong')
      title.textContent = 'DS Mino'
      var note = document.createElement('span')
      note.style.cssText = 'color:#666;font-size:12px'
      var update = document.createElement('button')
      update.type = 'button'
      update.textContent = '更新'
      update.style.cssText = 'margin-left:auto;border:0;background:transparent;cursor:pointer;font:inherit'
      update.onclick = function () {
        var manager = remote && remote.pluginManager
        if (!manager) {
          note.textContent = '在插件页用 github:pengchengluoyi/ds-mino 更新'
          return
        }
        note.textContent = '正在更新'
        Promise.resolve(manager.installBundle('github:pengchengluoyi/ds-mino', { enabled: true })).then(function () {
          note.textContent = '已更新，请完全退出后重新打开'
        }, function () {
          note.textContent = '更新失败'
        })
      }
      var close = document.createElement('button')
      close.type = 'button'
      close.textContent = '关闭'
      close.style.cssText = 'border:0;background:transparent;cursor:pointer;font:inherit'
      close.onclick = closePanel
      var frame = document.createElement('iframe')
      frame.title = 'DS Mino'
      frame.src = '/ds-mino/'
      frame.style.cssText = 'flex:1;width:100%;border:0'
      bar.append(title, note, update, close)
      panel.append(bar, frame)
      document.body.appendChild(panel)
    }

    function togglePanel() {
      if (document.getElementById('ds-mino-panel')) closePanel()
      else openPanel()
    }

    return {
      name: 'ds-mino',
      inject: ['slots'],
      apply(ctx) {
        remote = ctx.remote || null
        ctx.effect(function () {
          return ctx.slots.inject('sidebar.footer.action', function () {
            return ctx.slots.register({
              name: 'sidebar.footer.action',
              id: 'ds-mino',
              order: 20,
              label: function () { return 'DS Mino' },
            }, function Entry(props) {
              railWide = props.wide !== false
              var React = require('react')
              return React.createElement('button', {
                type: 'button',
                title: 'DS Mino',
                onClick: function (event) {
                  event.preventDefault()
                  event.stopPropagation()
                  togglePanel()
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
            })
          })
        }, 'ds-mino entry')
      },
    }
  },
})
