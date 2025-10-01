# Deploying to Vercel

This app has been refactored to work with Vercel's serverless architecture.

## Prerequisites

1. A Vercel account (free tier works fine)
2. Vercel CLI installed: `npm i -g vercel`
3. API keys for the AI services you want to use

## Environment Variables

You need to set these environment variables in your Vercel project:

- `VITE_ANTHROPIC_API_KEY` - Your Anthropic/Claude API key
- `VITE_OPENAI_API_KEY` - Your OpenAI API key
- `VITE_XAI_API_KEY` - Your xAI (Grok) API key
- `VITE_GOOGLE_API_KEY` - Your Google (Gemini) API key

## Deploy to Vercel

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts, then add environment variables:
vercel env add VITE_ANTHROPIC_API_KEY
vercel env add VITE_OPENAI_API_KEY
vercel env add VITE_XAI_API_KEY
vercel env add VITE_GOOGLE_API_KEY

# Deploy to production
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Add environment variables in Project Settings → Environment Variables
5. Deploy!

## Local Development

For local development with Vercel's serverless functions:

```bash
# Install Vercel CLI
npm i -g vercel

# Run dev server with serverless functions
vercel dev
```

Or use the standard Vite dev server (API calls will fail unless you have a backend running):

```bash
npm run dev
```

## What Changed?

- ✅ Converted Express server to Vercel serverless functions in `/api` directory
- ✅ Updated API endpoints from `http://localhost:3001/api/*` to `/api/*`
- ✅ Added `vercel.json` configuration
- ✅ Removed server-specific scripts from `package.json`
- ✅ Each API route is now a standalone serverless function

## Architecture

```
/api
  ├── anthropic.js    # Claude API endpoint
  ├── openai.js       # OpenAI/GPT API endpoint
  ├── grok.js         # xAI/Grok API endpoint
  ├── gemini.js       # Google Gemini API endpoint
  └── evaluate.js     # AI-as-a-Judge evaluation endpoint

/src
  ├── App.jsx         # Main React app
  ├── api.js          # Frontend API service
  └── ...
```

Each serverless function handles one API route and is automatically deployed by Vercel.
