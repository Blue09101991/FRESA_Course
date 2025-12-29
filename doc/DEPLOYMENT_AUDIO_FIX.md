# Fixing 404 Audio Errors on Deployed Server

## Problem

When you generate audio files on a deployed server, you may see 404 errors because:

1. **Serverless Functions**: On platforms like Vercel, Netlify, or AWS Lambda, the `public/` folder is read-only during build time. Files generated at runtime are not persisted.

2. **File Persistence**: Generated audio files are saved to `public/audio/` locally, but on serverless deployments, these files are lost after the function execution completes.

## Solutions

### Option 1: Use Cloud Storage (Recommended for Production)

Upload generated audio files to a cloud storage service:

#### AWS S3
```typescript
// Example: Upload to S3 after generation
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });
await s3Client.send(new PutObjectCommand({
  Bucket: 'your-bucket-name',
  Key: `audio/${audioFileName}`,
  Body: audioBytes,
  ContentType: 'audio/mpeg',
}));

const audioUrl = `https://your-bucket-name.s3.amazonaws.com/audio/${audioFileName}`;
```

#### Cloudinary
```typescript
// Example: Upload to Cloudinary
import { v2 as cloudinary } from 'cloudinary';

const result = await cloudinary.uploader.upload(audioFilePath, {
  resource_type: 'video', // Cloudinary treats audio as video
  folder: 'audio',
});

const audioUrl = result.secure_url;
```

#### Other Options
- **Google Cloud Storage**
- **Azure Blob Storage**
- **DigitalOcean Spaces**

### Option 2: Use a Traditional Server (VPS/Dedicated)

If you're using a traditional server (VPS, dedicated server, or Docker container), the `public/` folder will persist:

1. Ensure the `public/audio/` and `public/timestamps/` directories exist
2. Set proper file permissions (755 for directories, 644 for files)
3. Ensure the web server (Nginx, Apache) serves static files from `public/`

### Option 3: Database Storage (For Small Files)

Store audio files as base64 in the database (not recommended for large files):

```typescript
// Convert audio to base64
const base64Audio = audioBytes.toString('base64');
// Store in database
await prisma.section.update({
  where: { id: sectionId },
  data: { audioData: base64Audio }
});
```

## Current Implementation

The current code saves files to `public/audio/` and `public/timestamps/`. This works for:
- ✅ Local development
- ✅ Traditional servers (VPS, dedicated)
- ❌ Serverless functions (Vercel, Netlify, Lambda)

## Error Handling

The code now includes better error handling:
- Console warnings when audio files are not found (404)
- Messages suggesting cloud storage for deployed servers
- Graceful degradation (audio won't play, but app continues)

## Next Steps

1. **For Production**: Implement cloud storage (S3, Cloudinary, etc.)
2. **For Development**: Current setup works fine
3. **For Testing**: Check console for 404 warnings and verify file paths

## Voice Configuration

✅ **Man's Voice** (`nPczCjzI2devNBz1zQrb`): Used for:
- Introduction
- Chapter sections

✅ **Woman's Voice** (`GP1bgf0sjoFuuHkyrg8E`): Used for:
- Quiz questions
- Quiz explanations (correct and incorrect)

The system automatically selects the correct voice based on context.

