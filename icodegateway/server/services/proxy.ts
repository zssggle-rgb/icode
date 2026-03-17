import { fetch } from 'undici'
import { PolicyService } from './policy'

interface ProxyOptions {
  model?: string
  upstreamUrl?: string // Required target LLM address
  mode?: 'managed' | 'passthrough' // Default is 'managed'
}

export const ProxyService = {
  async forward(prompt: string, context: any, options: ProxyOptions = {}) {
    const model = options.model || 'unknown-model'
    const upstreamUrl = options.upstreamUrl
    const mode = options.mode || 'managed'

    console.log(`[ProxyService] Forwarding request (${mode} mode) to: ${upstreamUrl || 'MISSING_URL'} (Model: ${model})`)

    if (!upstreamUrl) {
      return { content: 'Error: Gateway misconfigured. No upstreamUrl provided for target LLM.' }
    }

    return this.forwardToUpstream(prompt, context, upstreamUrl, model, mode)
  },

  async forwardToUpstream(prompt: string, context: any, upstreamUrl: string, model: string, mode: 'managed' | 'passthrough') {
    // Note: In a real passthrough, we might need to forward original headers (Auth)
    
    const messages: any[] = [
      { role: 'user', content: prompt }
    ]
    
    // Append Context Files
    if (context?.files?.length) {
      const fileContext = context.files.map((f: any) => 
        `File: ${f.path}\nContent:\n${f.content}`
      ).join('\n\n')
      messages[0].content += `\n\nContext Files:\n${fileContext}`
    }

    try {
      const response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: false
        })
      })

       if (!response.ok) {
        const errorText = await response.text()
        console.error('[ProxyService] Upstream Error:', response.status, errorText)
        return { content: `Error: Target LLM returned ${response.status}: ${errorText}` }
      }

      const data: any = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      return this.checkOutputSecurity(content, mode)

    } catch (error) {
       console.error('[ProxyService] Network Error:', error)
       return { content: 'Error: Gateway failed to reach target LLM address.' }
    }
  },

  checkOutputSecurity(content: string, mode: 'managed' | 'passthrough') {
      // Output Security Check
      const policy = PolicyService.get().output_security
      if (policy.enabled) {
        for (const keyword of policy.block_keywords) {
          if (content.toLowerCase().includes(keyword.toLowerCase())) {
            console.warn(`[ProxyService] Sensitive output keyword detected: ${keyword}`)
            if (mode === 'managed') {
              return { content: 'Error: Output blocked by DLP policy (Sensitive content detected).' }
            } else {
               // Passthrough mode: just log, don't block
               console.log('[ProxyService] Passthrough mode: Logging output risk but NOT blocking.')
            }
          }
        }
      }
      return { content }
  }
}
