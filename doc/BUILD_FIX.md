# Fix Build Error on Windows

## The Problem

When running `npm run build`, you're getting this error:

```
Error [TurbopackInternalError]: create symlink to ../../../node_modules/@prisma/client
Caused by:
- A required privilege is not held by the client. (os error 1314)
```

This is a Windows permissions issue with Turbopack trying to create symlinks.

## Solution 1: Use Webpack for Build (Recommended) ✅

I've updated the build script to use webpack by default, which avoids the symlink issue:

```bash
npm run build
```

This now uses `--webpack` flag automatically.

## Solution 2: Run as Administrator

1. Close your terminal/VS Code
2. Right-click on VS Code or Terminal
3. Select "Run as administrator"
4. Navigate to your project
5. Run: `npm run build`

## Solution 3: Enable Developer Mode (Permanent Fix)

1. Open Windows Settings
2. Go to "Privacy & Security" → "For developers"
3. Enable "Developer Mode"
4. Restart your computer
5. Try building again

## Solution 4: Generate Prisma Client Before Building

Always run this before building:

```bash
npx prisma generate
npm run build
```

## Solution 5: Use Turbopack Explicitly (If You Have Permissions)

If you've enabled Developer Mode or are running as admin:

```bash
npm run build:turbo
```

## Quick Fix

The easiest solution is to just use:

```bash
npm run build
```

This now uses webpack instead of Turbopack, which avoids the symlink issue entirely.

## Verify It Works

After applying a fix:

1. Run: `npx prisma generate` (to ensure Prisma client is ready)
2. Run: `npm run build`
3. The build should complete successfully!

The build output will be in the `.next` folder.

