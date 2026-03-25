import { GitLabPermissionService } from './gitlab-permission'
import { PolicyService } from './policy'

export interface CrossProjectResult {
  detected: boolean
  target_repo?: string
  user_permission?: 'none' | 'read' | 'write' | 'admin'
  risk_level?: 'low' | 'medium' | 'high'
}

// Cache user projects for 1 hour (refreshed by background task per AD4)
const projectCache = new Map<string, { projects: string[], expires_at: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export const CrossProjectService = {
  /**
   * Detect if prompt attempts to access a project the user doesn't have permission for.
   * Returns result but NEVER blocks - only logs and marks.
   */
  async detect(prompt: string, gitlabToken: string, gitlabUrl?: string): Promise<CrossProjectResult> {
    const policy = PolicyService.get()

    if (!policy.cross_project_detection?.enabled) {
      return { detected: false }
    }

    try {
      // Get user's accessible projects from cache or GitLab API
      const cacheKey = gitlabToken
      const cached = projectCache.get(cacheKey)

      let userProjects: string[] = []
      if (cached && cached.expires_at > Date.now()) {
        userProjects = cached.projects
      } else {
        const repos = await GitLabPermissionService.getUserProjects(gitlabToken, gitlabUrl)
        userProjects = repos.map(r => r.project_name.toLowerCase())
        projectCache.set(cacheKey, {
          projects: userProjects,
          expires_at: Date.now() + CACHE_TTL
        })
      }

      // Extract project names mentioned in the prompt
      const mentionedProjects = this.extractProjectNames(prompt)

      for (const mentioned of mentionedProjects) {
        const mentionedLower = mentioned.toLowerCase()
        const hasAccess = userProjects.some(
          p => p === mentionedLower || p.endsWith('/' + mentionedLower) || p.includes('/' + mentionedLower + '/')
        )

        if (!hasAccess) {
          return {
            detected: true,
            target_repo: mentioned,
            user_permission: 'none',
            risk_level: 'high'
          }
        }
      }

      return { detected: false }
    } catch (err: any) {
      console.error('[CrossProject] detection failed:', err.message)
      // On error, don't block - just return no detection
      return { detected: false }
    }
  },

  /**
   * Simple heuristic to extract potential project names from text.
   * Looks for patterns like "repo_b", "project-x", "my-project" etc.
   */
  extractProjectNames(text: string): string[] {
    const names: string[] = []

    // Common patterns: repo_name, project-name, group/project
    // Look for words adjacent to sensitive keywords
    const sensitiveContext = [
      'repo', 'repository', 'project', '代码库', '仓库',
      'show me', 'look at', 'access', 'read', '查看',
      'what is in', 'contents of', '文件', '代码'
    ]

    const words = text.toLowerCase().split(/\s+/)
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^a-z0-9_\-\/.]/g, '')

      // Check if word appears near sensitive context
      const nearby = words.slice(Math.max(0, i - 3), Math.min(words.length, i + 4)).join(' ')
      const isNearSensitive = sensitiveContext.some(ctx => nearby.includes(ctx))

      // Heuristic: words that look like project names
      if ((word.length > 3 && /^[a-z][a-z0-9_\-]+$/i.test(word)) || word.includes('/')) {
        // Filter out common English words
        const commonWords = ['the', 'and', 'for', 'file', 'code', 'this', 'that', 'what', 'where', 'how', 'show']
        if (!commonWords.includes(word.toLowerCase())) {
          names.push(word)
        }
      }
    }

    // Deduplicate
    return [...new Set(names)]
  },

  /**
   * Clear project cache (for testing or forced refresh).
   */
  clearCache() {
    projectCache.clear()
  }
}
