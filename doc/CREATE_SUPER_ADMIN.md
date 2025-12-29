# Create Super Admin User

This guide shows you how to easily create a super admin user in the database.

## Quick Method (Using npm script)

### Default Admin (Recommended for first time)
```bash
npm run create-super-admin
```

This will create an admin with:
- **Email**: `admin@example.com`
- **Username**: `admin`
- **Password**: `admin123`
- **Name**: `Super Admin`

### Custom Admin
```bash
npm run create-super-admin <email> <username> <password> <name> [phone]
```

**Example:**
```bash
npm run create-super-admin admin@mycompany.com superadmin MySecurePass123 "John Doe" "+1234567890"
```

## Alternative Method (Using tsx directly)

```bash
npx tsx scripts/create-admin.ts <email> <username> <password> <name> [phone]
```

## Parameters

1. **email** (required): Email address for the admin user
2. **username** (required): Unique username
3. **password** (required): Password (will be hashed automatically)
4. **name** (required): Full name
5. **phone** (optional): Phone number

## Examples

### Create default admin
```bash
npm run create-super-admin
```

### Create custom admin
```bash
npm run create-super-admin admin@company.com admin securepass123 "Admin User"
```

### Create admin with phone
```bash
npm run create-super-admin admin@company.com admin securepass123 "Admin User" "+1234567890"
```

## What the script does

1. ✅ Checks if user already exists (by email or username)
2. ✅ Updates existing user to Admin role if found
3. ✅ Creates new Admin user if not found
4. ✅ Hashes password securely
5. ✅ Sets role to `Admin` (highest role in the system)

## Available Roles

- **Admin**: Full access to all features (super admin)
- **Developer**: Development access
- **Editor**: Content editing access
- **Student**: Read-only access

## Security Notes

⚠️ **IMPORTANT**: 
- Change the default password after first login!
- Use strong passwords in production
- Keep admin credentials secure

## Troubleshooting

### Error: Email or username already exists
The script will update the existing user to Admin role automatically.

### Error: Database connection failed
Make sure:
- PostgreSQL is running
- `DATABASE_URL` is set correctly in `.env` file
- Database exists and is accessible

### Error: Cannot find module
Run:
```bash
npm install
```

## Login

After creating the admin, you can login at:
- **URL**: `http://localhost:3000/login`
- Use the email or username you created
- Use the password you specified

