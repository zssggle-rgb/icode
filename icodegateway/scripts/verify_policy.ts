
import { RiskService } from '../server/services/risk'
import { PolicyService } from '../server/services/policy'

console.log('--- Testing Risk Service with Policies ---')

// 1. Test Default Policy (should block 'private_key')
console.log('Test 1: Default Policy')
const result1 = RiskService.evaluate('Here is my private_key')
console.log(`Input: "Here is my private_key" -> Risk: ${result1.riskLevel}, Reason: ${result1.reason}`)

// 2. Test Custom Policy (add new keyword 'foobar')
console.log('\nTest 2: Custom Policy (Dynamic Update)')
PolicyService.update({
  input_security: {
    enabled: true,
    block_keywords: ['foobar'], // Override keywords
    regex_patterns: []
  }
})

const result2 = RiskService.evaluate('This contains foobar')
console.log(`Input: "This contains foobar" -> Risk: ${result2.riskLevel}, Reason: ${result2.reason}`)

const result3 = RiskService.evaluate('Here is my private_key')
console.log(`Input: "Here is my private_key" -> Risk: ${result3.riskLevel} (Should be low now as we removed it)`)

// 3. Test Regex
console.log('\nTest 3: Regex Pattern')
PolicyService.update({
  input_security: {
    enabled: true,
    block_keywords: [],
    regex_patterns: ['^Start.*End$']
  }
})

const result4 = RiskService.evaluate('Start this is a test End')
console.log(`Input: "Start this is a test End" -> Risk: ${result4.riskLevel}, Reason: ${result4.reason}`)

console.log('--- Verification Complete ---')
