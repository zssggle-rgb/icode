
import fs from 'fs'
import path from 'path'

export interface SecurityPolicy {
  input_security: {
    enabled: boolean
    block_keywords: string[]
    regex_patterns: string[]
  }
  output_security: {
    enabled: boolean
    block_keywords: string[]
  }
  ai_analysis: {
    enabled: boolean
  }
  routing: {
    default_mode: 'managed' | 'passthrough'
    target_url: string
  }
}

const DEFAULT_POLICY: SecurityPolicy = {
  input_security: {
    enabled: true,
    block_keywords: ['private_key', 'password', 'secret', 'ak', 'sk'],
    regex_patterns: [
      'AWS_ACCESS_KEY_ID',
      'BEGIN RSA PRIVATE KEY',
      'eyJ[a-zA-Z0-9]{10,}' // Potential JWT
    ]
  },
  output_security: {
    enabled: true,
    block_keywords: ['private_key', 'password', 'secret']
  },
  ai_analysis: {
    enabled: true
  },
  routing: {
    default_mode: 'managed',
    target_url: 'http://localhost:18082'
  }
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'security_policy.json')

export const PolicyService = {
  currentPolicy: DEFAULT_POLICY,

  load() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
        this.currentPolicy = { ...DEFAULT_POLICY, ...JSON.parse(raw) }
        console.log('[PolicyService] Loaded custom policy from config.')
      } else {
        console.log('[PolicyService] Using default policy.')
      }
    } catch (error) {
      console.error('[PolicyService] Failed to load policy:', error)
      this.currentPolicy = DEFAULT_POLICY
    }
  },

  get() {
    return this.currentPolicy
  },

  update(newPolicy: Partial<SecurityPolicy>) {
    this.currentPolicy = { ...this.currentPolicy, ...newPolicy }
    try {
      if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.currentPolicy, null, 2))
      console.log('[PolicyService] Policy updated and saved to disk.')
    } catch (error) {
      console.error('[PolicyService] Failed to save policy to disk:', error)
    }
  }
}

// Initial load
PolicyService.load()
