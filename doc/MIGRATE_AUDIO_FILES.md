# Migrating Audio and Timestamp Files to Server

This guide explains how to use existing audio and timestamp files as initial/reference data and migrate them to your Ubuntu server.

## Overview

The system can automatically scan your `public/audio` and `public/timestamps` folders and map the files to database records. This allows you to:
1. Use existing generated audio files as initial data
2. Preserve file references in the database
3. Migrate files to the server easily

---

## Step 1: Map Existing Files to Database (Local)

Before deploying, run the mapping script to link your existing files to database records:

```bash
npm run db:map-audio
```

This script will:
- Scan all files in `public/audio` and `public/timestamps`
- Match them to database records (introduction, sections, objectives, key terms, quiz questions)
- Update the database with the file paths
- Only update records that don't already have audio/timestamps URLs

**What it does:**
- Matches files by content similarity (checks if filename contains keywords from the text)
- Updates Introduction section
- Updates Chapter 1 sections
- Updates Learning Objectives (saves to first objective)
- Updates Key Terms (saves to first key term)
- Updates Quiz Questions and their explanations

---

## Step 2: Verify Mapping

After running the script, verify the mapping:

```bash
# Check database records
npx prisma studio
```

Or check via the admin panel - all sections, objectives, key terms, and quiz questions should show audio/timestamps status.

---

## Step 3: Prepare Files for Migration

### Option A: Using Git (Recommended if files are small)

If your audio files are committed to Git:

```bash
# On your local machine
git add public/audio public/timestamps
git commit -m "Add audio and timestamp files"
git push

# On server
git pull
```

### Option B: Using SCP (Secure Copy)

If files are not in Git or too large:

```bash
# From your local machine, copy files to server
scp -r public/audio user@your-server-ip:/var/www/e_course/public/
scp -r public/timestamps user@your-server-ip:/var/www/e_course/public/
```

### Option C: Using rsync (Recommended for large files)

```bash
# Sync files to server (only copies new/changed files)
rsync -avz --progress public/audio/ user@your-server-ip:/var/www/e_course/public/audio/
rsync -avz --progress public/timestamps/ user@your-server-ip:/var/www/e_course/public/timestamps/
```

---

## Step 4: Deploy Database with File References

### On Server:

1. **Run database migrations:**
   ```bash
   cd /var/www/e_course
   npm run db:generate
   npx prisma migrate deploy
   ```

2. **Seed initial data:**
   ```bash
   npm run db:seed
   ```

3. **Map existing files (if you copied files to server):**
   ```bash
   npm run db:map-audio
   ```

   This will update the database with the actual file paths that exist on the server.

---

## Step 5: Verify Files on Server

```bash
# Check if files exist
ls -la public/audio/
ls -la public/timestamps/

# Check file permissions
chmod -R 755 public/audio
chmod -R 755 public/timestamps

# Verify Nginx can serve them
curl http://localhost/audio/your-file.mp3
```

---

## How the Mapping Works

The `map-existing-audio.ts` script uses intelligent matching:

1. **Filename Pattern Matching:**
   - Extracts timestamp prefix from filename (e.g., `1767679278928-`)
   - Matches audio and timestamp files by timestamp
   - Removes timestamp and extension to get content identifier

2. **Content Matching:**
   - Sanitizes content text (first 20 chars, removes special chars)
   - Checks if sanitized content appears in filename
   - Also checks for key words from content

3. **Database Updates:**
   - Only updates records that don't already have audio/timestamps
   - Preserves admin modifications
   - Updates Introduction, Sections, Objectives, Key Terms, and Quiz Questions

---

## Manual Mapping (If Automatic Fails)

If the automatic mapping doesn't work perfectly, you can manually update via:

1. **Admin Panel:**
   - Go to each section/question in admin
   - Manually enter the audio and timestamp URLs

2. **Database Direct:**
   ```bash
   npx prisma studio
   # Edit records directly
   ```

3. **SQL Update:**
   ```sql
   UPDATE "Section" 
   SET "audioUrl" = '/audio/your-file.mp3', 
       "timestampsUrl" = '/timestamps/your-file.timestamps.json'
   WHERE id = 'section-id';
   ```

---

## File Structure on Server

After migration, your server should have:

```
/var/www/e_course/
├── public/
│   ├── audio/
│   │   ├── 1767679278928-The_Real_Estate_Indu.mp3
│   │   ├── 1767679291893-Many_industries_rely.mp3
│   │   └── ... (all audio files)
│   └── timestamps/
│       ├── 1767679278928-The_Real_Estate_Indu.timestamps.json
│       ├── 1767679291893-Many_industries_rely.timestamps.json
│       └── ... (all timestamp files)
```

---

## Troubleshooting

### Files Not Found After Migration

1. **Check file paths in database:**
   ```bash
   npx prisma studio
   # Check audioUrl and timestampsUrl fields
   ```

2. **Verify files exist:**
   ```bash
   ls -la public/audio/$(basename /audio/your-file.mp3)
   ```

3. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Mapping Script Doesn't Match Files

1. **Check filename format:**
   - Files should follow pattern: `{timestamp}-{sanitized-text}.mp3`
   - Timestamp should match between audio and timestamps files

2. **Run with verbose logging:**
   - Edit `scripts/map-existing-audio.ts` to add more console.log statements
   - Check what content it's trying to match

3. **Manual mapping:**
   - Use admin panel to manually set audio/timestamps URLs

### Files Not Accessible via Browser

1. **Check file permissions:**
   ```bash
   chmod -R 755 public/audio
   chmod -R 755 public/timestamps
   ```

2. **Check Nginx configuration:**
   - Ensure `/audio` and `/timestamps` locations are configured
   - See `doc/UBUNTU_DEPLOYMENT.md` for Nginx setup

3. **Check file ownership:**
   ```bash
   sudo chown -R www-data:www-data public/audio
   sudo chown -R www-data:www-data public/timestamps
   ```

---

## Best Practices

1. **Backup Before Migration:**
   ```bash
   # Backup database
   pg_dump -U e_course_user e_course > backup_before_migration.sql
   
   # Backup files
   tar -czf audio_backup.tar.gz public/audio public/timestamps
   ```

2. **Test Locally First:**
   - Run `npm run db:map-audio` locally
   - Verify all files are mapped correctly
   - Test that audio plays correctly

3. **Version Control:**
   - Consider committing audio files to Git (if repository size allows)
   - Or use Git LFS for large files
   - Or document which files need to be migrated separately

4. **Cloud Storage (Future):**
   - For production, consider using cloud storage (S3, Cloudinary)
   - Update file URLs to point to cloud storage
   - This solves serverless deployment issues

---

## Quick Reference

```bash
# Local: Map existing files
npm run db:map-audio

# Local: Verify mapping
npx prisma studio

# Server: Copy files
rsync -avz public/audio/ user@server:/var/www/e_course/public/audio/
rsync -avz public/timestamps/ user@server:/var/www/e_course/public/timestamps/

# Server: Run mapping
cd /var/www/e_course
npm run db:map-audio

# Server: Verify
ls -la public/audio/
curl http://localhost/audio/your-file.mp3
```

---

**For detailed server deployment, see:** `doc/UBUNTU_DEPLOYMENT.md`
