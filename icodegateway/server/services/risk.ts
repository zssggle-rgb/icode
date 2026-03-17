
import { PolicyService } from './policy'

export const RiskService = {
  evaluate(prompt: string): { riskLevel: 'low' | 'high', reason?: string } {
    const policy = PolicyService.get().input_security
    
    if (!policy.enabled) {
      return { riskLevel: 'low' }
    }

    const lowerPrompt = prompt.toLowerCase()
    
    // 1. Keyword Check
    for (const keyword of policy.block_keywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        return { riskLevel: 'high', reason: 'Blocked keyword found: ' + keyword }
      }
    }

    // 2. Regex Check
    for (const pattern of policy.regex_patterns) {
      try {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(prompt)) {
          return { riskLevel: 'high', reason: 'Sensitive pattern matched: ' + pattern }
        }
      } catch (e) {
        console.error('Invalid regex pattern in policy:', pattern)
      }
    }

    return { riskLevel: 'low' }
  }
}
