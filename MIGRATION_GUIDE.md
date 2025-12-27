# Database Migration Guide

## Issue: Signup Error 500

If you're getting a 500 error when signing up, it's likely because the database schema doesn't match the Prisma schema. The `username` field was added to the schema but the database hasn't been updated yet.

## Solution: Run Database Migration

### Step 1: Create Migration
```bash
npx prisma migrate dev --name add_username_and_phone
```

This will:
- Create a new migration file
- Apply the migration to your database
- Update the database schema to include `username` and `phone` fields

### Step 2: Verify Migration
After running the migration, you should see:
- New migration files in `prisma/migrations/`
- Database updated with new fields

### Step 3: Test Signup
Try signing up again - it should work now!

## Alternative: Reset Database (Development Only)

If you're in development and don't have important data:

```bash
npx prisma migrate reset
```

This will:
- Drop the database
- Recreate it
- Run all migrations
- Run seed script (if configured)

## Check Database Connection

Make sure your `.env` file has the correct `DATABASE_URL`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/e_course?schema=public"
```

## Verify Prisma Client

After migration, regenerate Prisma Client:

```bash
npx prisma generate
```

