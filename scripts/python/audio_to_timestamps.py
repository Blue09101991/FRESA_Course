#!/usr/bin/env python3
"""
Converts audio file to timestamped JSON using WhisperX.
WhisperX provides more accurate word-level timestamps through forced alignment with wav2vec2 models.
This script is called from Node.js to generate accurate word-level timestamps.
"""

import json
import sys
import os
import torch
import gc

try:
    import whisperx
except ImportError:
    print("ERROR: whisperx is not installed. Please run: pip install -U whisperx", file=sys.stderr)
    sys.exit(1)

# Add subprocess import for FFmpeg check
import subprocess


def audio_to_timestamps_json(
    audio_path: str,
    out_json_path: str,
    model_name: str = "base",
    language: str = "en",
    batch_size: int = 16,
    compute_type: str = "int8",
    device: str = "cpu",
):
    """
    Converts audio (mp3/wav) -> timestamped JSON using WhisperX with forced alignment.
    Output contains segments + word-level timestamps with high accuracy.
    
    Args:
        audio_path: Path to input audio file
        out_json_path: Path to output JSON file
        model_name: Whisper model name (tiny, base, small, medium, large, large-v2, large-v3)
        language: Language code (en, es, fr, etc.)
        batch_size: Batch size for transcription (reduce if low on GPU mem)
        compute_type: Compute type ("float16" for GPU, "int8" for CPU/low mem)
        device: Device to use ("cuda" or "cpu")
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
        print("WhisperX requires FFmpeg to decode audio files.", file=sys.stderr)
        print("", file=sys.stderr)
        print("To install FFmpeg on Windows:", file=sys.stderr)
        print("1. Download from: https://ffmpeg.org/download.html", file=sys.stderr)
        print("2. Extract the zip file", file=sys.stderr)
        print("3. Add the 'bin' folder to your system PATH", file=sys.stderr)
        print("4. Restart your terminal/IDE", file=sys.stderr)
        print("5. Verify with: ffmpeg -version", file=sys.stderr)
        sys.exit(1)
    
    print(f"Using device: {device}", file=sys.stderr)
    print(f"Compute type: {compute_type}", file=sys.stderr)
    print(f"Batch size: {batch_size}", file=sys.stderr)
    print(f"Model: {model_name}", file=sys.stderr)
    print(f"Audio file: {audio_path}", file=sys.stderr)
    print(f"Output file: {out_json_path}", file=sys.stderr)
    
    try:
        # Step 1: Transcribe with original whisper (batched)
        print(f"🔄 Loading Whisper model '{model_name}'...", file=sys.stderr)
        model = whisperx.load_model(model_name, device=device, compute_type=compute_type)
        
        # Load audio
        print(f"🔄 Loading audio file...", file=sys.stderr)
        audio = whisperx.load_audio(audio_path)
        
        # Transcribe with batching
        print(f"🔄 Transcribing audio (this may take a while)...", file=sys.stderr)
        result = model.transcribe(audio, batch_size=batch_size)
        
        print(f"✅ Transcription completed. Detected language: {result.get('language', 'unknown')}", file=sys.stderr)
        print(f"   Segments before alignment: {len(result.get('segments', []))}", file=sys.stderr)
        print(f"   Segments preview: {result.get('segments', [])[:2] if result.get('segments') else 'None'}", file=sys.stderr)
        
        # Delete model if low on GPU resources
        del model
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()
        
        # Step 2: Align whisper output
        detected_language = result.get("language", language)
        print(f"🔄 Loading alignment model for language '{detected_language}'...", file=sys.stderr)
        model_a, metadata = whisperx.load_align_model(language_code=detected_language, device=device)
        
        print(f"🔄 Aligning words with wav2vec2 (this provides accurate timestamps)...", file=sys.stderr)
        result = whisperx.align(
            result["segments"],
            model_a,
            metadata,
            audio,
            device,
            return_char_alignments=False
        )
        
        word_count = sum(len(seg.get('words', [])) for seg in result.get('segments', []))
        print(f"✅ Alignment completed. Words with timestamps: {word_count}", file=sys.stderr)
        print(f"   Segments after alignment: {len(result.get('segments', []))}", file=sys.stderr)
        print(f"   Segments preview: {result.get('segments', [])[:2] if result.get('segments') else 'None'}", file=sys.stderr)
        
        # Delete model if low on GPU resources
        del model_a
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
        
        # Save result to JSON file
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"✅ SUCCESS: Saved timestamps to {out_json_path}", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"ERROR: WhisperX transcription/alignment failed: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) < 3:
        print("Usage: python audio_to_timestamps.py <audio_path> <output_json_path> [model_name] [language] [batch_size] [compute_type] [device]", file=sys.stderr)
        print("Example: python audio_to_timestamps.py audio.mp3 output.json large-v2 en 16 int8 cpu", file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    out_json_path = sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else "base"
    language = sys.argv[4] if len(sys.argv) > 4 else "en"
    batch_size = int(sys.argv[5]) if len(sys.argv) > 5 else 16
    compute_type = sys.argv[6] if len(sys.argv) > 6 else "int8"
    device = sys.argv[7] if len(sys.argv) > 7 else "cpu"
    
    # Convert to timestamps
    result = audio_to_timestamps_json(
        audio_path=audio_path,
        out_json_path=out_json_path,
        model_name=model_name,
        language=language,
        batch_size=batch_size,
        compute_type=compute_type,
        device=device,
    )
    
    # Print success message to stdout (for Node.js to capture)
    print(json.dumps({"success": True, "output_path": out_json_path}))
