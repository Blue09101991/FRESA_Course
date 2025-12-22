# Florida Real Estate Sales Associate Course - Chapter 1

A modern, interactive Progressive Web App (PWA) for the Florida Real Estate Sales Associate pre-license education course. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎓 **Interactive Learning**: Audio-synchronized text highlighting for enhanced learning
- 🎮 **Engaging Quizzes**: Interactive quiz system with immediate feedback
- 🎨 **Modern Design**: Beautiful dark blue theme matching Figma design
- 📱 **Responsive**: Works perfectly on mobile and desktop
- 🎭 **Character Animations**: Mr Listings character with various animations
- 💾 **Progress Tracking**: Save your progress with email registration
- 🔊 **Audio Integration**: Synchronized audio playback with text highlighting

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create audio files directory:
```bash
mkdir -p public/audio
```

3. Add audio files to `public/audio/`:
   - `intro.mp3` - Introduction audio
   - `eligibility.mp3` - Eligibility section audio
   - `chapter1-section1.mp3` through `chapter1-section11.mp3` - Chapter 1 section audios

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── eligibility/       # Eligibility quiz page
│   ├── chapter-1/         # Chapter 1 content page
│   └── congratulations/   # Completion page
├── components/            # React components
│   ├── MrListings.tsx    # Character component
│   ├── AudioPlayer.tsx   # Audio player with sync
│   ├── Quiz.tsx          # Quiz component
│   └── RegistrationModal.tsx
├── lib/                   # Data and utilities
│   ├── quizData.ts       # Eligibility quiz questions
│   └── chapter1Data.ts   # Chapter 1 quiz questions
├── public/               # Static assets
│   └── audio/           # Audio files
└── styles/              # Global styles
    └── globals.css
```

## Features in Detail

### Audio Synchronization
The audio player synchronizes text highlighting with audio playback, making it easy to follow along. The system works even when rewinding or seeking through the audio.

### Quiz System
- Multiple choice questions
- Immediate feedback on answers
- Character animations (thumbs up/down)
- Detailed explanations for each answer
- Progress tracking

### Character Animations
Mr Listings character appears throughout the course with various animations:
- Idle animation
- Thumbs up (correct answer)
- Thumbs down (incorrect answer)
- Congratulations (quiz completion)
- Lecturing mode (small character in corner)

## Customization

### Colors
Edit `tailwind.config.ts` to customize the color scheme:
- Primary dark: `#0a1a2e`
- Primary: `#1e3a5f`
- Primary light: `#2d4a6f`
- Accent: `#3b82f6`

### Adding More Chapters
1. Create a new page in `app/chapter-X/`
2. Add quiz data to `lib/chapterXData.ts`
3. Update navigation/routing as needed

## Building for Production

```bash
npm run build
npm start
```

## Technologies Used

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React 19** - UI library

## Notes

- Audio files need to be added to `public/audio/` directory
- Progress is saved to localStorage (consider adding backend for production)
- The app is designed as a PWA but manifest.json needs to be added for full PWA support

## License

ISC

