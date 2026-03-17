
import { db } from '../db'
import { auditLogs } from '../db/schema'
import { eq } from 'drizzle-orm'
import { ZhipuService } from './zhipu'
import { PolicyService } from './policy'

export const AnalysisService = {
  async analyze(logId: string, prompt: string, response: string) {
    console.log(`[AnalysisService] Starting async analysis for log: ${logId}`)

    const policy = PolicyService.get()
    if (!policy.ai_analysis.enabled) {
      console.log(`[AnalysisService] AI Analysis is disabled in policy. Skipping for log: ${logId}`)
      return
    }
    
    // 1. Construct Security Audit Prompt
    const analysisPrompt = `
      You are an AI Security Auditor for iCode Gateway.
      Analyze the following interaction (User Prompt + AI Response) for security risks.
      
      Focus on:
      1. Sensitive Data Leakage (API Keys, Credentials, Internal IPs, PII)
      2. Dangerous Commands (System modification, reverse shells, malware)
      3. Vulnerable Code Patterns (SQL Injection, XSS, RCE)
      4. Social Engineering / Jailbreak Attempts

      User Prompt:
      """
      ${prompt.substring(0, 2000)}
      """

      AI Response:
      """
      ${response.substring(0, 2000)}
      """

      Output strict JSON format ONLY:
      {
        "risk_level": "low" | "medium" | "high",
        "reason": "Brief explanation of the risk (max 1 sentence)",
        "tags": ["tag1", "tag2"]
      }
    `

    try {
      // 2. Call GLM-4.7 directly for AI analysis
      const resultContent = await ZhipuService.call(
        analysisPrompt,
        'You are a strict security auditor. Output JSON only.'
      )

      // 3. Parse Result
      let analysisResult
      try {
        // Clean markdown code blocks if present
        const jsonContent = resultContent.replace(/```json\n?|\n?```/g, '').trim()
        analysisResult = JSON.parse(jsonContent)
      } catch (e) {
        console.warn('[AnalysisService] Failed to parse JSON:', resultContent)
        analysisResult = { risk_level: 'unknown', reason: 'Failed to parse AI analysis', tags: [] }
      }

      console.log(`[AnalysisService] Analysis Result for ${logId}:`, analysisResult)

      // 4. Update Audit Log
      // Fetch existing log to merge metadata
      const existingLog = await db.select().from(auditLogs).where(eq(auditLogs.id, logId)).get()
      
      if (existingLog) {
        let metadata: any = {}
        try {
          metadata = existingLog.metadata ? JSON.parse(existingLog.metadata) : {}
        } catch (e) {}

        metadata.ai_analysis = analysisResult
        
        // If high risk, we might want to update the top-level risk_level column too
        // But let's keep the original risk_level (from Sync Risk Engine) and store AI result in metadata/ai_risk_level if needed
        // Or update it if AI finds something the regex missed.
        
        const newRiskLevel = (analysisResult.risk_level === 'high' || analysisResult.risk_level === 'medium') 
          ? analysisResult.risk_level 
          : existingLog.risk_level

        await db.update(auditLogs).set({
          metadata: JSON.stringify(metadata),
          risk_level: newRiskLevel // Upgrade risk level if AI finds issues
        }).where(eq(auditLogs.id, logId))
      }

    } catch (error) {
      console.error('[AnalysisService] Analysis Failed:', error)
    }
  }
}
