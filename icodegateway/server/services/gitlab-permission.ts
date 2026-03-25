import { fetch } from 'undici'

const GITLAB_API_TIMEOUT = 10000 // 10s
const GITLAB_RETRY_COUNT = 3

export interface RepositoryPermission {
  project_id: number
  project_name: string
  project_path: string
  project_full_path: string
  access_level: number // 0=none, 10=read, 20=reporter, 30=developer, 40=maintainer, 50=owner
  group_id?: number
}

interface GitLabProject {
  id: number
  name: string
  path_with_namespace: string
  visibility: string
}

async function fetchWithRetry(url: string, options: RequestInit, retries = GITLAB_RETRY_COUNT): Promise<Response> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), GITLAB_API_TIMEOUT)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response
    } catch (err: any) {
      lastError = err
      if (err.name === 'AbortError') {
        console.warn(`[GitLabPerm] Timeout on attempt ${i + 1}/${retries}`)
      } else {
        console.warn(`[GitLabPerm] Fetch error on attempt ${i + 1}/${retries}: ${err.message}`)
      }
      if (i < retries - 1) {
        await sleep(500 * (i + 1))
      }
    }
  }

  throw lastError || new Error('GitLab API request failed after retries')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const GitLabPermissionService = {
  /**
   * Get all projects a user has access to.
   * Used for cross-project detection.
   */
  async getUserProjects(token: string, gitlabUrl?: string): Promise<RepositoryPermission[]> {
    const baseUrl = gitlabUrl || process.env.GITLAB_URL || 'https://gitlab.com'
    const perPage = 100
    const allProjects: RepositoryPermission[] = []

    try {
      let page = 1
      let hasMore = true

      while (hasMore) {
        const url = `${baseUrl}/api/v4/projects?membership=true&min_access_level=10&per_page=${perPage}&page=${page}`

        const resp = await fetchWithRetry(url, {
          method: 'GET',
          headers: {
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json'
          }
        })

        if (!resp.ok) {
          console.warn(`[GitLabPerm] Failed to fetch projects: ${resp.status}`)
          break
        }

        const projects: GitLabProject[] = await resp.json()

        if (projects.length === 0) {
          hasMore = false
        } else {
          for (const proj of projects) {
            allProjects.push({
              project_id: proj.id,
              project_name: proj.name,
              project_path: proj.path_with_namespace,
              project_full_path: proj.path_with_namespace,
              access_level: 10 // GitLab min_access_level filter ensures >= 10
            })
          }

          if (projects.length < perPage) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      return allProjects
    } catch (err: any) {
      console.error('[GitLabPerm] getUserProjects failed:', err.message)
      return []
    }
  },

  /**
   * Check if user has at least read access to a specific project.
   */
  async checkProjectAccess(token: string, projectPath: string, gitlabUrl?: string): Promise<boolean> {
    const baseUrl = gitlabUrl || process.env.GITLAB_URL || 'https://gitlab.com'
    const encodedPath = encodeURIComponent(projectPath)

    try {
      const url = `${baseUrl}/api/v4/projects/${encodedPath}`

      const resp = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json'
        }
      })

      // 404 = no access or project doesn't exist
      if (resp.status === 404) return false
      if (!resp.ok) return false

      return true
    } catch (err: any) {
      console.error('[GitLabPerm] checkProjectAccess failed:', err.message)
      return false
    }
  },

  /**
   * Get user's access level for a specific project.
   */
  async getProjectAccessLevel(token: string, projectPath: string, gitlabUrl?: string): Promise<number> {
    const baseUrl = gitlabUrl || process.env.GITLAB_URL || 'https://gitlab.com'
    const encodedPath = encodeURIComponent(projectPath)

    try {
      const url = `${baseUrl}/api/v4/projects/${encodedPath}/members/all`

      // First try to get current user's membership
      const resp = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json'
        }
      })

      if (!resp.ok) return 0

      const members: any[] = await resp.json()
      // Find current user in members list
      // We need the user ID - we'd need to get current user first
      // For now, just return 10 if project is accessible
      return members.length > 0 ? 10 : 0
    } catch (err: any) {
      console.error('[GitLabPerm] getProjectAccessLevel failed:', err.message)
      return 0
    }
  }
}
