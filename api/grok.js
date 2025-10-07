export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, model } = req.body
  
  try {
    const startTime = Date.now()
    
    // Map model names to xAI API model identifiers
    let apiModel = model
    if (model === 'grok-4') apiModel = 'grok-4-latest'
    else if (model === 'grok-3') apiModel = 'grok-3-latest'
    else if (model === 'grok-2') apiModel = 'grok-2-latest'
    else if (model === 'grok-2-mini') apiModel = 'grok-2-mini-latest'
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: apiModel,
        max_tokens: 4096,
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
      response: data.choices[0].message.content,
      responseTime,
      tokenCount: data.usage?.total_tokens || 0,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
