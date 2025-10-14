export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, model } = req.body
  
  const modelVersions = {
    'claude-sonnet-4.5': 'claude-sonnet-4-20250514',
    'claude-opus-4.1': 'claude-opus-4-20250514',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-opus-4': 'claude-opus-4-20250514',
    'claude-sonnet-3.7': 'claude-sonnet-3-7-20240229',
    'claude-opus-3.7': 'claude-opus-3-7-20240229',
    'claude-3.5-sonnet': 'claude-3-5-sonnet-20240620',
    'claude-3.5-haiku': 'claude-3-5-haiku-20241022',
    'claude-code': 'claude-code-20250514',
    'claude-haiku-3': 'claude-3-haiku-20240307',
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229'
  }
  
  try {
    const startTime = Date.now()
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelVersions[model] || model,
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json({ error: error.error?.message || 'API request failed' })
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    res.json({
      response: data.content[0].text,
      responseTime,
      tokenCount: data.usage.input_tokens + data.usage.output_tokens,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
