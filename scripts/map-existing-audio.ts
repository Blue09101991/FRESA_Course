import { PrismaClient } from '@prisma/client'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

// Helper function to normalize text for matching (same as in generate-audio route)
function sanitizeText(text: string): string {
  return text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')
}

// Helper function to check if filename matches content
function filenameMatchesContent(filename: string, content: string): boolean {
  const sanitizedContent = sanitizeText(content).toLowerCase()
  const filenameLower = filename.toLowerCase()
  
  // Remove timestamp prefix (numbers at start) and extension
  const filenameWithoutExt = filenameLower
    .replace(/^\d+-/, '') // Remove timestamp prefix
    .replace(/\.(mp3|timestamps\.json)$/, '') // Remove extension
  
  // Check if sanitized content appears in filename (exact match or substring)
  if (filenameWithoutExt.includes(sanitizedContent) || sanitizedContent.includes(filenameWithoutExt)) {
    return true
  }
  
  // Also check for key words from content (first 5 words, longer than 3 chars)
  const words = content.split(/\s+/).slice(0, 5).map(w => 
    w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  ).filter(w => w.length > 3)
  
  // Count how many words match
  let matchCount = 0
  for (const word of words) {
    if (filenameWithoutExt.includes(word)) {
      matchCount++
    }
  }
  
  // If 2 or more words match, consider it a match (more accurate)
  return matchCount >= 2
}

