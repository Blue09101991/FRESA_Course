/**
 * Simple test script to verify ElevenLabs API audio generation
 * 
 * Usage: node scripts/test-elevenlabs.js
 * 
 * Make sure you have ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your .env file
 */

const fs = require('fs').promises;
const path = require('path');

// Read .env file manually
async function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('⚠️  Could not read .env file, using process.env');
    return {};
  }
}

// Load environment variables
let ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID;

async function init() {
  const envVars = await loadEnv();
  ELEVENLABS_API_KEY = envVars.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  ELEVENLABS_VOICE_ID = envVars.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'nPczCjzI2devNBz1zQrb';
}

async function testElevenLabsAPI() {
  await init();
  
  console.log('🧪 Testing ElevenLabs API...\n');

  // Check environment variables
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ERROR: ELEVENLABS_API_KEY is not set in .env file');
    console.error('   Please add: ELEVENLABS_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  console.log('✅ API Key found:', ELEVENLABS_API_KEY.substring(0, 10) + '...');
  console.log('✅ Voice ID:', ELEVENLABS_VOICE_ID);
  console.log('');

  // Test text
  const testText = "Hello, this is a test of the ElevenLabs text to speech API. If you can hear this, the audio generation is working correctly.";

  console.log('📝 Test text:', testText);
  console.log('');

  try {
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
    console.log('📡 Sending request to ElevenLabs API...');
    console.log('   URL:', apiUrl);
    console.log('   Method: POST');
    console.log('');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'User-Agent': 'E-Course-Test-Script/1.0',
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
      redirect: 'manual', // Don't follow redirects automatically
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📊 Content-Type:', response.headers.get('content-type'));
    console.log('📊 Content-Length:', response.headers.get('content-length'));
    
    // Check for redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      console.log('⚠️  Redirect detected:', location);
      console.error('❌ ERROR: API request was redirected. This usually means:');
      console.error('   1. API endpoint URL is incorrect');
      console.error('   2. API key is invalid');
      console.error('   3. Request is being blocked');
      process.exit(1);
    }
    
    console.log('');

    // Check if we got HTML instead of audio (Cloudflare challenge or error page)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const errorText = await response.text();
      console.error('❌ ERROR: Received HTML instead of audio!');
      console.error('   This usually means:');
      console.error('   1. Cloudflare challenge page');
      console.error('   2. API key is invalid');
      console.error('   3. API endpoint is wrong');
      console.error('');
      console.error('Response preview (first 500 chars):');
      console.error(errorText.substring(0, 500));
      
      if (errorText.includes('Just a moment') || errorText.includes('cf-challenge')) {
        console.error('');
        console.error('⚠️  Cloudflare challenge detected!');
        console.error('   Your API key might be invalid or the request is being blocked.');
      }
      
      process.exit(1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:');
      console.error(errorText);
      
      if (errorText.includes('Just a moment') || errorText.includes('cf-challenge')) {
        console.error('\n⚠️  Cloudflare challenge detected. This usually means:');
        console.error('   1. API key is invalid or expired');
        console.error('   2. API key format is incorrect');
        console.error('   3. Account has insufficient credits');
      }
      
      process.exit(1);
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBytes = Buffer.from(audioBuffer);

    console.log('✅ Audio received:', audioBytes.length, 'bytes');

    // Validate MP3
    const isValidMP3 = audioBytes[0] === 0xFF && (audioBytes[1] & 0xE0) === 0xE0 || // MPEG frame sync
                       audioBytes[0] === 0x49 && audioBytes[1] === 0x44 && audioBytes[2] === 0x33; // ID3 tag

    if (isValidMP3) {
      console.log('✅ Valid MP3 file detected');
    } else {
      console.warn('⚠️  Warning: File may not be a valid MP3');
      console.log('   First 10 bytes:', Array.from(audioBytes.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    }

    // Save test audio file
    const testDir = path.join(process.cwd(), 'public', 'audio');
    await fs.mkdir(testDir, { recursive: true });
    
    const timestamp = Date.now();
    const testFileName = `test-${timestamp}.mp3`;
    const testFilePath = path.join(testDir, testFileName);
    
    await fs.writeFile(testFilePath, audioBytes);
    
    const stats = await fs.stat(testFilePath);
    console.log('✅ Audio file saved:', testFilePath);
    console.log('✅ File size:', stats.size, 'bytes');
    console.log('');

    // Generate test timestamps
    const textWords = testText.trim().split(/\s+/).filter(w => w.trim().length > 0);
    const wordsPerSecond = 150 / 60; // ~150 words per minute
    const estimatedDuration = textWords.length / wordsPerSecond;
    const avgWordDuration = estimatedDuration / textWords.length;

    const wordTimestamps = textWords.map((word, index) => {
      const start = index * avgWordDuration;
      const end = (index + 1) * avgWordDuration;
      return {
        text: word.trim(),
        start: Math.max(0, Math.round(start * 1000) / 1000),
        end: Math.round(end * 1000) / 1000,
        confidence: 1.0,
      };
    });

    const timestampsData = {
      text: testText.trim(),
      segments: [
        {
          words: wordTimestamps,
        },
      ],
    };

    // Save test timestamps file
    const timestampsDir = path.join(process.cwd(), 'public', 'timestamps');
    await fs.mkdir(timestampsDir, { recursive: true });
    
    const timestampsFileName = `test-${timestamp}.timestamps.json`;
    const timestampsFilePath = path.join(timestampsDir, timestampsFileName);
    
    await fs.writeFile(timestampsFilePath, JSON.stringify(timestampsData, null, 2));
    
    const timestampsStats = await fs.stat(timestampsFilePath);
    console.log('✅ Timestamps file saved:', timestampsFilePath);
    console.log('✅ File size:', timestampsStats.size, 'bytes');
    console.log('');

    // Test URLs
    const audioUrl = `/audio/${testFileName}`;
    const timestampsUrl = `/timestamps/${timestampsFileName}`;

    console.log('🎉 SUCCESS! Audio and timestamps generated successfully!\n');
    console.log('📁 Files created:');
    console.log('   Audio:', audioUrl);
    console.log('   Timestamps:', timestampsUrl);
    console.log('');
    console.log('🧪 Test the audio file:');
    console.log(`   Open in browser: http://localhost:3000${audioUrl}`);
    console.log('');
    console.log('📊 Timestamps summary:');
    console.log('   Total words:', wordTimestamps.length);
    console.log('   Estimated duration:', estimatedDuration.toFixed(2), 'seconds');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testElevenLabsAPI()
  .then(() => {
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

