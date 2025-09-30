// API service - now calls our backend instead of AI APIs directly

const BACKEND_URL = 'http://localhost:3001'

export async function callAIModel(prompt, model) {
  let endpoint = ''
  
  if (model.startsWith('claude')) {
    endpoint = `${BACKEND_URL}/api/anthropic`
  } else if (model.startsWith('gpt')) {
    endpoint = `${BACKEND_URL}/api/openai`
  } else if (model.startsWith('gemini')) {
    endpoint = `${BACKEND_URL}/api/gemini`
  } else if (model.startsWith('grok')) {
    endpoint = `${BACKEND_URL}/api/grok`
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
