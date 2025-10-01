# AI Evals Lab

A visual demonstration app for generative AI evaluation and verification. Compare responses from multiple AI models (Claude, GPT, Gemini, Grok) and evaluate them using AI-as-a-Judge methodology.

## Features

- 🤖 **Multi-Model Support**: Test prompts across Claude, GPT-4, Gemini, and Grok
- ⚖️ **AI-as-a-Judge**: Automated evaluation using Claude Sonnet 4
- 📊 **Response Comparison**: Side-by-side comparison with metrics (tokens, response time)
- 🎯 **Custom Evaluation Criteria**: Define your own evaluation standards
- ✨ **Modern UI**: Clean, responsive interface built with React

## Architecture

This app uses a serverless architecture optimized for Vercel:

```
/api                    # Serverless functions
  ├── anthropic.js     # Claude API proxy
  ├── openai.js        # OpenAI API proxy
  ├── grok.js          # xAI API proxy
  ├── gemini.js        # Google Gemini API proxy
  └── evaluate.js      # AI evaluation endpoint

/src                    # React frontend
  ├── App.jsx          # Main application
  ├── api.js           # API service layer
  └── ...
```

## Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd evals-lab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with your API keys:
   ```
   VITE_ANTHROPIC_API_KEY=your_key_here
   VITE_OPENAI_API_KEY=your_key_here
   VITE_XAI_API_KEY=your_key_here
   VITE_GOOGLE_API_KEY=your_key_here
   ```

4. **Run with Vercel Dev** (recommended - runs serverless functions locally)
   ```bash
   npm install -g vercel
   vercel dev
   ```

   Or use Vite dev server (note: API calls will fail without backend):
   ```bash
   npm run dev
   ```

## Deploy to Vercel

See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for detailed deployment instructions.

**Quick deploy:**
```bash
vercel
```

Don't forget to add your API keys as environment variables in Vercel's dashboard!

## Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Vercel Serverless Functions
- **AI Models**: 
  - Anthropic Claude (Sonnet 4, Opus, Sonnet 3)
  - OpenAI GPT (GPT-4, GPT-3.5)
  - Google Gemini Pro
  - xAI Grok

## How It Works

1. **Enter a prompt** and select AI models to test
2. **Define evaluation criteria** (e.g., "Be concise and accurate")
3. **Run the test** - the app queries all selected models
4. **AI evaluates** - Claude Sonnet 4 scores each response (1-5)
5. **Review results** - compare responses, scores, and metrics

## License

MIT

## Author

Hans Brattberg
