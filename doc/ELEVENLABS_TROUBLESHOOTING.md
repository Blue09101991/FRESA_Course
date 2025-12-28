# ElevenLabs API Troubleshooting Guide

## Issue: API Returns HTML Instead of Audio

### Problem
When generating audio, the API returns HTML content (help page) instead of MP3 audio data.

### Root Cause
The API request is being redirected (302) to a help page, which indicates:
1. **API Key Issue**: The API key might be invalid, expired, or in the wrong format
2. **Account Restrictions**: Your account might have restrictions or insufficient credits
3. **Request Format**: The request headers or endpoint might be incorrect

### Test Script
Run the test script to diagnose the issue:
```bash
npm run test:elevenlabs
```

### What to Check

#### 1. Verify API Key Format
- ElevenLabs API keys can have different formats
- Your current key starts with `sk_` which should be valid
- Make sure the key in `.env` matches exactly what's in your ElevenLabs dashboard
- **Important**: Copy the key directly from the dashboard (don't add/remove spaces or quotes)

#### 2. Check API Key in Dashboard
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io)
2. Navigate to your API keys section
3. Verify the key is active and not expired
4. Check if there are any restrictions on the key

#### 3. Verify Account Status
- Check if your account has sufficient credits
- Verify your account is not restricted
- Check if there are any country-based restrictions

#### 4. Test API Key Directly
You can test your API key using curl:

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/nPczCjzI2devNBz1zQrb" \
  -H "Accept: audio/mpeg" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "text": "Hello, this is a test",
    "model_id": "eleven_multilingual_v2"
  }' \
  --output test-audio.mp3
```

If this works, the issue is in the application code. If it doesn't, the issue is with the API key or account.

### Common Solutions

#### Solution 1: Regenerate API Key
1. Go to ElevenLabs Dashboard
2. Delete the current API key
3. Create a new API key
4. Update `.env` file with the new key
5. Restart the server

#### Solution 2: Check API Key Permissions
- Ensure the API key has permission to use Text-to-Speech
- Check if there are any IP restrictions
- Verify the key is not rate-limited

#### Solution 3: Verify Environment Variables
Make sure your `.env` file has:
```env
ELEVENLABS_API_KEY="your-actual-api-key-here"
ELEVENLABS_VOICE_ID="nPczCjzI2devNBz1zQrb"
```

**Important**: 
- No spaces around the `=` sign
- Quotes are optional but recommended
- No trailing spaces

#### Solution 4: Check Network/Firewall
- Ensure your network allows outbound connections to `api.elevenlabs.io`
- Check if a corporate firewall is blocking the request
- Try from a different network

### Expected Behavior

When working correctly, the test script should show:
```
📊 Response Status: 200 OK
📊 Content-Type: audio/mpeg
✅ Audio received: [number] bytes
✅ Valid MP3 file detected
```

### Current Error

The test script currently shows:
```
📊 Response Status: 302 Found
⚠️  Redirect detected: https://help.elevenlabs.io/...
```

This indicates the API key is not being accepted by the ElevenLabs API.

### Next Steps

1. **Verify API Key**: Double-check the key in your ElevenLabs dashboard
2. **Regenerate Key**: Create a new API key if needed
3. **Check Credits**: Ensure your account has sufficient credits
4. **Contact Support**: If the issue persists, contact ElevenLabs support

### Alternative: Use Manual Upload

If the API continues to have issues, you can:
1. Generate audio manually using the ElevenLabs website
2. Download the audio file
3. Upload it using the "Upload" button in the admin panel
4. Generate timestamps separately or use the manual upload feature

