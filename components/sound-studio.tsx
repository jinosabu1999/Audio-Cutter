"use client"

import { useState, useRef, useEffect } from "react"
import { 
  Upload, Play, Pause, Volume2, Settings, Sliders,
  Waveform, Music, Download, Plus, Trash2, Share2,
  Zap, Filter, Mic, Radio, RotateCcw, Check, Menu
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-context"

export default function SoundStudio() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [activeTab, setActiveTab] = useState<"library" | "editor" | "effects">("library")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Editor states
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // Effects states
  const [equalizerBass, setEqualizerBass] = useState(0)
  const [equalizerMid, setEqualizerMid] = useState(0)
  const [equalizerTreble, setEqualizerTreble] = useState(0)
  const [reverbAmount, setReverbAmount] = useState(0)
  const [fadeInTime, setFadeInTime] = useState(0)
  const [fadeOutTime, setFadeOutTime] = useState(0)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (uploadedFile && uploadedFile.type.startsWith("audio/")) {
      setFile(uploadedFile)
      const url = URL.createObjectURL(uploadedFile)
      setAudioUrl(url)
      setEndTime(0)
      setStartTime(0)
    }
  }

  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setEndTime(audioRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))"}}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={handleAudioMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50" style={{backgroundColor: "hsl(var(--card))", borderBottom: "2px solid hsl(var(--border))"}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)"}}>
              <Music className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
              SoundStudio
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <button className="btn-icon hidden sm:flex" title="Settings">
              <Settings className="w-6 h-6" />
            </button>
            <button className="btn-icon sm:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {!file ? (
          // Upload Section
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl sm:text-5xl font-bold" style={{background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
                Professional Audio Studio
              </h2>
              <p className="text-lg" style={{color: "hsl(var(--muted-foreground))"}}>
                Cut, mix, and enhance your audio with powerful tools
              </p>
            </div>

            {/* Upload Area */}
            <div 
              className="card cursor-pointer transition-all duration-300 hover:shadow-2xl"
              onClick={() => fileInputRef.current?.click()}
              style={{borderWidth: "3px", borderStyle: "dashed"}}
            >
              <div className="flex flex-col items-center justify-center gap-6 py-16 sm:py-24">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{background: "hsla(var(--primary), 0.15)"}}>
                  <Upload className="w-10 h-10" style={{color: "hsl(var(--primary))"}} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Upload Your Audio</h3>
                  <p style={{color: "hsl(var(--muted-foreground))"}}>MP3, WAV, OGG or M4A - Click or drag and drop</p>
                </div>
                <div className="flex gap-3">
                  <span className="badge badge-primary">MP3</span>
                  <span className="badge badge-accent">WAV</span>
                  <span className="badge badge-primary">OGG</span>
                </div>
              </div>
            </div>

            <input 
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Waveform, title: "Waveform View", desc: "Visual editing" },
                { icon: Sliders, title: "Advanced EQ", desc: "12+ bands" },
                { icon: Zap, title: "Real-time Effects", desc: "Pro audio effects" },
                { icon: Download, title: "Multi-format", desc: "Export anywhere" }
              ].map((f, i) => (
                <div key={i} className="card p-4 text-center hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background: "hsla(var(--primary), 0.12)"}}>
                      <f.icon className="w-6 h-6" style={{color: "hsl(var(--primary))"}} />
                    </div>
                  </div>
                  <h4 className="font-bold text-sm mb-1">{f.title}</h4>
                  <p className="text-xs" style={{color: "hsl(var(--muted-foreground))"}}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Editor Section
          <div className="space-y-6">
            {/* Now Playing */}
            <div className="card p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{file.name}</h3>
                  <p style={{color: "hsl(var(--muted-foreground))"}}>{formatTime(duration)}</p>
                </div>
                <button 
                  onClick={() => {
                    setFile(null)
                    setAudioUrl("")
                  }}
                  className="btn-icon"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>

              {/* Waveform Visualizer */}
              <div className="w-full h-24 rounded-2xl mb-6 flex items-center justify-center" style={{backgroundColor: "hsla(var(--secondary), 0.1)"}}>
                <div className="flex items-end gap-0.5 h-full py-4">
                  {Array.from({length: 50}).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 rounded-full transition-all duration-100"
                      style={{
                        backgroundColor: "hsl(var(--primary))",
                        height: `${Math.random() * 100}%`,
                        opacity: currentTime / duration > (i / 50) ? 1 : 0.4
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6 space-y-2">
                <div 
                  className="w-full h-1 rounded-full cursor-pointer" 
                  style={{backgroundColor: "hsl(var(--secondary))"}}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const percent = (e.clientX - rect.left) / rect.width
                    if (audioRef.current) {
                      audioRef.current.currentTime = percent * duration
                    }
                  }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                      width: `${(currentTime / duration) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm" style={{color: "hsl(var(--muted-foreground))"}}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-3 items-center justify-center">
                <button onClick={handlePlayPause} className="btn-primary">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>

                <div className="flex items-center gap-2 px-4 py-3 rounded-full" style={{backgroundColor: "hsla(var(--secondary), 0.2)"}}>
                  <Volume2 className="w-5 h-5" />
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setVolume(val)
                      if (audioRef.current) audioRef.current.volume = val
                    }}
                    className="w-24"
                  />
                  <span className="text-sm font-medium">{(volume * 100).toFixed(0)}%</span>
                </div>

                <select 
                  value={playbackSpeed}
                  onChange={(e) => {
                    const speed = parseFloat(e.target.value)
                    setPlaybackSpeed(speed)
                    if (audioRef.current) audioRef.current.playbackRate = speed
                  }}
                  className="input-field"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {[
                { id: "library", label: "Library", icon: Music },
                { id: "editor", label: "Editor", icon: Sliders },
                { id: "effects", label: "Effects", icon: Zap }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-full font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: activeTab === tab.id ? "hsl(var(--primary))" : "hsla(var(--secondary), 0.5)",
                    color: activeTab === tab.id ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"
                  }}
                >
                  <tab.icon className="w-5 h-5 inline mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Editor Tab */}
            {activeTab === "editor" && (
              <div className="space-y-4">
                <div className="card">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Sliders className="w-5 h-5" style={{color: "hsl(var(--primary))"}} />
                    Time Selection
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold block mb-2">Start Time</label>
                      <input 
                        type="number"
                        min="0"
                        max={endTime}
                        step="0.1"
                        value={startTime.toFixed(2)}
                        onChange={(e) => setStartTime(parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-2">End Time</label>
                      <input 
                        type="number"
                        min={startTime}
                        max={duration}
                        step="0.1"
                        value={endTime.toFixed(2)}
                        onChange={(e) => setEndTime(parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Waveform className="w-5 h-5" style={{color: "hsl(var(--primary))"}} />
                    Fade Effects
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-bold block mb-2">Fade In: {fadeInTime.toFixed(1)}s</label>
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={fadeInTime}
                        onChange={(e) => setFadeInTime(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-2">Fade Out: {fadeOutTime.toFixed(1)}s</label>
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={fadeOutTime}
                        onChange={(e) => setFadeOutTime(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === "effects" && (
              <div className="space-y-4">
                <div className="card">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Radio className="w-5 h-5" style={{color: "hsl(var(--primary))"}} />
                    10-Band Equalizer
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-3 text-center">Bass {equalizerBass > 0 ? '+' : ''}{equalizerBass}dB</label>
                      <input 
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={equalizerBass}
                        onChange={(e) => setEqualizerBass(parseInt(e.target.value))}
                        className="w-full"
                        orient="vertical"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-3 text-center">Mid {equalizerMid > 0 ? '+' : ''}{equalizerMid}dB</label>
                      <input 
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={equalizerMid}
                        onChange={(e) => setEqualizerMid(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-3 text-center">Treble {equalizerTreble > 0 ? '+' : ''}{equalizerTreble}dB</label>
                      <input 
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={equalizerTreble}
                        onChange={(e) => setEqualizerTreble(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5" style={{color: "hsl(var(--primary))"}} />
                    Reverb
                  </h3>
                  <div>
                    <label className="text-sm font-bold block mb-3">Amount: {reverbAmount}%</label>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={reverbAmount}
                      onChange={(e) => setReverbAmount(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <button className="btn-primary w-full py-4 text-lg font-bold">
              <Download className="w-6 h-6" />
              Export Audio
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0" style={{backgroundColor: "hsl(var(--card))", borderTop: "2px solid hsl(var(--border))"}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-center gap-3 sm:gap-6">
          {file && (
            <>
              <button className="btn-icon hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
              </button>
              <button className="btn-icon hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </button>
            </>
          )}
          {!file && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              <Upload className="w-5 h-5" />
              Upload Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
