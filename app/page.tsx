import AudioCutter from "@/components/audio-cutter"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 transition-colors">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold gradient-text display-large">Sonic Sculptor</h1>
        </div>
        <p className="text-center text-blue-600 dark:text-blue-400 mb-12 max-w-2xl mx-auto body-large font-medium">
          The next generation audio trimming experience with advanced features and stunning visuals
        </p>

        <AudioCutter />
      </div>
    </main>
  )
}
