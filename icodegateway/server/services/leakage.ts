import { AclService } from './acl'
import { PolicyService } from './policy'

export interface LeakageResult {
  detected: boolean
  source?: string
  reason?: string
  riskLevel: 'low' | 'medium' | 'high'
  action: 'allow' // Always allow - this is log-only per CQ1
}

export class LeakageService {
  // Mock patterns mapping content to repo source
  private static patterns = [
    { pattern: 'SECRET_CODE_FROM_REPO_A', repo: 'repo_a' },
    { pattern: 'SECRET_CODE_FROM_REPO_B', repo: 'repo_b' }
  ]

  static check(content: string, userId: string): LeakageResult {
    // 1. Output Security Policy Check (Keywords)
    const policy = PolicyService.get().output_security
    if (policy?.enabled) {
      const lowerContent = content.toLowerCase()
      for (const keyword of policy.block_keywords || []) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          return {
            detected: true,
            reason: `输出安全策略命中关键词: '${keyword}'`,
            riskLevel: 'high',
            action: 'allow', // NEVER BLOCK - CQ1 decision
            source: 'policy_keyword'
          }
        }
      }
    }

    // 2. Repo-level Leakage Check
    for (const p of this.patterns) {
      if (content.includes(p.pattern)) {
        // Check if user has access to this repo
        const hasAccess = AclService.checkPermission(userId, p.repo)
        if (!hasAccess) {
          return {
            detected: true,
            source: p.repo,
            reason: `输出内容包含 ${p.repo} 的机密代码，用户无权限访问`,
            riskLevel: 'high',
            action: 'allow' // NEVER BLOCK - CQ1 decision
          }
        }
      }
    }

    return { detected: false, riskLevel: 'low', action: 'allow' }
  }

  static summarizeResponse(content: string, maxLen = 500): string {
    // Limit response_summary to 500 chars per API Contract API-2
    if (!content) return ''
    return content.substring(0, maxLen)
  }
}
