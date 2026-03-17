import jwt from 'jsonwebtoken'
import { fetch } from 'undici'
import { config } from 'dotenv'

config()

const API_KEY = process.env.ZHIPU_API_KEY || ''
const API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export function generateZhipuToken(apiKey: string): string {
  if (!apiKey) return ''
  const [id, secret] = apiKey.split('.')
  if (!id || !secret) return ''

  const payload = {
    api_key: id,
    exp: Date.now() + 3600 * 1000,
    timestamp: Date.now(),
  }

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    header: { alg: 'HS256', sign_type: 'SIGN' } as any
  })
}

export const ZhipuService = {
  async call(prompt: string, systemPrompt?: string) {
    if (!API_KEY) {
      throw new Error('Missing ZHIPU_API_KEY')
    }

    const token = generateZhipuToken(API_KEY)
    if (!token) {
      throw new Error('Invalid ZHIPU_API_KEY format')
    }

    const messages = [
      { role: 'system', content: systemPrompt || 'You are an AI assistant.' },
      { role: 'user', content: prompt }
    ]

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: messages,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Zhipu API returned ${response.status}: ${errorText}`)
    }

    const data: any = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }
}
