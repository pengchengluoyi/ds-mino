export const name = 'ds-mino'

export function apply(ctx) {
  const log = ctx.logger?.info?.bind(ctx.logger) || console.info
  log('[ds-mino] 插件已加载')
}
