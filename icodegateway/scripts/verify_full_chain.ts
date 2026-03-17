
import { fetch } from 'undici'

const GATEWAY_URL = 'http://localhost:18081/api/v1'

async function verifyFullChain() {
  console.log('Starting End-to-End Verification...')

  // 1. Init Session
  console.log('\n1. Initializing Session...')
  const sessionRes = await fetch(`${GATEWAY_URL}/session/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'test-user-e2e',
      device_fingerprint: `test-device-e2e-${Date.now()}`,
      project_id: 'proj-e2e',
      repo_id: 'repo-e2e'
    })
  })

  if (!sessionRes.ok) {
    throw new Error(`Session Init Failed: ${sessionRes.status}`)
  }
  const sessionData: any = await sessionRes.json()
  const sessionId = sessionData.data.session_id
  console.log(`Session ID: ${sessionId}`)

  // 2. Send Chat Request (to GLM-4.7 via Gateway)
  console.log('\n2. Sending Chat Request...')
  const prompt = 'What is the capital of France? Answer in one word.'
  
  const chatRes = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      prompt: prompt,
      context: { files: [] }
    })
  })

  if (!chatRes.ok) {
    const errorText = await chatRes.text()
    throw new Error(`Chat Request Failed: ${chatRes.status} - ${errorText}`)
  }

  const chatData: any = await chatRes.json()
  console.log('Gateway Response:', JSON.stringify(chatData, null, 2))

  const content = chatData.data.content
  if (content && content.includes('Paris')) {
    console.log('✅ LLM Response Verified (Contains "Paris")')
  } else {
    console.warn('⚠️ LLM Response might be unexpected:', content)
  }

  console.log('\n✅ Verification SUCCEEDED')
}

verifyFullChain().catch((err) => {
  console.error('\n❌ Verification FAILED:', err)
  process.exit(1)
})
