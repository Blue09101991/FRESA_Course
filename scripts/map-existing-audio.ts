import { PrismaClient } from '@prisma/client'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

// Helper function to normalize text for matching (same as in generate-audio route)
function sanitizeText(text: string): string {
  return text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')
}

// Improved matching function with multiple strategies
function filenameMatchesContent(filename: string, content: string, title?: string): number {
  // Returns a score from 0-100, higher = better match
  let score = 0
  const filenameLower = filename.toLowerCase()
  
  // Remove timestamp prefix (numbers at start) and extension
  const filenameWithoutExt = filenameLower
    .replace(/^\d+-/, '') // Remove timestamp prefix
    .replace(/\.(mp3|timestamps\.json)$/, '') // Remove extension
  
  // Strategy 1: Check sanitized content match (exact)
  const sanitizedContent = sanitizeText(content).toLowerCase()
  if (filenameWithoutExt === sanitizedContent) {
    score += 50 // Exact match gets high score
  } else if (filenameWithoutExt.includes(sanitizedContent) || sanitizedContent.includes(filenameWithoutExt)) {
    score += 30 // Partial match
  }
  
  // Strategy 2: Check title if provided
  if (title) {
    const sanitizedTitle = sanitizeText(title).toLowerCase()
    if (filenameWithoutExt === sanitizedTitle) {
      score += 40
    } else if (filenameWithoutExt.includes(sanitizedTitle) || sanitizedTitle.includes(filenameWithoutExt)) {
      score += 20
    }
  }
  
  // Strategy 3: Check for key words from content (first 5 words, longer than 3 chars)
  const words = content.split(/\s+/).slice(0, 5).map(w => 
    w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  ).filter(w => w.length > 3)
  
  let matchCount = 0
  for (const word of words) {
    if (filenameWithoutExt.includes(word)) {
      matchCount++
      score += 10 // Each matching word adds to score
    }
  }
  
  // Strategy 4: Check for specific patterns
  // Handle numbered items (e.g., "1__Describe" matches "1. Describe")
  if (content.match(/^\d+\.\s/)) {
    const numberMatch = content.match(/^(\d+)\.\s/)
    if (numberMatch) {
      const number = numberMatch[1]
      if (filenameWithoutExt.includes(`${number}__`) || filenameWithoutExt.startsWith(`${number}_`)) {
        score += 15
      }
    }
  }
  
  return score
}

// Find best matching file from fileMap
function findBestMatch(
  fileMap: Map<string, { audio: string; timestamps: string }>,
  content: string,
  title?: string,
  keywords?: string[]
): { audio: string; timestamps: string } | null {
  let bestMatch: { audio: string; timestamps: string } | null = null
  let bestScore = 0
  
  for (const [timestamp, files] of fileMap.entries()) {
    const audioFilename = files.audio.split('/').pop() || ''
    const score = filenameMatchesContent(audioFilename, content, title)
    
    // Also check keywords if provided
    let keywordScore = 0
    if (keywords) {
      for (const keyword of keywords) {
        if (audioFilename.toLowerCase().includes(keyword.toLowerCase())) {
          keywordScore += 10
        }
      }
    }
    
    const totalScore = score + keywordScore
    
    if (totalScore > bestScore) {
      bestScore = totalScore
      bestMatch = files
    }
  }
  
  // Only return match if score is above threshold
  return bestScore >= 20 ? bestMatch : null
}

