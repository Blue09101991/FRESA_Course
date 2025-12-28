/**
 * Script to fix audio and timestamps URLs in the database
 * Checks if files exist and updates URLs if files are missing
 * 
 * Usage: npx tsx scripts/fix-audio-urls.ts
 */

import { PrismaClient } from '@prisma/client'
import { existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function fixAudioUrls() {
  console.log('🔍 Checking audio and timestamps files...\n')

  // Get all sections
  const sections = await prisma.section.findMany({
    select: {
      id: true,
      title: true,
      audioUrl: true,
      timestampsUrl: true,
    },
  })

  console.log(`Found ${sections.length} sections to check\n`)

  let fixedCount = 0
  let missingCount = 0

  for (const section of sections) {
    let needsUpdate = false
    const updates: { audioUrl?: string | null; timestampsUrl?: string | null } = {}

    // Check audio file
    if (section.audioUrl) {
      console.log(`\n📁 Checking section: ${section.title}`)
      console.log(`   Audio URL in DB: ${section.audioUrl}`)
      
      // Remove leading slash if present
      const audioPath = section.audioUrl.startsWith('/')
        ? section.audioUrl.substring(1)
        : section.audioUrl
      
      // Add public/ prefix if not present
      const fullPath = audioPath.startsWith('public/')
        ? join(process.cwd(), audioPath)
        : join(process.cwd(), 'public', audioPath)

      console.log(`   Checking path: ${fullPath}`)
      console.log(`   File exists: ${existsSync(fullPath)}`)

      if (!existsSync(fullPath)) {
        console.log(`❌ Missing audio: ${section.audioUrl}`)
        console.log(`   Section: ${section.title}`)
        console.log(`   Expected at: ${fullPath}`)
        
        // Try to find a similar file
        const fileName = audioPath.split('/').pop() || ''
        const baseName = fileName.replace(/^\d+-/, '') // Remove timestamp prefix
        
        if (baseName) {
          const audioDir = join(process.cwd(), 'public', 'audio')
          const files = require('fs').readdirSync(audioDir).filter((f: string) => 
            f.includes(baseName) && f.endsWith('.mp3')
          )
          
          if (files.length > 0) {
            const foundFile = files[0]
            const newUrl = `/audio/${foundFile}`
            console.log(`   ✅ Found similar file: ${foundFile}`)
            console.log(`   📝 Will update to: ${newUrl}`)
            updates.audioUrl = newUrl
            needsUpdate = true
          } else {
            console.log(`   ⚠️  No similar file found, will set to null`)
            updates.audioUrl = null
            needsUpdate = true
            missingCount++
          }
        } else {
          updates.audioUrl = null
          needsUpdate = true
          missingCount++
        }
        console.log('')
      }
    }

    // Check timestamps file
    if (section.timestampsUrl) {
      const timestampsPath = section.timestampsUrl.startsWith('/')
        ? section.timestampsUrl.substring(1)
        : section.timestampsUrl
      
      const fullPath = timestampsPath.startsWith('public/')
        ? join(process.cwd(), timestampsPath)
        : join(process.cwd(), 'public', timestampsPath)

      if (!existsSync(fullPath)) {
        console.log(`❌ Missing timestamps: ${section.timestampsUrl}`)
        console.log(`   Section: ${section.title}`)
        console.log(`   Expected at: ${fullPath}`)
        
        // Try to find a similar file
        const fileName = timestampsPath.split('/').pop() || ''
        const baseName = fileName.replace(/^\d+-/, '').replace(/\.timestamps\.json$/, '')
        
        if (baseName) {
          const timestampsDir = join(process.cwd(), 'public', 'timestamps')
          const files = require('fs').readdirSync(timestampsDir).filter((f: string) => 
            f.includes(baseName) && f.endsWith('.json')
          )
          
          if (files.length > 0) {
            const foundFile = files[0]
            const newUrl = `/timestamps/${foundFile}`
            console.log(`   ✅ Found similar file: ${foundFile}`)
            console.log(`   📝 Will update to: ${newUrl}`)
            updates.timestampsUrl = newUrl
            needsUpdate = true
          } else {
            console.log(`   ⚠️  No similar file found, will set to null`)
            updates.timestampsUrl = null
            needsUpdate = true
            missingCount++
          }
        } else {
          updates.timestampsUrl = null
          needsUpdate = true
          missingCount++
        }
        console.log('')
      }
    }

    // Update if needed
    if (needsUpdate) {
      await prisma.section.update({
        where: { id: section.id },
        data: updates,
      })
      fixedCount++
      console.log(`✅ Updated section: ${section.title}\n`)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Total sections checked: ${sections.length}`)
  console.log(`   Sections fixed: ${fixedCount}`)
  console.log(`   Files still missing: ${missingCount}`)
  console.log('\n✅ Done!')
}

fixAudioUrls()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

