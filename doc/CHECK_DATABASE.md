# Check Your Database Setup

## Step 1: Verify .env File

Open your `.env` file and make sure it has:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
JWT_SECRET="your-secret-key"
```

**Important:** 
- Replace `username`, `password`, and `database_name` with your actual values
- Make sure there are NO spaces around the `=` sign
- Make sure the URL is in quotes

## Step 2: Test Database Connection

Run this command to test if Prisma can connect:

```bash
npx prisma db pull
```

If this fails, your DATABASE_URL is wrong or PostgreSQL isn't running.

## Step 3: Check if Database Exists

Connect to PostgreSQL and check:

```sql
\l
```

This lists all databases. Make sure your database name exists.

If it doesn't exist, create it:

```sql
CREATE DATABASE your_database_name;
```

## Step 4: Check if Tables Exist

Run migrations to create tables:

```bash
npx prisma migrate deploy
```

Or for development:

```bash
npx prisma migrate dev
```

## Step 5: Verify Prisma Client

```bash
npx prisma generate
```

## Step 6: Restart Dev Server

**IMPORTANT:** After changing `.env` file, you MUST restart your dev server:

1. Stop server (Ctrl+C)
2. Start again: `npm run dev`

## Common Issues

### Issue: "Can't reach database server"
- PostgreSQL service is not running
- Start PostgreSQL service
- Check if port 5432 is correct

### Issue: "Authentication failed"
- Wrong username/password in DATABASE_URL
- Check your PostgreSQL credentials

### Issue: "Database does not exist"
- Database name in DATABASE_URL doesn't exist
- Create the database first

### Issue: "Table does not exist"
- Run migrations: `npx prisma migrate deploy`

## Quick Test

After setup, test the connection:

```bash
npx prisma studio
```

This opens a database browser. If it works, your connection is good!

