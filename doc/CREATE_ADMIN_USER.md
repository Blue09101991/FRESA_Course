# How to Create an Admin User Manually

There are several ways to create an admin user. Choose the method that works best for you.

## Method 1: Using the Seed Script (Easiest) ⭐

The seed script already creates a default admin user. Just run:

```bash
npm run db:seed
```

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `admin123`
- Username: `admin`

⚠️ **Important:** Change the password after first login!

---

## Method 2: Create Custom Admin via Seed Script

Edit `scripts/seed.ts` to create your custom admin user:

```typescript
const adminEmail = 'your-email@example.com'
const adminPassword = await hashPassword('your-secure-password')

const admin = await prisma.user.upsert({
  where: { email: adminEmail },
  update: {},
  create: {
    email: adminEmail,
    username: 'your-username',
    password: adminPassword,
    name: 'Your Name',
    phone: null,
    role: UserRole.Admin,
  },
})
```

Then run:
```bash
npm run db:seed
```

---

## Method 3: Using Prisma Studio (GUI) 🎨

1. **Start Prisma Studio:**
   ```bash
   npm run db:studio
   ```

2. **Open in browser:** Usually at `http://localhost:5555`

3. **Click on "User" model**

4. **Click "Add record"**

5. **Fill in the fields:**
   - `email`: Your email (must be unique)
   - `username`: Your username (must be unique)
   - `name`: Your full name
   - `password`: **⚠️ You need to hash this first!** (See Method 4 for password hashing)
   - `phone`: (optional)
   - `role`: Select `Admin` from dropdown

6. **Click "Save 1 change"**

⚠️ **Note:** You need to hash the password first. Use Method 4 to get a hashed password.

---

## Method 4: Create Admin Script (Recommended) 🚀

Create a new script file `scripts/create-admin.ts`:

```typescript
import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'admin@example.com'
  const username = process.argv[3] || 'admin'
  const password = process.argv[4] || 'admin123'
  const name = process.argv[5] || 'Admin User'

  console.log('🔐 Creating admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Username: ${username}`)
  console.log(`   Name: ${name}`)

  const hashedPassword = await hashPassword(password)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.Admin,
      password: hashedPassword,
    },
    create: {
      email,
      username,
      password: hashedPassword,
      name,
      phone: null,
      role: UserRole.Admin,
    },
  })

  console.log('✅ Admin user created successfully!')
  console.log(`   ID: ${admin.id}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Username: ${admin.username}`)
  console.log(`   Role: ${admin.role}`)
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Usage:**

```bash
# Default admin
npx tsx scripts/create-admin.ts

# Custom admin
npx tsx scripts/create-admin.ts your-email@example.com your-username your-password "Your Name"
```

---

## Method 5: Using SQL Directly 💾

1. **Connect to your PostgreSQL database:**
   ```bash
   psql -U your_username -d sales_course
   ```

2. **Hash the password first** (use Node.js):
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(h => console.log(h))"
   ```

3. **Insert the admin user:**
   ```sql
   INSERT INTO "User" (id, email, username, password, name, role, "createdAt", "updatedAt")
   VALUES (
     gen_random_uuid()::text,
     'admin@example.com',
     'admin',
     '$2a$10$YOUR_HASHED_PASSWORD_HERE',
     'Admin User',
     'Admin',
     NOW(),
     NOW()
   )
   ON CONFLICT (email) DO NOTHING;
   ```

---

## Method 6: Sign Up and Update Role

1. **Sign up as a regular user** through the app
2. **Update the role in database:**

   Using Prisma Studio:
   - Open Prisma Studio: `npm run db:studio`
   - Find your user
   - Change `role` to `Admin`
   - Save

   Or using SQL:
   ```sql
   UPDATE "User" 
   SET role = 'Admin' 
   WHERE email = 'your-email@example.com';
   ```

---

## Quick Reference: User Roles

- `Admin` - Full access to admin panel
- `Developer` - Full access to admin panel
- `Editor` - Full access to admin panel
- `Student` - Regular user, can access courses

---

## Recommended Approach

For production, use **Method 4** (Create Admin Script) as it:
- ✅ Properly hashes passwords
- ✅ Handles duplicates (upsert)
- ✅ Easy to customize
- ✅ Can be automated

For quick testing, use **Method 1** (Seed Script) as it's the fastest.

