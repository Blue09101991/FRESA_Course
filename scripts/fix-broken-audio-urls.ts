/**
 * Utility script to find and fix broken audio/timestamps URLs in the database
 * 
 * Usage: npx tsx scripts/fix-broken-audio-urls.ts
 */

import { PrismaClient } from '@prisma/client'
import { existsSync } from 'fs'
import { join } from 'path'
import { readdir } from 'fs/promises'

const prisma = new PrismaClient()

async function findBrokenUrls() {
  console.log('🔍 Scanning database for broken file URLs...\n')

  // Get all sections
  const sections = await prisma.section.findMany({
    select: {
      id: true,
      title: true,
      audioUrl: true,
      timestampsUrl: true,
    },
  })

  const brokenSections: Array<{
    id: string
    title: string
    audioUrl: string | null
    timestampsUrl: string | null
    audioExists: boolean
    timestampsExists: boolean
  }> = []

  for (const section of sections) {
    let audioExists = false
    let timestampsExists = false

    // Check audio file
    if (section.audioUrl) {
      const audioPath = section.audioUrl.startsWith('/') ? section.audioUrl.slice(1) : section.audioUrl
      const fullAudioPath = join(process.cwd(), 'public', audioPath)
      audioExists = existsSync(fullAudioPath)
      
      if (!audioExists) {
        console.log(`   ❌ Audio file missing: ${section.audioUrl}`)
      }
    }

    // Check timestamps file
    if (section.timestampsUrl) {
      const timestampsPath = section.timestampsUrl.startsWith('/') ? section.timestampsUrl.slice(1) : section.timestampsUrl
      const fullTimestampsPath = join(process.cwd(), 'public', timestampsPath)
      timestampsExists = existsSync(fullTimestampsPath)
      
      if (!timestampsExists) {
        console.log(`   ❌ Timestamps file missing: ${section.timestampsUrl}`)
      }
    }

    if (!audioExists || !timestampsExists) {
      brokenSections.push({
        id: section.id,
        title: section.title,
        audioUrl: section.audioUrl,
        timestampsUrl: section.timestampsUrl,
        audioExists,
        timestampsExists,
      })
    }
  }

  return brokenSections
}

async function findSimilarFiles(brokenUrl: string, directory: 'audio' | 'timestamps'): Promise<string | null> {
  try {
    const dirPath = join(process.cwd(), 'public', directory)
    const files = await readdir(dirPath)
    
    // Extract the text part from broken URL (e.g., "The_Real_Estate_Indu" from "1766915188704-The_Real_Estate_Indu.mp3")
    const brokenFileName = brokenUrl.split('/').pop() || ''
    const textPart = brokenFileName.split('-').slice(1).join('-').replace(/\.(mp3|json)$/, '')
    
    // Find files with similar text part
    const similarFiles = files.filter(file => {
      const fileTextPart = file.split('-').slice(1).join('-').replace(/\.(mp3|json)$/, '')
      return fileTextPart === textPart && file !== brokenFileName
    })
    
    if (similarFiles.length > 0) {
      // Return the most recent file (highest timestamp)
      similarFiles.sort().reverse()
      return `/${directory}/${similarFiles[0]}`
    }
  } catch (error) {
    console.error(`Error reading ${directory} directory:`, error)
  }
  
  return null
}

async function fixBrokenUrls() {
  try {
    const brokenSections = await findBrokenUrls()

    if (brokenSections.length === 0) {
      console.log('✅ No broken URLs found! All files exist.\n')
      return
    }

    console.log(`⚠️  Found ${brokenSections.length} section(s) with broken file URLs:\n`)

    for (const section of brokenSections) {
      console.log(`📄 Section: ${section.title}`)
      console.log(`   ID: ${section.id}`)
      
      let updatedAudioUrl = section.audioUrl
      let updatedTimestampsUrl = section.timestampsUrl

      // Try to find similar audio file
      if (!section.audioExists && section.audioUrl) {
        console.log(`   ❌ Audio file missing: ${section.audioUrl}`)
        const similarAudio = await findSimilarFiles(section.audioUrl, 'audio')
        if (similarAudio) {
          console.log(`   ✅ Found similar file: ${similarAudio}`)
          updatedAudioUrl = similarAudio
        } else {
          console.log(`   ⚠️  No similar audio file found. Setting to null.`)
          updatedAudioUrl = null
        }
      } else if (section.audioExists) {
        console.log(`   ✅ Audio file exists: ${section.audioUrl}`)
      }

      // Try to find similar timestamps file
      if (!section.timestampsExists && section.timestampsUrl) {
        console.log(`   ❌ Timestamps file missing: ${section.timestampsUrl}`)
        const similarTimestamps = await findSimilarFiles(section.timestampsUrl, 'timestamps')
        if (similarTimestamps) {
          console.log(`   ✅ Found similar file: ${similarTimestamps}`)
          updatedTimestampsUrl = similarTimestamps
        } else {
          console.log(`   ⚠️  No similar timestamps file found. Setting to null.`)
          updatedTimestampsUrl = null
        }
      } else if (section.timestampsExists) {
        console.log(`   ✅ Timestamps file exists: ${section.timestampsUrl}`)
      }

      // Update section if URLs changed
      if (updatedAudioUrl !== section.audioUrl || updatedTimestampsUrl !== section.timestampsUrl) {
        await prisma.section.update({
          where: { id: section.id },
          data: {
            audioUrl: updatedAudioUrl,
            timestampsUrl: updatedTimestampsUrl,
          },
        })
        console.log(`   ✅ Section updated!\n`)
      } else {
        console.log(`   ⚠️  No fix available. Please regenerate audio/timestamps.\n`)
      }
    }

    console.log('✅ Fix complete!')
  } catch (error) {
    console.error('❌ Error fixing broken URLs:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixBrokenUrls()

