export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { response: responseToEval, criteria } = req.body
  
  try {
    const evalPrompt = `You are a rigorous evaluation assistant. Your job is to objectively verify whether a response meets specific criteria.

CRITERIA TO VERIFY:
${criteria}

RESPONSE TO EVALUATE:
${responseToEval}

EVALUATION PROCESS - Follow these steps strictly:

Step 1: ANALYZE BEFORE JUDGING
- Break down the criteria into individual, testable requirements
- For each requirement, examine the response and gather evidence
- If criteria involves counting/measuring (syllables, words, lines, characters, items, etc.), you MUST count/measure explicitly in the response and show your work
- Do NOT assume any claims are true - verify everything verifiable
- Mark each requirement as ✓ (met), ✗ (not met), or ~ (partially met)

Step 2: DETERMINE RESULT BASED ON ANALYSIS
Apply this logic strictly:
- FAIL: If ANY critical requirement is not met (✗), or if multiple requirements are only partially met
- PARTIAL: If all critical requirements are met (✓) but some minor requirements are not met or partially met
- PASS: If ALL requirements are fully met (✓)

When in doubt about severity: Be strict. It's better to FAIL and be corrected than to PASS incorrectly.

Step 3: FORMAT YOUR RESPONSE
Respond with ONLY valid JSON in this exact format:
{"result": "PASS" or "PARTIAL" or "FAIL", "details": "Your detailed analysis here"}

In the "details" field:
- Start with your analysis using • bullets
- Use ✓ for requirements met, ✗ for not met, ~ for partially met
- Show all counting/calculations if applicable
- End with "Conclusion: " followed by a one-sentence summary explaining the result

CRITICAL: Your result must logically follow from your analysis. If your analysis shows failures (✗), you cannot give a PASS result.`

    const startTime = Date.now()
    
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000, // Increased to allow for detailed analysis
        temperature: 0,
        messages: [{
          role: 'user',
          content: evalPrompt
        }]
      })
    })

    if (!apiResponse.ok) {
      const error = await apiResponse.json()
      return res.status(apiResponse.status).json({ error: error.error?.message || 'Evaluation failed' })
    }

    const data = await apiResponse.json()
    let evalResult
    
    // Claude returns content in data.content[0].text format
    const responseText = data.content[0].text
    
    try {
      evalResult = JSON.parse(responseText)
    } catch (parseError) {
      // If JSON parsing fails, try to extract result from text
      const resultMatch = responseText.match(/result['":\s]*["']?(PASS|PARTIAL|FAIL)["']?/i)
      evalResult = {
        result: resultMatch ? resultMatch[1].toUpperCase() : 'FAIL',
        details: responseText
      }
    }

    res.json({
      result: evalResult.result,
      details: evalResult.details
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
