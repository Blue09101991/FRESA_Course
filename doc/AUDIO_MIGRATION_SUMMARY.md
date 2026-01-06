# Audio & Timestamp Files Migration - Summary

## What This Does

This system allows you to:
1. ✅ Use existing audio and timestamp files in `public/audio` and `public/timestamps` as initial/reference data
2. ✅ Automatically map these files to database records (introduction, sections, objectives, key terms, quiz questions)
3. ✅ Save file paths in the database so they're preserved
4. ✅ Easily migrate files to your server

---

## Quick Start

### Step 1: Map Existing Files (Local)

```bash
npm run db:map-audio
```

This will:
- Scan all files in `public/audio` and `public/timestamps`
- Match them to database records using intelligent content matching
- Update the database with file paths
- Only update records that don't already have audio/timestamps

### Step 2: Verify Mapping

Check the admin panel or use:
```bash
npx prisma studio
```

All sections, objectives, key terms, and quiz questions should show audio/timestamps status.

### Step 3: Deploy to Server

**Copy files to server:**
```bash
# Using rsync (recommended)
rsync -avz --progress public/audio/ user@your-server:/var/www/e_course/public/audio/
rsync -avz --progress public/timestamps/ user@your-server:/var/www/e_course/public/timestamps/
```

**On server, map files:**
```bash
cd /var/www/e_course
npm run db:map-audio
```

---

## How It Works

### File Matching Algorithm

The script uses intelligent matching:

1. **Filename Pattern:**
   - Files follow pattern: `{timestamp}-{sanitized-text}.mp3`
   - Example: `1767679278928-The_Real_Estate_Indu.mp3`

2. **Content Matching:**
   - Extracts first 20 characters from content
   - Sanitizes (removes special chars, converts to lowercase)
   - Checks if sanitized content appears in filename
   - Also checks for 2+ matching keywords from content

3. **Database Updates:**
   - Only updates records without existing audio/timestamps
   - Preserves admin modifications
   - Updates all content types: Introduction, Sections, Objectives, Key Terms, Quiz Questions

---

## What Gets Mapped

| Content Type | Database Field | Notes |
|-------------|----------------|-------|
| Introduction | `Section.audioUrl`<br>`Section.timestampsUrl` | Type: 'introduction' |
| Chapter Sections | `Section.audioUrl`<br>`Section.timestampsUrl` | Type: 'content' |
| Learning Objectives | `LearningObjective.audioUrl`<br>`LearningObjective.timestampsUrl` | Saved to first objective (combined audio) |
| Key Terms | `KeyTerm.audioUrl`<br>`KeyTerm.timestampsUrl` | Saved to first key term (combined audio) |
| Quiz Questions | `QuizQuestion.audioUrl`<br>`QuizQuestion.timestampsUrl` | Question + options audio |
| Quiz Correct Explanation | `QuizQuestion.correctExplanationAudioUrl`<br>`QuizQuestion.correctExplanationTimestampsUrl` | |
| Quiz Incorrect Explanations | `QuizQuestion.incorrectExplanationAudioUrls`<br>`QuizQuestion.incorrectExplanationTimestampsUrls` | Array of URLs |

---

## Files Created

1. **`scripts/map-existing-audio.ts`** - Main mapping script
2. **`doc/MIGRATE_AUDIO_FILES.md`** - Detailed migration guide
3. **`QUICK_AUDIO_MIGRATION.md`** - Quick reference guide
4. **`AUDIO_MIGRATION_SUMMARY.md`** - This file

---

## Commands Added

```json
{
  "db:map-audio": "tsx scripts/map-existing-audio.ts"
}
```

Run with: `npm run db:map-audio`

---

## Example Output

```
🔍 Scanning existing audio and timestamp files...

📁 Found 50 audio files
📁 Found 50 timestamp files

✅ Mapped 50 audio/timestamp pairs

📝 Mapping Introduction...
  ✅ Updated Introduction: /audio/1767680017676-Hello__future_real_e.mp3

📝 Mapping Chapter 1 Sections...
  ✅ Updated Section "The Real Estate Industry": /audio/1767679278928-The_Real_Estate_Indu.mp3
  ✅ Updated Section "Economic Impact": /audio/1767679291893-Many_industries_rely.mp3
  ...

📝 Mapping Learning Objectives...
  ✅ Updated Learning Objectives: /audio/1767679465591-1__Describe_the_vari.mp3

📝 Mapping Key Terms...
  ✅ Updated Key Terms: /audio/1767679479589-absentee_owner__appr.mp3

📝 Mapping Quiz Questions...
  ✅ Updated Question "The field of property management...": /audio/1767679494401-The_field_of_propert.mp3
    ✅ Updated Correct Explanation: /audio/1767679505325-The_increase_in_the_.mp3
    ✅ Updated 4 Incorrect Explanations

🎉 Audio/Timestamp mapping completed!

📊 Summary:
   - Audio files scanned: 50
   - Timestamp files scanned: 50
   - File pairs mapped: 50
```

---

## Troubleshooting

**Files not matching?**
- Check filename format matches: `{timestamp}-{text}.mp3`
- Run script multiple times (it's safe, only updates missing fields)
- Check console output for warnings
- Manually update via admin panel if needed

**Files not accessible on server?**
- Check file permissions: `chmod -R 755 public/audio`
- Check Nginx configuration
- Verify files exist: `ls -la public/audio/`

**Database not updating?**
- Check database connection
- Verify Prisma client is generated: `npm run db:generate`
- Check console for errors

---

## Next Steps

1. ✅ Run `npm run db:map-audio` locally
2. ✅ Verify mapping in admin panel
3. ✅ Copy files to server (rsync/scp/git)
4. ✅ Run `npm run db:map-audio` on server
5. ✅ Verify files are accessible

---

**For detailed instructions, see:**
- `doc/MIGRATE_AUDIO_FILES.md` - Full migration guide
- `QUICK_AUDIO_MIGRATION.md` - Quick reference
- `doc/UBUNTU_DEPLOYMENT.md` - Server deployment guide

