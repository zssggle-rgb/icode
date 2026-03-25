import fs from 'fs'
import path from 'path'
import { PolicyService } from './policy'

export interface ModelProvider {
  type: 'dashscope' | 'ollama' | 'zhipu' | 'minimax'
  apiKey?: string
  url?: string
  model: string
}

export interface ModelConfig {
  provider: string // 'dashscope' | 'ollama' | 'zhipu' | 'minimax'
  dashscope?: {
    apiKey: string
    model: string
  }
  ollama?: {
    url: string
    model: string
  }
  zhipu?: {
    apiKey: string
    model: string
  }
  minimax?: {
    apiKey: string
    model: string
  }
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
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

// Resolve provider config from policy or defaults
function getProviderConfig(provider: string): ModelProvider {
  const policy = PolicyService.get()
  const modelPolicy = policy.model || {}

  if (provider === 'dashscope') {
    return {
      type: 'dashscope',
      apiKey: modelPolicy.dashscope?.apiKey || DEFAULT_MODEL_CONFIG.dashscope!.apiKey,
      model: modelPolicy.dashscope?.model || DEFAULT_MODEL_CONFIG.dashscope!.model
    }
  }

  if (provider === 'ollama') {
    return {
      type: 'ollama',
      url: modelPolicy.ollama?.url || DEFAULT_MODEL_CONFIG.ollama!.url,
      model: modelPolicy.ollama?.model || DEFAULT_MODEL_CONFIG.ollama!.model
    }
  }

  if (provider === 'zhipu') {
    return {
      type: 'zhipu',
      apiKey: modelPolicy.zhipu?.apiKey || DEFAULT_MODEL_CONFIG.zhipu!.apiKey,
      model: modelPolicy.zhipu?.model || DEFAULT_MODEL_CONFIG.zhipu!.model
    }
  }

  if (provider === 'minimax') {
    return {
      type: 'minimax',
      apiKey: modelPolicy.minimax?.apiKey || DEFAULT_MODEL_CONFIG.minimax!.apiKey,
      model: modelPolicy.minimax?.model || DEFAULT_MODEL_CONFIG.minimax!.model
    }
  }

  // Default fallback to dashscope
  return getProviderConfig('dashscope')
}

function getDefaultProvider(): string {
  const policy = PolicyService.get()
  return policy.model?.provider || 'dashscope'
}

function getUpstreamUrl(provider: ModelProvider): string {
  switch (provider.type) {
    case 'dashscope':
      return 'https://coding.dashscope.aliyuncs.com/v1/chat/completions'
    case 'ollama':
      return `${provider.url}/api/chat`
    case 'zhipu':
      return 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    case 'minimax':
      return 'https://api.minimax.chat/v1/text/chatcompletion_v2'
    default:
      return 'https://coding.dashscope.aliyuncs.com/v1/chat/completions'
  }
}

export const ModelConfigService = {
  getActiveProvider(): ModelProvider {
    const provider = getDefaultProvider()
    return getProviderConfig(provider)
  },

  getProviderForModel(modelName: string): ModelProvider {
    // Try to match by model name prefix or exact match
    const policy = PolicyService.get()
    const modelPolicy = policy.model || {}

    // Check each provider's model
    if (modelPolicy.dashscope?.model === modelName) {
      return getProviderConfig('dashscope')
    }
    if (modelPolicy.ollama?.model === modelName) {
      return getProviderConfig('ollama')
    }
    if (modelPolicy.zhipu?.model === modelName) {
      return getProviderConfig('zhipu')
    }
    if (modelPolicy.minimax?.model === modelName) {
      return getProviderConfig('minimax')
    }

    // Fallback: try to guess from model name patterns
    if (modelName.startsWith('glm-')) {
      return getProviderConfig('dashscope')
    }
    if (modelName.startsWith('qwen') || modelName.includes('ollama')) {
      return getProviderConfig('ollama')
    }

    // Default
    return this.getActiveProvider()
  },

  getUpstreamUrlForModel(modelName: string): string {
    const provider = this.getProviderForModel(modelName)
    return getUpstreamUrl(provider)
  },

  getAuthHeader(provider: ModelProvider, authToken?: string): Record<string, string> {
    switch (provider.type) {
      case 'dashscope':
        return { 'Authorization': `Bearer ${provider.apiKey}` }
      case 'ollama':
        return {} // No auth by default
      case 'zhipu':
        // Zhipu uses JWT token generation
        return { 'Authorization': `Bearer ${authToken || provider.apiKey}` }
      case 'minimax':
        return { 'Authorization': `Bearer ${provider.apiKey}` }
      default:
        return {}
    }
  },

  buildUpstreamBody(provider: ModelProvider, body: any): any {
    // Zhipu needs specific model name
    if (provider.type === 'zhipu') {
      return { ...body, model: provider.model }
    }
    return body
  },

  getDefaultModel(): string {
    return this.getActiveProvider().model
  },

  getProviderType(): string {
    return this.getActiveProvider().type
  }
}
