import { fetch } from 'undici'

const GITLAB_API_TIMEOUT = 10000 // 10s
const GITLAB_RETRY_COUNT = 3

interface GitLabUser {
  id: number
  username: string
  name: string
  email: string
  avatar_url?: string
}

interface GitLabAuthResult {
  valid: boolean
  user?: GitLabUser
  error?: string
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
        console.warn(`[GitLabAuth] Timeout on attempt ${i + 1}/${retries}`)
      } else {
        console.warn(`[GitLabAuth] Fetch error on attempt ${i + 1}/${retries}: ${err.message}`)
      }
      if (i < retries - 1) {
        await sleep(500 * (i + 1)) // exponential backoff
      }
    }
  }

  throw lastError || new Error('GitLab API request failed after retries')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const GitLabAuthService = {
  /**
   * Validate a GitLab Personal Access Token and return user info.
   * @param token - GitLab PAT (glpat-xxxx or raw token)
   * @param gitlabUrl - GitLab instance URL (default: https://gitlab.com)
   */
  async validateToken(token: string, gitlabUrl?: string): Promise<GitLabAuthResult> {
    if (!token || token.trim() === '') {
      return { valid: false, error: 'Token is empty' }
    }

    const baseUrl = gitlabUrl || process.env.GITLAB_URL || 'https://gitlab.com'
    const url = `${baseUrl}/api/v4/user`

    try {
      const resp = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json'
        }
      })

      if (resp.status === 401) {
        return { valid: false, error: 'GitLab Token 无效或已过期' }
      }

      if (resp.status === 403) {
        return { valid: false, error: 'GitLab Token 权限不足' }
      }

      if (!resp.ok) {
        return { valid: false, error: `GitLab API 错误: ${resp.status}` }
      }

      const user: GitLabUser = await resp.json()

      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url
        }
      }
    } catch (err: any) {
      console.error('[GitLabAuth] Token validation failed:', err.message)
      return { valid: false, error: `GitLab API 请求失败: ${err.message}` }
    }
  }
}
