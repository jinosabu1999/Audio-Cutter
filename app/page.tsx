import AudioCutter from "@/components/audio-cutter"
import { ThemeToggle } from "@/components/ui/theme-context"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
            Sonic Sculptor
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
          The next generation audio trimming experience with advanced features and stunning visuals
        </p>

        <AudioCutter />
      </div>
    </main>
  )
}
