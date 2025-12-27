# Quick Fix: Database Connection Error

## The Problem

You're getting 500 errors on login/signup because **DATABASE_URL is not set** in your environment variables.

## Quick Solution (3 Steps)

### Step 1: Create `.env` file

In your project root (`D:\Project\E_Course`), create a file named `.env` (no extension) with:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/sales_course?schema=public"
JWT_SECRET="change-this-to-a-random-string-12345"
```

**Replace:**
- `yourpassword` with your PostgreSQL password
- `sales_course` with your database name (or create this database)
- `change-this-to-a-random-string-12345` with a random secret key

### Step 2: Create Database (if needed)

Open PostgreSQL and run:

```sql
CREATE DATABASE sales_course;
```

### Step 3: Run Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### Step 4: Restart Server

Stop your dev server (Ctrl+C) and restart:

```bash
npm run dev
```

## Verify It Works

After setting up `.env` and running migrations, try login/signup again. The error should be gone!

## Still Having Issues?

1. **Check PostgreSQL is running:**
   - Make sure PostgreSQL service is started
   - Check if you can connect with: `psql -U postgres`

2. **Verify DATABASE_URL format:**
   - Format: `postgresql://username:password@host:port/database?schema=public`
   - Example: `postgresql://postgres:mypass@localhost:5432/sales_course?schema=public`

3. **Check .env file location:**
   - Must be in project root: `D:\Project\E_Course\.env`
   - Not in a subfolder!

4. **Restart dev server after .env changes:**
   - Next.js only reads .env on startup

