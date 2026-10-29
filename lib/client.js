window.__ModuleLoader__.load({
  id: 'ds-qa',
  factory(require) {
    const React = require('react')
    const ORIGIN = 'http://mino.local:50104'
    const TAB_ID = 'ds-qa'

    function WorkbenchPane() {
      const [down, setDown] = React.useState(false)
      return React.createElement(
        'div',
        { style: { position: 'relative', width: '100%', height: '100%', minHeight: 0 } },
        down
          ? React.createElement(
              'p',
              { role: 'alert', style: { margin: 24 } },
              '无法连接服务器',
            )
          : null,
        React.createElement('iframe', {
          title: 'Workbench',
          src: `${ORIGIN}/`,
          style: {
            width: '100%',
            height: '100%',
            border: 0,
            display: down ? 'none' : 'block',
          },
          onError: () => setDown(true),
        }),
      )
    }

    return {
      name: 'ds-qa',
      inject: ['sidebarRightTabs', 'slots', 'sidebarRight'],
      apply(ctx) {
        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: TAB_ID,
              kind: TAB_ID,
              title: () => 'Workbench',
              keepMounted: true,
              guide: { order: 20, title: () => 'Workbench' },
            }),
          'workbench tab',
        )
        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register(
                { name: 'sidebar.right.pane.tab', key: TAB_ID },
                WorkbenchPane,
              ),
            ),
          'workbench body',
        )
        ctx.effect(() => {
          ctx.sidebarRight.openTab(TAB_ID, { revealIfOpened: true })
          return () => {}
        }, 'open workbench')
      },
    }
  },
})
