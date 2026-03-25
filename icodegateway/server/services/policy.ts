import fs from 'fs'
import path from 'path'
import { ModelConfig } from './model-config'

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
  cross_project_detection: {
    enabled: boolean
  }
  ai_analysis: {
    enabled: boolean
  }
  routing: {
    default_mode: 'managed' | 'passthrough'
    target_url: string
  }
  model: ModelConfig
}

const DEFAULT_POLICY: SecurityPolicy = {
  input_security: {
    enabled: true,
    block_keywords: ['private_key', 'password', 'secret', 'ak', 'sk'],
    regex_patterns: [
      'AWS_ACCESS_KEY_ID',
      'BEGIN RSA PRIVATE KEY',
      'eyJ[a-zA-Z0-9]{10,}'
    ]
  },
  output_security: {
    enabled: true,
    block_keywords: ['private_key', 'password', 'secret']
  },
  cross_project_detection: {
    enabled: true
  },
  ai_analysis: {
    enabled: true
  },
  routing: {
    default_mode: 'managed',
    target_url: 'http://localhost:18082'
  },
  model: {
    provider: 'dashscope',
    dashscope: {
      apiKey: 'sk-sp-efff9d285b6c4457b8413005924b4954',
      model: 'glm-5'
    },
    ollama: {
      url: 'http://localhost:11434',
      model: 'qwen2.5-coder-27b-instruct'
    },
    zhipu: {
      apiKey: '',
      model: 'glm-4.7'
    },
    minimax: {
      apiKey: '',
      model: 'abab6.5s-chat'
    }
  }
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'security_policy.json')

export const PolicyService = {
  currentPolicy: DEFAULT_POLICY as SecurityPolicy,

  load() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
        const loaded = JSON.parse(raw)
        this.currentPolicy = this.mergeWithDefaults(loaded)
        console.log('[PolicyService] Loaded custom policy from config.')
      } else {
        console.log('[PolicyService] Using default policy.')
        // Save defaults to disk
        this.saveToDisk()
      }
    } catch (error) {
      console.error('[PolicyService] Failed to load policy:', error)
      this.currentPolicy = DEFAULT_POLICY
    }
  },

  mergeWithDefaults(loaded: Partial<SecurityPolicy>): SecurityPolicy {
    return {
      input_security: { ...DEFAULT_POLICY.input_security, ...loaded.input_security },
      output_security: { ...DEFAULT_POLICY.output_security, ...loaded.output_security },
      cross_project_detection: { ...DEFAULT_POLICY.cross_project_detection, ...loaded.cross_project_detection },
      ai_analysis: { ...DEFAULT_POLICY.ai_analysis, ...loaded.ai_analysis },
      routing: { ...DEFAULT_POLICY.routing, ...loaded.routing },
      model: loaded.model ? { ...DEFAULT_POLICY.model, ...loaded.model } : DEFAULT_POLICY.model
    }
  },

  saveToDisk() {
    try {
      if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.currentPolicy, null, 2))
    } catch (error) {
      console.error('[PolicyService] Failed to save policy to disk:', error)
    }
  },

  get(): SecurityPolicy {
    return this.currentPolicy
  },

  update(newPolicy: Partial<SecurityPolicy>) {
    this.currentPolicy = this.mergeWithDefaults(newPolicy)
    this.saveToDisk()
    console.log('[PolicyService] Policy updated and saved to disk.')
  },

  reload() {
    this.load()
    console.log('[PolicyService] Policy reloaded from disk.')
  }
}

// Initial load
PolicyService.load()