async function main() {
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
      }
    }
  }

  console.log(`✅ Mapped ${fileMap.size} audio/timestamp pairs\n`)

  // 1. Map Introduction
  console.log('📝 Mapping Introduction...')
  const introSection = await prisma.section.findFirst({
    where: { type: 'introduction' },
  })

  if (introSection) {
    const introText = introSection.text || "Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission."
    
    // Look for file matching "Hello" or intro keywords
    let matchedFile: { audio: string; timestamps: string } | null = null
    for (const [timestamp, files] of fileMap.entries()) {
      const audioFilename = files.audio.split('/').pop() || ''
      if (filenameMatchesContent(audioFilename, introText) || 
          audioFilename.toLowerCase().includes('hello') ||
          audioFilename.toLowerCase().includes('future_real')) {
        matchedFile = files
        break
      }
    }

    if (matchedFile && (!introSection.audioUrl || !introSection.timestampsUrl)) {
      await prisma.section.update({
        where: { id: introSection.id },
        data: {
          audioUrl: matchedFile.audio,
          timestampsUrl: matchedFile.timestamps,
        },
      })
      console.log(`  ✅ Updated Introduction: ${matchedFile.audio}`)
    } else if (introSection.audioUrl && introSection.timestampsUrl) {
      console.log(`  ℹ️  Introduction already has audio/timestamps`)
    } else {
      console.log(`  ⚠️  Could not find matching audio for Introduction`)
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
      if (section.audioUrl && section.timestampsUrl) {
        console.log(`  ℹ️  Section "${section.title}" already has audio/timestamps`)
        continue
      }

      let matchedFile: { audio: string; timestamps: string } | null = null
      
      // Try to match by content
      for (const [timestamp, files] of fileMap.entries()) {
        const audioFilename = files.audio.split('/').pop() || ''
        if (filenameMatchesContent(audioFilename, section.text) ||
            filenameMatchesContent(audioFilename, section.title)) {
          matchedFile = files
          break
        }
      }

      if (matchedFile) {
        await prisma.section.update({
          where: { id: section.id },
          data: {
            audioUrl: matchedFile.audio,
            timestampsUrl: matchedFile.timestamps,
          },
        })
        console.log(`  ✅ Updated Section "${section.title}": ${matchedFile.audio}`)
      } else {
        console.log(`  ⚠️  Could not find matching audio for Section "${section.title}"`)
      }
    }
  }

  // 3. Map Learning Objectives (combined audio)
  console.log('\n📝 Mapping Learning Objectives...')
  if (chapter1) {
    const objectives = await prisma.learningObjective.findMany({
      where: { chapterId: chapter1.id },
      orderBy: { order: 'asc' },
    })

    if (objectives.length > 0) {
      // Look for file matching first objective or "Describe_the_various"
      const firstObjective = objectives[0]
      let matchedFile: { audio: string; timestamps: string } | null = null
      
      for (const [timestamp, files] of fileMap.entries()) {
        const audioFilename = files.audio.split('/').pop() || ''
        if (filenameMatchesContent(audioFilename, firstObjective.text) ||
            audioFilename.toLowerCase().includes('describe_the_vari') ||
            audioFilename.toLowerCase().includes('1__describe')) {
          matchedFile = files
          break
        }
      }

      // Update first objective with combined audio (as per current implementation)
      if (matchedFile && (!objectives[0].audioUrl || !objectives[0].timestampsUrl)) {
        await prisma.learningObjective.update({
          where: { id: objectives[0].id },
          data: {
            audioUrl: matchedFile.audio,
            timestampsUrl: matchedFile.timestamps,
          },
        })
        console.log(`  ✅ Updated Learning Objectives: ${matchedFile.audio}`)
      } else if (objectives[0].audioUrl && objectives[0].timestampsUrl) {
        console.log(`  ℹ️  Learning Objectives already have audio/timestamps`)
      } else {
        console.log(`  ⚠️  Could not find matching audio for Learning Objectives`)
      }
    }
  }

  // 4. Map Key Terms (combined audio)
  console.log('\n📝 Mapping Key Terms...')
  if (chapter1) {
    const keyTerms = await prisma.keyTerm.findMany({
      where: { chapterId: chapter1.id },
      orderBy: { order: 'asc' },
    })

    if (keyTerms.length > 0) {
      // Look for file matching first key term or "absentee_owner"
      const firstKeyTerm = keyTerms[0]
      let matchedFile: { audio: string; timestamps: string } | null = null
      
      for (const [timestamp, files] of fileMap.entries()) {
        const audioFilename = files.audio.split('/').pop() || ''
        if (filenameMatchesContent(audioFilename, firstKeyTerm.term) ||
            audioFilename.toLowerCase().includes('absentee_owner') ||
            audioFilename.toLowerCase().includes('appr')) {
          matchedFile = files
          break
        }
      }

      // Update first key term with combined audio (as per current implementation)
      if (matchedFile && (!keyTerms[0].audioUrl || !keyTerms[0].timestampsUrl)) {
        await prisma.keyTerm.update({
          where: { id: keyTerms[0].id },
          data: {
            audioUrl: matchedFile.audio,
            timestampsUrl: matchedFile.timestamps,
          },
        })
        console.log(`  ✅ Updated Key Terms: ${matchedFile.audio}`)
      } else if (keyTerms[0].audioUrl && keyTerms[0].timestampsUrl) {
        console.log(`  ℹ️  Key Terms already have audio/timestamps`)
      } else {
        console.log(`  ⚠️  Could not find matching audio for Key Terms`)
      }
    }
  }

  // 5. Map Quiz Questions
  console.log('\n📝 Mapping Quiz Questions...')
  if (chapter1) {
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { chapterId: chapter1.id },
      orderBy: { order: 'asc' },
    })

    for (const question of quizQuestions) {
      // Match question audio
      if (!question.audioUrl || !question.timestampsUrl) {
        let matchedFile: { audio: string; timestamps: string } | null = null
        
        for (const [timestamp, files] of fileMap.entries()) {
          const audioFilename = files.audio.split('/').pop() || ''
          if (filenameMatchesContent(audioFilename, question.question)) {
            matchedFile = files
            break
          }
        }

        if (matchedFile) {
          await prisma.quizQuestion.update({
            where: { id: question.id },
            data: {
              audioUrl: matchedFile.audio,
              timestampsUrl: matchedFile.timestamps,
            },
          })
          console.log(`  ✅ Updated Question "${question.question.substring(0, 40)}...": ${matchedFile.audio}`)
        }
      }

      // Match correct explanation audio
      if (question.explanation && typeof question.explanation === 'object') {
        const explanation = question.explanation as { correct?: string; incorrect?: string[] }
        
        if (explanation.correct && !question.correctExplanationAudioUrl) {
          let matchedFile: { audio: string; timestamps: string } | null = null
          
          for (const [timestamp, files] of fileMap.entries()) {
            const audioFilename = files.audio.split('/').pop() || ''
            if (filenameMatchesContent(audioFilename, explanation.correct)) {
              matchedFile = files
              break
            }
          }

          if (matchedFile) {
            await prisma.quizQuestion.update({
              where: { id: question.id },
              data: {
                correctExplanationAudioUrl: matchedFile.audio,
                correctExplanationTimestampsUrl: matchedFile.timestamps,
              },
            })
            console.log(`    ✅ Updated Correct Explanation: ${matchedFile.audio}`)
          }
        }

        // Match incorrect explanation audio
        if (explanation.incorrect && Array.isArray(explanation.incorrect)) {
          const incorrectAudioUrls: string[] = []
          const incorrectTimestampsUrls: string[] = []

          for (let i = 0; i < explanation.incorrect.length; i++) {
            const incorrectText = explanation.incorrect[i]
            let matchedFile: { audio: string; timestamps: string } | null = null
            
            for (const [timestamp, files] of fileMap.entries()) {
              const audioFilename = files.audio.split('/').pop() || ''
              if (filenameMatchesContent(audioFilename, incorrectText)) {
                matchedFile = files
                break
              }
            }

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
            await prisma.quizQuestion.update({
              where: { id: question.id },
              data: {
                incorrectExplanationAudioUrls: incorrectAudioUrls,
                incorrectExplanationTimestampsUrls: incorrectTimestampsUrls,
              },
            })
            console.log(`    ✅ Updated ${incorrectAudioUrls.filter(url => url !== '').length} Incorrect Explanations`)
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
}

main()
  .catch((e) => {
    console.error('❌ Error mapping audio files:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

