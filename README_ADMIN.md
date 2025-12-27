# Admin Panel Setup Guide

## Prerequisites

1. PostgreSQL database installed and running
2. Node.js 18+ installed

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

1. Create a PostgreSQL database:
```sql
CREATE DATABASE e_course;
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DATABASE_URL="postgresql://username:password@localhost:5432/e_course?schema=public"
JWT_SECRET="your-random-secret-key-here"
```

### 3. Initialize Database

1. Generate Prisma Client:
```bash
npx prisma generate
```

2. Run migrations:
```bash
npx prisma migrate dev --name init
```

### 4. Create Admin User

You can create an admin user using the signup API or by running a script. For now, use the signup page at `/signup` and manually set the role in the database:

```sql
UPDATE "User" SET role = 'Admin' WHERE email = 'your-email@example.com';
```

Or use the signup API with role parameter (only works if you're already an admin).

### 5. Start Development Server

```bash
npm run dev
```

## User Roles

- **Admin**: Full access to all features, can delete content
- **Developer**: Full access to all features, can delete content
- **Editor**: Can create and edit content, cannot delete
- **Student**: Read-only access to course content

## Admin Panel Features

### Chapters Management
- Create new chapters
- Edit chapter details (title, description)
- Delete chapters (Admin/Developer only)
- View all sections in a chapter

### Sections Management
- Create new sections
- Edit section content (title, text, audio URLs, timestamps)
- Delete sections (Admin/Developer only)
- Organize sections by order
- Set section types (objectives, key-terms, content)

### Learning Objectives
- Add learning objectives to chapters
- Edit and delete objectives
- Reorder objectives

### Key Terms
- Add key terms to chapters
- Edit and delete key terms
- Reorder key terms

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Admin - Chapters
- `GET /api/admin/chapters` - List all chapters
- `POST /api/admin/chapters` - Create new chapter
- `GET /api/admin/chapters/[id]` - Get chapter details
- `PUT /api/admin/chapters/[id]` - Update chapter
- `DELETE /api/admin/chapters/[id]` - Delete chapter

### Admin - Sections
- `GET /api/admin/sections?chapterId=xxx` - List sections
- `POST /api/admin/sections` - Create new section
- `GET /api/admin/sections/[id]` - Get section details
- `PUT /api/admin/sections/[id]` - Update section
- `DELETE /api/admin/sections/[id]` - Delete section

## Security Notes

1. **JWT Secret**: Always use a strong, random secret in production
2. **Database**: Use environment variables for database credentials
3. **HTTPS**: Always use HTTPS in production
4. **Password Hashing**: Passwords are automatically hashed using bcrypt
5. **Role-Based Access**: Middleware enforces role-based access control

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env` file
- Ensure database exists

### Authentication Issues
- Clear browser cookies
- Check JWT_SECRET is set
- Verify token expiration (default: 7 days)

### Permission Denied
- Check user role in database
- Verify token is valid
- Ensure middleware is working correctly

