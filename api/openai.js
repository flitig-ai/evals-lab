export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, model } = req.body
  
  try {
    const startTime = Date.now()
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
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
      tokenCount: data.usage.total_tokens,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
