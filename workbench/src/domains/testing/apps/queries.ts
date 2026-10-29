import { useQuery } from '@tanstack/react-query'
import { getProjects } from '@/api/project'
import { unwrapList } from '@/lib/unwrap'
import type { ProjectRow } from '@/types/project'

export const projectKeys = {
  all: ['projects'] as const,
}

export const useProjects = () =>
  useQuery({
    queryKey: projectKeys.all,
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectRow[]> =>
      unwrapList<ProjectRow>(await getProjects(), { keys: ['projects'], label: 'GET /project/list' }),
  })
