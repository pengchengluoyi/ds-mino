var loader = typeof globalThis !== 'undefined' ? globalThis.__ModuleLoader__ : undefined
if (loader) loader.load({
  id: 'ds-qa',
  factory(require) {
    const React = require('react')
    const ORIGIN = 'http://mino.local:50104'
    const TAB_ID = 'ds-qa'

    function WorkbenchPane() {
      const state = React.useState(false)
      const down = state[0]
      const setDown = state[1]
      return React.createElement(
        'div',
        { style: { position: 'relative', width: '100%', height: '100%', minHeight: 0 } },
        down
          ? React.createElement('p', { role: 'alert', style: { margin: 24 } }, '无法连接服务器')
          : null,
        React.createElement('iframe', {
          title: 'Workbench',
          src: ORIGIN + '/',
          style: {
            width: '100%',
            height: '100%',
            border: 0,
            display: down ? 'none' : 'block',
          },
          onError: function () { setDown(true) },
        }),
      )
    }

    return {
      name: 'ds-qa',
      inject: ['sidebarRightTabs', 'slots'],
      apply(ctx) {
        ctx.effect(function () {
          return ctx.sidebarRightTabs.register({
            id: TAB_ID,
            kind: TAB_ID,
            title: function () { return 'Workbench' },
            keepMounted: true,
            guide: [{
              id: 'open',
              order: 20,
              title: function () { return 'Workbench' },
            }],
          })
        }, 'workbench tab')
        ctx.effect(function () {
          return ctx.slots.inject('sidebar.right.pane.tab', function () {
            return ctx.slots.register(
              { name: 'sidebar.right.pane.tab', key: TAB_ID },
              WorkbenchPane,
            )
          })
        }, 'workbench body')
      },
    }
  },
})
