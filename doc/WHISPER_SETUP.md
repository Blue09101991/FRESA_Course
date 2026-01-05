# Whisper Timestamp Setup Guide

This guide explains how to set up Whisper for generating accurate word-level timestamps from audio files.

## Prerequisites

### Windows

1. **Install Python 3.8+**
   - Download from [python.org](https://www.python.org/downloads/)
   - Make sure to check "Add Python to PATH" during installation
   - Verify installation: `python --version`

2. **Install FFmpeg** (REQUIRED - Whisper needs this!)
   - Download from [ffmpeg.org](https://ffmpeg.org/download.html) or [ffmpeg builds](https://www.gyan.dev/ffmpeg/builds/)
   - Extract the zip file to a folder (e.g., `C:\ffmpeg`)
   - Add the `bin` folder to your system PATH:
     - Open "Environment Variables" in Windows Settings
     - Edit "Path" variable
     - Add: `C:\ffmpeg\bin` (or wherever you extracted it)
   - **Restart your terminal/IDE** (important!)
   - Verify installation: `ffmpeg -version`
   - If you see "ffmpeg is not recognized", the PATH wasn't updated correctly

3. **Install Whisper Dependencies**
   ```bash
   pip install -U whisper-timestamped
   pip install torch
   ```

### Ubuntu/Linux

1. **Install FFmpeg**
   ```bash
   sudo apt update
   sudo apt install -y ffmpeg
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -U whisper-timestamped
   pip install torch
   ```

### macOS

1. **Install FFmpeg**
   ```bash
   brew install ffmpeg
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -U whisper-timestamped
   pip install torch
   ```

## Verification

After installation, verify everything works:

```bash
# Check Python
python --version

# Check FFmpeg
ffmpeg -version

# Check Whisper
python -c "import whisper_timestamped; print('Whisper installed successfully')"
```

## How It Works

1. **Audio Generation**: When you generate audio in the admin panel, the audio file is saved to `public/audio/`

2. **Timestamp Generation**: The system automatically:
   - Checks if Whisper is available
   - If available, runs the Python script to generate timestamps
   - Converts Whisper output to our timestamp format
   - Saves the JSON file to `public/timestamps/`

3. **Fallback**: If Whisper is not available, the system uses estimated timestamps based on audio file size and speaking rate.

## Model Selection

The system uses the `base` model by default, which provides a good balance between accuracy and speed.

Available models (from fastest to most accurate):
- `tiny` - Fastest, least accurate
- `base` - Good balance (default)
- `small` - Better accuracy
- `medium` - High accuracy
- `large` - Best accuracy, slowest

To change the model, edit `lib/whisper-timestamps.ts` and change the `modelName` parameter in the `generateTimestampsWithWhisper` call.

## Troubleshooting

### "Python not found"
- Make sure Python is installed and in your PATH
- On Windows, restart your terminal after installing Python
- Try using `python3` instead of `python`

### "whisper-timestamped is not installed"
- Run: `pip install -U whisper-timestamped`
- Make sure you're using the correct Python (the one in your PATH)

### "FFmpeg not found"
- Install FFmpeg and add it to your PATH
- On Windows, you may need to restart your terminal/IDE

### Slow Generation
- Whisper can be slow, especially for long audio files
- Consider using a smaller model (`tiny` or `base`) for faster generation
- The system has a 10-minute timeout, which should be enough for most files

### GPU Acceleration
- If you have an NVIDIA GPU, PyTorch will automatically use CUDA
- This significantly speeds up transcription
- No additional configuration needed

## Production Deployment

For production servers:

1. **Install Python and dependencies on the server**
2. **Ensure FFmpeg is available**
3. **The system will automatically use Whisper if available**

Note: On serverless platforms (Vercel, Netlify), you may need to:
- Use a separate service for Whisper (e.g., a dedicated API endpoint)
- Or pre-generate timestamps and upload them

## Manual Timestamp Generation

You can also generate timestamps manually:

```bash
python scripts/python/audio_to_timestamps.py \
  public/audio/your-audio.mp3 \
  public/timestamps/your-audio.timestamps.json \
  base \
  en
```

