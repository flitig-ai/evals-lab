import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import the serverless function handlers
import anthropicHandler from './api/anthropic.js'
import openaiHandler from './api/openai.js'
import geminiHandler from './api/gemini.js'
import grokHandler from './api/grok.js'
import evaluateHandler from './api/evaluate.js'

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Wrapper to convert Vercel serverless functions to Express middleware
const wrapHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res)
  } catch (error) {
    console.error('Handler error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
}

// Mount the API routes
app.post('/api/anthropic', wrapHandler(anthropicHandler))
app.post('/api/openai', wrapHandler(openaiHandler))
app.post('/api/gemini', wrapHandler(geminiHandler))
app.post('/api/grok', wrapHandler(grokHandler))
app.post('/api/evaluate', wrapHandler(evaluateHandler))

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
  console.log(`📡 Ready to handle API requests from Vite dev server`)
})

