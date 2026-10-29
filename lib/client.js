var loader = typeof globalThis !== 'undefined' ? globalThis.__ModuleLoader__ : undefined
if (loader) loader.load({
  id: 'ds-mino',
  factory(require) {
    var React = null
    try { React = require('react') } catch (error) { React = null }
    var railWide = true

    function doc() {
      return globalThis.document
    }

    /**
     * DSH Desktop's document is `dsh-app://app`, which XHR cannot use. The
     * desktop boot exposes the real HTTP host as `streamBaseUrl`; pass it to
     * the iframe so the app can call the API and WebSocket over HTTP.
     */
    function hostOrigin() {
      var transport = globalThis.__DSH_TRANSPORT__
      if (transport && typeof transport.streamBaseUrl === 'string' && /^https?:\/\//.test(transport.streamBaseUrl)) {
        return transport.streamBaseUrl.replace(/\/$/, '')
      }
      return globalThis.location.origin
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
      var frame = page.createElement('iframe')
      frame.title = 'DS Mino'
      frame.src = '/ds-mino/?api=' + encodeURIComponent(hostOrigin())
      frame.style.cssText = 'flex:1;width:100%;height:100%;border:0;display:block'
      panel.append(frame)
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
