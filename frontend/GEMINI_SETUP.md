# Gemini API Setup Guide

## 🔑 Getting Your Gemini API Key

### Step 1: Get API Key from Google AI Studio
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key (starts with `AIza...`)

### Step 2: Configure Environment Variables

#### For Local Development:
1. Open `.env.local` file in the frontend directory
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key:
```bash
VITE_GEMINI_API_KEY=AIzaSyC...your_actual_api_key_here
```

#### For Production (Vercel):
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add new variable:
   - Name: `VITE_GEMINI_API_KEY`
   - Value: `AIzaSyC...your_actual_api_key_here`
   - Environment: Production, Preview, Development

#### For Production (Railway/Other):
1. Set environment variable in your deployment platform
2. Add `VITE_GEMINI_API_KEY=your_actual_api_key_here`

### Step 3: Verify Configuration

#### Check if API key is loaded:
1. Open browser console (F12)
2. Look for: `✅ Gemini API key found. Real AI analysis enabled.`
3. If you see: `⚠️ Gemini API key not found. Using fallback analysis mode.` - the key is not set correctly

#### Test the API:
1. Upload a resume or enter text manually
2. Look for: `🤖 Using Gemini AI for real analysis...` in console
3. You should see: `✅ Successfully parsed Gemini response`

## 🚨 Troubleshooting

### Error: "API key not valid"
- **Cause**: Invalid or expired API key
- **Solution**: Get a new API key from Google AI Studio

### Error: "API quota exceeded"
- **Cause**: Daily/monthly API limits reached
- **Solution**: Wait for quota reset or upgrade your plan

### Error: "API permission denied"
- **Cause**: API key doesn't have proper permissions
- **Solution**: Check API key permissions in Google Cloud Console

### Still showing "Basic Analysis Mode"
- **Cause**: Environment variable not set correctly
- **Solution**: 
  1. Restart your development server
  2. Check `.env.local` file exists and has correct format
  3. Verify no extra spaces or quotes around the API key

## 📊 API Usage & Limits

### Free Tier Limits:
- **Requests per minute**: 15
- **Requests per day**: 1,500
- **Tokens per minute**: 32,000
- **Tokens per day**: 1,500,000

### Cost (if you exceed free tier):
- **Input tokens**: $0.000075 per 1K tokens
- **Output tokens**: $0.0003 per 1K tokens

## 🔧 Development Tips

### Environment Variable Format:
```bash
# Correct format
VITE_GEMINI_API_KEY=AIzaSyC...your_key_here

# Wrong formats (don't use quotes or spaces)
VITE_GEMINI_API_KEY="AIzaSyC...your_key_here"  # ❌ Don't use quotes
VITE_GEMINI_API_KEY = AIzaSyC...your_key_here  # ❌ Don't use spaces
```

### Testing API Key:
```javascript
// Add this to your browser console to test
console.log('API Key Status:', import.meta.env.VITE_GEMINI_API_KEY ? 'Set' : 'Not set');
```

## 🆘 Need Help?

1. **Check Console Logs**: Look for detailed error messages in browser console
2. **Verify Environment**: Ensure `.env.local` file exists and is properly formatted
3. **Restart Server**: After changing environment variables, restart your dev server
4. **Check API Key**: Verify the key is valid by testing it in Google AI Studio

## 📝 Example Configuration

### .env.local (Local Development)
```bash
VITE_BACKEND_URL=http://localhost:3000
VITE_GEMINI_API_KEY=AIzaSyC...your_actual_api_key_here
```

### vercel.json (Production)
```json
{
  "env": {
    "VITE_BACKEND_URL": "https://devhub-production-ed42.up.railway.app",
    "VITE_GEMINI_API_KEY": "AIzaSyC...your_actual_api_key_here"
  }
}
```
