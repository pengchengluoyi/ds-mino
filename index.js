export const name = 'ds-qa'

export function apply(ctx) {
  const log = ctx.logger?.info?.bind(ctx.logger) || console.info
  log('[ds-qa] Workbench 插件已加载')
}
