# Initialize Database with Original Course Data

This guide explains how to initialize the database with all original course content.

## Quick Start

Run the seed script to initialize all original data:

```bash
npm run db:seed
```

Or use the alias:

```bash
npm run db:init
```

## What Gets Initialized

The seed script creates/updates:

### 1. Admin User
- **Email**: `admin@example.com`
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `Admin`

### 2. Introduction (Chapter 0)
- Introduction chapter
- Introduction section with:
  - Original text
  - Audio: `/audio/intro.mp3`
  - Timestamps: `/timestamps/intro.timestamps.json`

### 3. Chapter 1: The Real Estate Business
- **Chapter Info**: Title and description
- **Learning Objectives**: 7 original objectives
- **Key Terms**: 10 original key terms
- **Sections**: All 11 original sections with:
  - Original text content
  - Audio URLs: `/audio/chapter1-section1.mp3` through `chapter1-section11.mp3`
  - Timestamps URLs: `/timestamps/chapter1-section1.timestamps.json` through `chapter1-section11.timestamps.json`
- **Quiz Questions**: All 6 original quiz questions with:
  - Questions and options
  - Correct answers
  - Explanations (correct and incorrect)

## How It Works

The seed script uses **smart upsert** logic:

1. **If data doesn't exist**: Creates it with original content
2. **If data exists but is empty**: Updates it with original content
3. **If data exists and has content**: Preserves admin edits

This means:
- ✅ First run: Initializes everything with original data
- ✅ Subsequent runs: Preserves admin modifications
- ✅ Safe to run multiple times

## Admin Can Edit Everything

Once initialized, admins can edit:
- ✅ Introduction text, audio, and timestamps
- ✅ Chapter titles and descriptions
- ✅ Learning objectives
- ✅ Key terms
- ✅ All section content, titles, audio, and timestamps
- ✅ Quiz questions, options, answers, and explanations
- ✅ Quiz audio (question + options, correct/incorrect explanations)

## File Structure

Original audio and timestamps files should be in:
- `public/audio/` - All `.mp3` files
- `public/timestamps/` - All `.json` timestamp files

The seed script references these files by their paths:
- `/audio/chapter1-section1.mp3` through `chapter1-section11.mp3`
- `/audio/intro.mp3`
- `/timestamps/chapter1-section1.timestamps.json` through `chapter1-section11.timestamps.json`
- `/timestamps/intro.timestamps.json`

## Running the Seed Script

### First Time Setup
```bash
npm run db:seed
```

### After Database Reset
```bash
npm run db:seed
```

### To Reset Everything to Original
If you want to reset everything to original (WARNING: This will overwrite admin edits):
1. Delete the database or specific records
2. Run: `npm run db:seed`

## Verification

After running the seed script, you should see:
```
✅ Created admin user
✅ Created Introduction Chapter (Chapter 0)
✅ Created Introduction section
✅ Created Chapter 1
✅ Created/Updated learning objectives
✅ Created/Updated key terms
✅ Created/Updated all 11 sections
✅ Created/Updated all 6 quiz questions
🎉 Database seed completed!
```

## Troubleshooting

### Error: Database connection failed
- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `.env` file
- Verify database exists

### Error: Chapter already exists
- This is normal - the script will update existing data
- Admin edits are preserved if content exists

### Missing audio/timestamps files
- The script will still create database entries
- Audio/timestamps URLs will be set but files may not exist
- You can generate audio later using the admin panel

## Next Steps

After initialization:
1. Login as admin: `admin@example.com` / `admin123`
2. Navigate to admin panel
3. Edit any content as needed
4. Generate audio for quiz questions using "Generate All Audio" button

