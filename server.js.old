import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Anthropic API endpoint
app.post('/api/anthropic', async (req, res) => {
  const { prompt, model } = req.body
  
  const modelVersions = {
    'claude-sonnet-4.5': 'claude-sonnet-4-20250514',
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229'
  }
  
  try {
    const startTime = Date.now()
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelVersions[model] || model,
        max_tokens: 1024,
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
})

// OpenAI API endpoint
app.post('/api/openai', async (req, res) => {
  const { prompt, model } = req.body
  
  try {
    const startTime = Date.now()
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
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
})

// Grok API endpoint (xAI)
app.post('/api/grok', async (req, res) => {
  const { prompt, model } = req.body
  
  try {
    const startTime = Date.now()
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model === 'grok-2' ? 'grok-2-latest' : model === 'grok-2-mini' ? 'grok-2-mini-latest' : model,
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
})

// Google Gemini API endpoint
app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body
  
  try {
    const startTime = Date.now()
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
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
      response: data.candidates[0].content.parts[0].text,
      responseTime,
      tokenCount: data.usageMetadata?.totalTokenCount || 0,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// AI-as-a-Judge endpoint - use AI to evaluate AI responses
// Using GPT-4o-mini for accurate, cheap evaluations
app.post('/api/evaluate', async (req, res) => {
  const { response, criteria } = req.body
  
  try {
    const evalPrompt = `You are a strict evaluation assistant. Analyze the following response based on these criteria:

CRITERIA: ${criteria}

RESPONSE TO EVALUATE:
${response}

You must respond with ONLY valid JSON in this exact format:
{"passed": true or false, "details": "brief explanation under 15 words"}

Be strict and thorough in your evaluation.`

    const startTime = Date.now()
    
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
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
      // If JSON parsing fails, extract boolean and details from text
      const passedMatch = responseText.match(/passed['":\s]*(true|false)/i)
      const detailsMatch = responseText.match(/details['":\s]*["']([^"']+)["']/i)
      evalResult = {
        passed: passedMatch ? passedMatch[1].toLowerCase() === 'true' : false,
        details: detailsMatch ? detailsMatch[1] : responseText.substring(0, 50)
      }
    }

    res.json({
      passed: evalResult.passed,
      details: evalResult.details
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
})