async function main() {
  // Check for force update flag
  const forceUpdate = process.argv.includes('--force') || process.argv.includes('-f')
  
  if (forceUpdate) {
    console.log('⚠️  FORCE UPDATE MODE: Will update all records, even if they already have audio/timestamps\n')
  }
  
  console.log('🔍 Scanning existing audio and timestamp files...\n')

  // Read all audio files
  const audioDir = join(process.cwd(), 'public', 'audio')
  const timestampsDir = join(process.cwd(), 'public', 'timestamps')
  
  if (!existsSync(audioDir)) {
    console.error('❌ Audio directory not found:', audioDir)
    process.exit(1)
  }
  
  if (!existsSync(timestampsDir)) {
    console.error('❌ Timestamps directory not found:', timestampsDir)
    process.exit(1)
  }

  const audioFiles = (await readdir(audioDir)).filter(f => f.endsWith('.mp3'))
  const timestampFiles = (await readdir(timestampsDir)).filter(f => f.endsWith('.timestamps.json'))

  console.log(`📁 Found ${audioFiles.length} audio files`)
  console.log(`📁 Found ${timestampFiles.length} timestamp files\n`)

  // Create a map of timestamp -> audio/timestamp filenames
  const fileMap = new Map<string, { audio: string; timestamps: string }>()
  
  for (const audioFile of audioFiles) {
    const timestamp = audioFile.match(/^(\d+)-/)?.[1]
    if (timestamp) {
      const matchingTimestamp = timestampFiles.find(f => f.startsWith(`${timestamp}-`))
      if (matchingTimestamp) {
        fileMap.set(timestamp, {
          audio: `/audio/${audioFile}`,
          timestamps: `/timestamps/${matchingTimestamp}`
        })
      } else {
        console.warn(`⚠️  No matching timestamp file for audio: ${audioFile}`)
      }
    }
  }

  console.log(`✅ Mapped ${fileMap.size} audio/timestamp pairs\n`)

  let updatedCount = 0
  let skippedCount = 0
  let notFoundCount = 0

  // 1. Map Introduction
  console.log('📝 Mapping Introduction...')
  const introSection = await prisma.section.findFirst({
    where: { type: 'introduction' },
  })

  if (introSection) {
    const introText = introSection.text || "Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission."
    
    const matchedFile = findBestMatch(fileMap, introText, 'Introduction', ['hello', 'future_real'])
    
    if (matchedFile) {
      // Update if force mode or if missing audio/timestamps
      if (forceUpdate || !introSection.audioUrl || !introSection.timestampsUrl) {
        await prisma.section.update({
          where: { id: introSection.id },
          data: {
            audioUrl: matchedFile.audio,
            timestampsUrl: matchedFile.timestamps,
          },
        })
        console.log(`  ✅ Updated Introduction: ${matchedFile.audio}`)
        updatedCount++
      } else {
        console.log(`  ℹ️  Introduction already has audio/timestamps (use --force to update)`)
        skippedCount++
      }
    } else {
      console.log(`  ⚠️  Could not find matching audio for Introduction`)
      notFoundCount++
    }
  }

  // 2. Map Chapter 1 Sections
  console.log('\n📝 Mapping Chapter 1 Sections...')
  const chapter1 = await prisma.chapter.findUnique({
    where: { number: 1 },
    include: { sections: true },
  })

  if (chapter1) {
    const sections = chapter1.sections.filter(s => s.type === 'content')
    
    for (const section of sections) {
      const matchedFile = findBestMatch(fileMap, section.text, section.title)
      
      if (matchedFile) {
        // Update if force mode or if missing audio/timestamps
        if (forceUpdate || !section.audioUrl || !section.timestampsUrl) {
          await prisma.section.update({
            where: { id: section.id },
            data: {
              audioUrl: matchedFile.audio,
              timestampsUrl: matchedFile.timestamps,
            },
          })
          console.log(`  ✅ Updated Section "${section.title}": ${matchedFile.audio}`)
          updatedCount++
        } else {
          console.log(`  ℹ️  Section "${section.title}" already has audio/timestamps (use --force to update)`)
          skippedCount++
        }
      } else {
        console.log(`  ⚠️  Could not find matching audio for Section "${section.title}"`)
        notFoundCount++
      }
    }
  }

  // 3. Map Quiz Questions
  console.log('\n📝 Mapping Quiz Questions...')
  if (chapter1) {
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { chapterId: chapter1.id },
      orderBy: { order: 'asc' },
    })

    for (const question of quizQuestions) {
      // Match question audio (question + options)
      const questionText = `${question.question}. ${question.options.join('. ')}`
      const matchedFile = findBestMatch(fileMap, questionText, question.question)
      
      if (matchedFile) {
        // Update if force mode or if missing audio/timestamps
        if (forceUpdate || !question.audioUrl || !question.timestampsUrl) {
          await prisma.quizQuestion.update({
            where: { id: question.id },
            data: {
              audioUrl: matchedFile.audio,
              timestampsUrl: matchedFile.timestamps,
            },
          })
          console.log(`  ✅ Updated Question "${question.question.substring(0, 40)}...": ${matchedFile.audio}`)
          updatedCount++
        } else {
          console.log(`  ℹ️  Question already has audio/timestamps (use --force to update)`)
          skippedCount++
        }
      } else {
        console.log(`  ⚠️  Could not find matching audio for Question "${question.question.substring(0, 40)}..."`)
        notFoundCount++
      }

      // Match correct explanation audio
      if (question.explanation && typeof question.explanation === 'object') {
        const explanation = question.explanation as { correct?: string; incorrect?: string[] }
        
        if (explanation.correct) {
          const matchedFile = findBestMatch(fileMap, explanation.correct)
          
          if (matchedFile) {
            // Update if force mode or if missing audio/timestamps
            if (forceUpdate || !question.correctExplanationAudioUrl || !question.correctExplanationTimestampsUrl) {
              await prisma.quizQuestion.update({
                where: { id: question.id },
                data: {
                  correctExplanationAudioUrl: matchedFile.audio,
                  correctExplanationTimestampsUrl: matchedFile.timestamps,
                },
              })
              console.log(`    ✅ Updated Correct Explanation: ${matchedFile.audio}`)
              updatedCount++
            } else {
              skippedCount++
            }
          }
        }

        // Match incorrect explanation audio
        if (explanation.incorrect && Array.isArray(explanation.incorrect)) {
          const incorrectAudioUrls: string[] = []
          const incorrectTimestampsUrls: string[] = []

          for (let i = 0; i < explanation.incorrect.length; i++) {
            const incorrectText = explanation.incorrect[i]
            const matchedFile = findBestMatch(fileMap, incorrectText)
            
            if (matchedFile) {
              incorrectAudioUrls.push(matchedFile.audio)
              incorrectTimestampsUrls.push(matchedFile.timestamps)
            } else {
              incorrectAudioUrls.push('')
              incorrectTimestampsUrls.push('')
            }
          }

          // Only update if we found at least one match
          if (incorrectAudioUrls.some(url => url !== '')) {
            // Update if force mode or if missing audio/timestamps
            const existingUrls = question.incorrectExplanationAudioUrls as string[] | null
            if (forceUpdate || !existingUrls || existingUrls.length === 0 || existingUrls.every(url => !url)) {
              await prisma.quizQuestion.update({
                where: { id: question.id },
                data: {
                  incorrectExplanationAudioUrls: incorrectAudioUrls,
                  incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
                },
              })
              const matchedCount = incorrectAudioUrls.filter(url => url !== '').length
              console.log(`    ✅ Updated ${matchedCount} Incorrect Explanations`)
              updatedCount++
            } else {
              skippedCount++
            }
          }
        }
      }
    }
  }

  console.log('\n🎉 Audio/Timestamp mapping completed!')
  console.log('\n📊 Summary:')
  console.log(`   - Audio files scanned: ${audioFiles.length}`)
  console.log(`   - Timestamp files scanned: ${timestampFiles.length}`)
  console.log(`   - File pairs mapped: ${fileMap.size}`)
  console.log(`   - Records updated: ${updatedCount}`)
  console.log(`   - Records skipped (already have audio): ${skippedCount}`)
  console.log(`   - Records not found: ${notFoundCount}`)
  
  if (skippedCount > 0 && !forceUpdate) {
    console.log(`\n💡 Tip: Use --force flag to update all records, including those that already have audio/timestamps`)
    console.log(`   Example: npm run db:map-audio -- --force`)
  }
  
  if (notFoundCount > 0) {
    console.log('\n⚠️  Some files could not be matched. You may need to:')
    console.log('   1. Check if filenames match the content')
    console.log('   2. Manually update via admin panel')
    console.log('   3. Regenerate audio files if needed')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error mapping audio files:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
