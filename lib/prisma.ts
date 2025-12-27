import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if DATABASE_URL is set
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('⚠️  DATABASE_URL is not set in environment variables!')
  console.error('Please create a .env file with: DATABASE_URL="postgresql://..."')
}

let prismaClient: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prismaClient = new PrismaClient({
    log: ['error'],
  })
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
    })
  }
  prismaClient = globalForPrisma.prisma
}

export const prisma = prismaClient

