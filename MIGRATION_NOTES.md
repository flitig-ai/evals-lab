# Migration to Vercel Serverless

## What Changed

This project has been refactored from a traditional Express.js server to Vercel's serverless architecture.

### Before (Express Server)
- Single `server.js` file with Express app
- Runs on `localhost:3001`
- Requires continuous server process
- Used `express`, `cors`, `dotenv` dependencies

### After (Vercel Serverless)
- Individual serverless functions in `/api` directory
- Each endpoint is a separate file
- No long-running server needed
- Removed unnecessary dependencies

## File Changes

### Added Files
- `/api/anthropic.js` - Claude API serverless function
- `/api/openai.js` - OpenAI API serverless function  
- `/api/grok.js` - xAI/Grok API serverless function
- `/api/gemini.js` - Google Gemini API serverless function
- `/api/evaluate.js` - AI evaluation serverless function
- `vercel.json` - Vercel configuration
- `README.md` - Project documentation
- `VERCEL_DEPLOY.md` - Deployment guide

### Modified Files
- `src/api.js` - Changed from `http://localhost:3001/api/*` to `/api/*`
- `src/App.jsx` - Updated evaluate endpoint to use relative path
- `package.json` - Removed server scripts and dependencies
- `.gitignore` - Added `.vercel` directory

### Renamed Files
- `server.js` → `server.js.old` (kept for reference)

### Removed Dependencies
- `express` - No longer needed (using Vercel serverless)
- `cors` - Handled by Vercel automatically
- `dotenv` - Vercel manages environment variables
- `concurrently` - No need to run multiple processes

## Environment Variables

The same environment variables are needed, but they're now managed by Vercel:

- `VITE_ANTHROPIC_API_KEY`
- `VITE_OPENAI_API_KEY`
- `VITE_XAI_API_KEY`
- `VITE_GOOGLE_API_KEY`

Set these in the Vercel dashboard or via CLI.

## Testing Locally

### Option 1: Vercel Dev (Recommended)
```bash
npm install -g vercel
vercel dev
```
This runs serverless functions locally just like on Vercel.

### Option 2: Vite Dev
```bash
npm run dev
```
Note: API calls will fail without a backend running.

## Deployment

Simply run:
```bash
vercel
```

Or push to your connected Git repository and Vercel will auto-deploy.

## Benefits

✅ **No server maintenance** - Vercel handles scaling and uptime  
✅ **Auto-scaling** - Functions scale automatically with traffic  
✅ **Global CDN** - Static assets served from edge locations  
✅ **Zero config** - Works out of the box with minimal setup  
✅ **Cost effective** - Pay only for actual function execution time  

## Rollback

If you need to rollback to the Express server:
1. Rename `server.js.old` back to `server.js`
2. Reinstall dependencies: `npm install express cors dotenv concurrently`
3. Update API endpoints back to `http://localhost:3001/api/*`
4. Run `npm run server` and `npm run dev` separately
