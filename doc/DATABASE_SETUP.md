# Database Setup Guide

## Issue: Login/Signup 500 Error

If you're getting a 500 error when trying to login or signup, it's because the database connection is not configured.

## Solution: Configure Database

### Step 1: Create `.env` file

Create a `.env` file in the root directory of your project (if it doesn't exist).

### Step 2: Add Database URL

Add your PostgreSQL database connection string to `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
JWT_SECRET="your-random-secret-key-here-change-this"
```

**Example:**
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/sales_course?schema=public"
JWT_SECRET="my-super-secret-jwt-key-12345"
```

### Step 3: Create Database

Make sure your PostgreSQL database exists:

```sql
CREATE DATABASE sales_course;
```

Or use your existing database name.

### Step 4: Run Migrations

After setting up the database URL, run:

```bash
npx prisma migrate deploy
```

Or for development:

```bash
npx prisma migrate dev
```

### Step 5: Generate Prisma Client

```bash
npx prisma generate
```

### Step 6: Restart Development Server

Stop your dev server (Ctrl+C) and restart it:

```bash
npm run dev
```

## Verify Database Connection

You can test the connection by running:

```bash
npx prisma db pull
```

This will show if Prisma can connect to your database.

## Common Issues

### Issue: "Can't reach database server"
- Make sure PostgreSQL is running
- Check if the host/port is correct
- Verify firewall settings

### Issue: "Authentication failed"
- Check username and password in DATABASE_URL
- Verify database user has proper permissions

### Issue: "Database does not exist"
- Create the database first
- Or use an existing database name

## Quick Setup Script

If you have PostgreSQL installed locally:

1. Create database:
```sql
CREATE DATABASE sales_course;
```

2. Update `.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/sales_course?schema=public"
JWT_SECRET="change-this-to-random-string"
```

3. Run migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

4. Seed database (optional):
```bash
npm run db:seed
```

5. Restart dev server:
```bash
npm run dev
```

Now login/signup should work!

