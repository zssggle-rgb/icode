import { PolicyService } from './policy'

export interface RiskResult {
  riskLevel: 'low' | 'medium' | 'high'
  reason?: string
  action: 'allow' // Always allow - this is log-only per CQ1
  matchedKeyword?: string
  matchedPattern?: string
}

export const RiskService = {
  /**
   * Evaluate prompt for security risks.
   * PER CQ1: This is LOG-ONLY mode - never blocks, always returns action: 'allow'.
   * The risk_level is used for logging and alerting purposes only.
   */
  evaluate(prompt: string): RiskResult {
    const policy = PolicyService.get().input_security

    if (!policy.enabled) {
      return { riskLevel: 'low', action: 'allow' }
    }

    const lowerPrompt = prompt.toLowerCase()

    // 1. Keyword Check - medium or high based on keyword severity
    for (const keyword of policy.block_keywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        // High severity keywords
        const highSeverity = ['private_key', 'password', 'secret', 'ak', 'sk', 'api_key', 'apikey', 'token', 'jwt']
        const isHighSeverity = highSeverity.some(k => keyword.toLowerCase().includes(k))

        return {
          riskLevel: isHighSeverity ? 'high' : 'medium',
          reason: `敏感关键词命中: ${keyword}`,
          action: 'allow', // NEVER BLOCK - CQ1 decision
          matchedKeyword: keyword
        }
      }
    }

    // 2. Regex Check
    for (const pattern of policy.regex_patterns) {
      try {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(prompt)) {
          return {
            riskLevel: 'high',
            reason: `敏感正则模式匹配: ${pattern}`,
            action: 'allow', // NEVER BLOCK - CQ1 decision
            matchedPattern: pattern
          }
        }
      } catch (e) {
        console.error('Invalid regex pattern in policy:', pattern)
      }
    }

    return { riskLevel: 'low', action: 'allow' }
  }
}
