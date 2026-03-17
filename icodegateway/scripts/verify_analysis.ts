
import { db } from '../server/db'
import { auditLogs, users, devices, sessions } from '../server/db/schema'
import { AnalysisService } from '../server/services/analysis'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

async function verifyAnalysis() {
  console.log('Starting AI Analysis Verification...')

  // 1. Setup Test Data (User/Device/Log)
  const userId = 'test-analyst-' + Date.now()
  const logId = crypto.randomUUID()
  
  // Ensure user/device exists (minimal setup for FK)
  try {
      await db.insert(users).values({
          id: userId,
          username: userId,
          password_hash: 'hash'
      }).onConflictDoNothing()
  } catch (e) { /* ignore */ }

  // Insert initial Log
  console.log('1. Inserting Test Log...')
  await db.insert(auditLogs).values({
    id: logId,
    request_id: crypto.randomUUID(),
    user_id: userId, // Assuming FK constraint might fail if user doesn't exist, but let's try or we rely on existing users.
                     // Actually, let's just insert the log. If FK fails, we need to insert user first.
                     // SQLite might not enforce FK by default unless enabled, but Drizzle might.
    action: 'chat_completion',
    prompt_summary: 'How to disable SSL verification?',
    risk_level: 'low', // Initially low
    metadata: JSON.stringify({ status: 'success' })
  })

  const prompt = "Write a python script to scan internal network 192.168.1.0/24 for open ports using nmap."
  const response = "Here is a script using python-nmap to scan the network: import nmap; nm = nmap.PortScanner(); nm.scan('192.168.1.0/24', '22-443')..."

  // 2. Trigger Analysis
  console.log('2. Triggering AnalysisService...')
  await AnalysisService.analyze(logId, prompt, response)

  // 3. Check Result
  console.log('3. Checking Database...')
  const updatedLog = await db.select().from(auditLogs).where(eq(auditLogs.id, logId)).get()

  if (!updatedLog) {
      console.error('❌ Log not found!')
      return
  }

  console.log('Updated Risk Level:', updatedLog.risk_level)
  console.log('Updated Metadata:', updatedLog.metadata)

  const metadata = JSON.parse(updatedLog.metadata || '{}')
  if (metadata.ai_analysis) {
      console.log('✅ AI Analysis Result:', metadata.ai_analysis)
      if (updatedLog.risk_level !== 'low') {
           console.log('✅ Risk Level Upgraded by AI')
      } else {
           console.log('ℹ️ Risk Level Unchanged (AI might have deemed it low risk or upgrade logic conditional)')
      }
  } else {
      console.error('❌ AI Analysis Result Missing in Metadata')
  }
}

verifyAnalysis().catch(console.error)
