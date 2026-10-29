import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onRealtimeMessage } from '@/lib/realtime'
import { caseKeys } from '../cases/queries'

export function useAppRealtime(appId: string, projectId: string) {
  const client = useQueryClient()
  useEffect(() => onRealtimeMessage((message) => {
    if (message.type !== 'testing_task') return
    const data = message.data as Record<string, unknown> | undefined
    if (!data || data.app_id !== appId) return
    const event = String(data.event || '')
    if (event === 'task_finished' || event === 'case_finished') {
      void client.invalidateQueries({ queryKey: caseKeys.lastResults(appId) })
      if (projectId) void client.invalidateQueries({ queryKey: caseKeys.list(projectId),
        predicate: (query) => query.queryKey[3] === 'page' && query.queryKey[4] === appId && query.queryKey[7] !== 'all' })
    }
  }), [client, appId, projectId])
}
