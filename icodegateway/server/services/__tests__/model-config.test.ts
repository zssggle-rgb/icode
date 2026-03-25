import { describe, it, expect } from 'vitest'
import { ModelConfigService } from '../model-config'

describe('ModelConfigService', () => {
  describe('getActiveProvider', () => {
    it('should return dashscope as default provider', () => {
      const provider = ModelConfigService.getActiveProvider()
      expect(provider.type).toBe('dashscope')
      expect(provider.model).toBeTruthy()
    })
  })

  describe('getProviderForModel', () => {
    it('should return dashscope for glm-* models', () => {
      const provider = ModelConfigService.getProviderForModel('glm-5')
      expect(provider.type).toBe('dashscope')
    })

    it('should return ollama for qwen models', () => {
      const provider = ModelConfigService.getProviderForModel('qwen2.5-coder-27b-instruct')
      expect(provider.type).toBe('ollama')
    })
  })
})
