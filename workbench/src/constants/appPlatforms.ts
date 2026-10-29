/** New writes use the V5 target vocabulary. Historical labels remain readable. */
import { platformSet, targetPlatform } from './platformContract'

export interface PlatformOption {
  label: string
  value: string
  desc?: string
  icon: string
  featured?: boolean
}
export const APP_PLATFORM_OPTIONS: PlatformOption[] = [
  { label: 'Android', value: 'android', icon: '🤖' },
  { label: 'iOS', value: 'ios', icon: '📱' },
  { label: 'Web', value: 'web', icon: '🌐' },
  { label: 'Windows', value: 'win', icon: '🪟' },
  { label: 'Mac', value: 'mac', icon: '🍎' },
]
export const APP_PLATFORM_OPTIONS_ADVANCED: PlatformOption[] = []
export type PlatformInput = string | string[] | null | undefined

export function normalizePlatforms(platforms: PlatformInput): string[] {
  if (Array.isArray(platforms)) return platforms.map(String).map(p => p.trim()).filter(Boolean)
  if (typeof platforms === 'string') return platforms.split(',').map(p => p.trim()).filter(Boolean)
  return []
}
/** Presentation only: legacy Mobile has no inferred Android/iOS membership. */
export function expandPlatforms(platforms: PlatformInput): string[] {
  return [...new Set(normalizePlatforms(platforms))]
}
export const collapsePlatforms = expandPlatforms

/** Writes reject aliases and preserve every explicitly selected target. */
export function serializePlatformSelection(selected: PlatformInput): string[] {
  if (selected == null || selected === '') return []
  const values = Array.isArray(selected) ? selected : selected.split(',')
  return platformSet(values)
}
export function platformIncludes(platforms: PlatformInput, name: string): boolean {
  const target = targetPlatform(name)
  return normalizePlatforms(platforms).includes(target)
}
export function getPlatformIcon(platform: PlatformInput): string {
  return APP_PLATFORM_OPTIONS.find(p => p.value === platform)?.icon || '📱'
}
export function formatPlatformTags(platforms: PlatformInput): string[] {
  return normalizePlatforms(platforms).map(value => APP_PLATFORM_OPTIONS.find(p => p.value === value)?.label || value)
}
