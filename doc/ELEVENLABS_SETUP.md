# ElevenLabs API Setup Guide

## Overview

This application uses [ElevenLabs](https://elevenlabs.io) API to automatically generate audio files and timestamps from text content. This allows administrators to create audio-synchronized course content without manually recording audio.

## Setup Instructions

### Step 1: Get ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign up for an account or log in
3. Navigate to your profile/settings
4. Find your API key (or generate a new one)
5. Copy the API key

### Step 2: Add API Key to Environment Variables

Add the following lines to your `.env` file in the project root:

```env
ELEVENLABS_API_KEY="your-api-key-here"
ELEVENLABS_VOICE_ID="nPczCjzI2devNBz1zQrb"
```

**Important:** 
- Replace `your-api-key-here` with your actual ElevenLabs API key
- Replace `nPczCjzI2devNBz1zQrb` with your desired voice ID (or keep the default)

### Step 3: Restart Development Server

After adding the API key, restart your development server:

```bash
npm run dev
```

## Usage

### For Introduction Page

1. Go to Admin Panel → Edit Introduction
2. Enter your introduction text in the "Introduction Text" field
3. Click the **"🎙️ Generate Audio & Timestamps"** button
4. The system will:
   - Generate audio using ElevenLabs TTS API
   - Create word-level timestamps
   - Save both files automatically
   - Update the Audio URL and Timestamps URL fields

### For Chapter Sections

1. Go to Admin Panel → Edit Chapter → Edit Section (or New Section)
2. Enter your section text in the "Text Content" field
3. Click the **"🎙️ Generate Audio & Timestamps"** button
4. The system will automatically:
   - Generate audio file
   - Create timestamps file
   - Fill in the Audio URL and Timestamps URL fields

## Voice Configuration

The application uses a configurable voice ID for all content:
- **Default Voice ID:** `nPczCjzI2devNBz1zQrb`
- This voice is used for both introduction and all chapter sections

To change the voice, update the `ELEVENLABS_VOICE_ID` value in your `.env` file:
```env
ELEVENLABS_VOICE_ID="your-voice-id-here"
```

You can find available voice IDs in your ElevenLabs dashboard under "Voices".

## API Details

### Endpoint
- **URL:** `/api/admin/generate-audio`
- **Method:** POST
- **Authentication:** Required (Admin/Developer/Editor role)

### Request Body
```json
{
  "text": "Your text content here",
  "type": "both"
}
```

### Response
```json
{
  "success": true,
  "audioUrl": "/audio/1234567890-text.mp3",
  "timestampsUrl": "/timestamps/1234567890-text.timestamps.json",
  "audioFileName": "1234567890-text.mp3",
  "timestampsFileName": "1234567890-text.timestamps.json"
}
```

## Features

- ✅ Automatic audio generation from text
- ✅ Word-level timestamp creation
- ✅ Automatic file saving to `public/audio/` and `public/timestamps/`
- ✅ **Auto-save**: Generated files are automatically saved to the database
- ✅ **Immediate use**: Generated audio/timestamps are immediately available on course pages
- ✅ URL auto-fill in forms
- ✅ Uses ElevenLabs Multilingual v2 model for high quality
- ✅ Voice ID: `nPczCjzI2devNBz1zQrb` (consistent voice across all content)

## Auto-Save Feature

After successfully generating audio and timestamps:

- **Introduction Page**: The generated files are automatically saved to the database and will be used on the website immediately. No need to click "Save Introduction" separately.

- **Chapter Sections**: 
  - If editing an existing section: Files are automatically saved and the section is updated
  - If creating a new section: Files are generated and URLs are filled in. Click "Save Section" to create the section with these files.

The generated audio and timestamps are immediately available on the course pages (`/introduction`, `/chapter-1`, etc.) after generation.

## Troubleshooting

### Error: "ElevenLabs API key is not configured"
- Make sure you've added `ELEVENLABS_API_KEY` to your `.env` file
- Restart your development server after adding the key

### Error: "403 Forbidden" or Cloudflare Challenge
- **Most Common Issue**: Your API key is missing, invalid, or expired
- Check that your API key is correctly set in `.env` file: `ELEVENLABS_API_KEY="your-api-key-here"`
- Ensure you've restarted the server after adding/updating the API key
- Try regenerating your API key from the ElevenLabs dashboard
- Verify your ElevenLabs account has sufficient credits
- Note: ElevenLabs API keys can have different formats (e.g., `sk_...` or `xi-...`)

### Error: "Failed to generate audio"
- Check your ElevenLabs API key is valid
- Verify you have sufficient credits in your ElevenLabs account
- Check the browser console for detailed error messages

### Audio quality issues
- The system uses `eleven_multilingual_v2` model for best quality
- You can adjust voice settings in `app/api/admin/generate-audio/route.ts`

## Cost Considerations

ElevenLabs API usage is billed based on:
- Number of characters processed
- Model used (Multilingual v2)
- Voice settings

Check your ElevenLabs account dashboard for usage and billing information.

## Alternative: Manual Upload

You can still manually upload audio and timestamp files using the upload buttons if you prefer to:
- Use pre-recorded audio
- Generate timestamps separately
- Use different voices for specific sections

