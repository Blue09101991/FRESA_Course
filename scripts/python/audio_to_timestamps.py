#!/usr/bin/env python3
"""
Converts audio file to timestamped JSON using whisper-timestamped.
This script is called from Node.js to generate accurate word-level timestamps.
"""

import json
import sys
import os
import torch
import inspect

try:
    import whisper_timestamped as whisper
except ImportError:
    print("ERROR: whisper-timestamped is not installed. Please run: pip install -U whisper-timestamped", file=sys.stderr)
    sys.exit(1)

# Add subprocess import for FFmpeg check
import subprocess


def audio_to_timestamps_json(
    audio_path: str,
    out_json_path: str,
    model_name: str = "base",
    language: str = "en",
):
    """
    Converts audio (mp3/wav) -> timestamped JSON using whisper-timestamped.
    Output contains segments + word-level timestamps.
    
    Args:
        audio_path: Path to input audio file
        out_json_path: Path to output JSON file
        model_name: Whisper model name (tiny, base, small, medium, large)
        language: Language code (en, es, fr, etc.)
    """
    # Convert to absolute path (fixes Windows path issues)
    audio_path = os.path.abspath(audio_path)
    out_json_path = os.path.abspath(out_json_path)
    
    if not os.path.exists(audio_path):
        print(f"ERROR: Audio file not found: {audio_path}", file=sys.stderr)
        print(f"Current working directory: {os.getcwd()}", file=sys.stderr)
        sys.exit(1)
    
    # Check if FFmpeg is available (whisper needs it)
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True, timeout=5)
        print("✅ FFmpeg found", file=sys.stderr)
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        print("ERROR: FFmpeg is not installed or not in PATH!", file=sys.stderr)
        print("Whisper requires FFmpeg to decode audio files.", file=sys.stderr)
        print("", file=sys.stderr)
        print("To install FFmpeg on Windows:", file=sys.stderr)
        print("1. Download from: https://ffmpeg.org/download.html", file=sys.stderr)
        print("2. Extract the zip file", file=sys.stderr)
        print("3. Add the 'bin' folder to your system PATH", file=sys.stderr)
        print("4. Restart your terminal/IDE", file=sys.stderr)
        print("5. Verify with: ffmpeg -version", file=sys.stderr)
        sys.exit(1)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}", file=sys.stderr)
    print(f"Audio file: {audio_path}", file=sys.stderr)
    print(f"Output file: {out_json_path}", file=sys.stderr)
    
    try:
        model = whisper.load_model(model_name, device=device)
    except Exception as e:
        print(f"ERROR: Failed to load Whisper model '{model_name}': {e}", file=sys.stderr)
        sys.exit(1)
    
    # Prepare kwargs compatible with different whisper-timestamped versions
    kwargs = dict(language=language, vad=True)
    sig = inspect.signature(whisper.transcribe)
    if "compute_confidence" in sig.parameters:
        kwargs["compute_confidence"] = True
    
    try:
        # Transcribe audio with timestamps
        print(f"Transcribing audio: {audio_path}", file=sys.stderr)
        # Use absolute path to ensure whisper can find the file
        result = whisper.transcribe(model, audio_path, **kwargs)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
        
        # Save result to JSON file
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"SUCCESS: Saved timestamps to {out_json_path}", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"ERROR: Transcription failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) < 3:
        print("Usage: python audio_to_timestamps.py <audio_path> <output_json_path> [model_name] [language]", file=sys.stderr)
        print("Example: python audio_to_timestamps.py audio.mp3 output.json base en", file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    out_json_path = sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else "base"
    language = sys.argv[4] if len(sys.argv) > 4 else "en"
    
    # Convert to timestamps
    result = audio_to_timestamps_json(
        audio_path=audio_path,
        out_json_path=out_json_path,
        model_name=model_name,
        language=language,
    )
    
    # Print success message to stdout (for Node.js to capture)
    print(json.dumps({"success": True, "output_path": out_json_path}))

