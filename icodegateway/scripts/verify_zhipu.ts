
import { ProxyService } from '../server/services/proxy'
import { config } from 'dotenv'

config()

async function testZhipu() {
  console.log('Testing Zhipu GLM-4 Integration...')
  
  const prompt = 'Write a simple Hello World function in Python.'
  const context = { files: [] }

  console.log(`Prompt: ${prompt}`)
  
  const result = await ProxyService.forward(prompt, context)
  
  console.log('--- Result ---')
  console.log(result.content)
  console.log('--------------')
}

testZhipu().catch(console.error)
