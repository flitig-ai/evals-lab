// API service - calls serverless functions (works locally and on Vercel)

export async function callAIModel(prompt, model) {
  let endpoint = ''
  
  if (model.startsWith('claude')) {
    endpoint = '/api/anthropic'
  } else if (model.startsWith('gpt')) {
    endpoint = '/api/openai'
  } else if (model.startsWith('gemini')) {
    endpoint = '/api/gemini'
  } else if (model.startsWith('grok')) {
    endpoint = '/api/grok'
  } else {
    throw new Error('Unsupported model')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, model })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API request failed')
  }

  return await response.json()
}
