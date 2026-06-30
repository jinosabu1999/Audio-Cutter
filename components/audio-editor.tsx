'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Upload, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Settings, Download, Music, Zap, Sparkles, TrendingUp, Wand2,
  Clock, Layers, Save, Sun, Moon
} from 'lucide-react'
import { formatTime } from '@/lib/time-utils'
import { ThemeToggle } from '@/components/ui/theme-context'

export default function AudioEditor() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Audio State
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)

  // Editing State
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [selectedTab, setSelectedTab] = useState<'home' | 'edit' | 'export'>('home')

  // Effects State
  const [equalizerBass, setEqualizerBass] = useState(0)
  const [equalizerMid, setEqualizerMid] = useState(0)
  const [equalizerTreble, setEqualizerTreble] = useState(0)
  const [volumeBoost, setVolumeBoost] = useState(0)
  const [reverbEnabled, setReverbEnabled] = useState(false)
  const [compressorEnabled, setCompressorEnabled] = useState(false)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)

  // UI State
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setEndTime(0)
    }
  }

  const handleAudioMetadata = () => {
    if (audioRef.current?.duration) {
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
      isPlaying ? audioRef.current.pause() : audioRef.current.play()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val
  }

  const handleSpeedChange = (speed: number) => {
    setSpeed(speed)
    if (audioRef.current) audioRef.current.playbackRate = speed
  }

  const handleExport = async () => {
    if (!audioFile) return
    setIsProcessing(true)
    // Simulated export
    setTimeout(() => {
      setIsProcessing(false)
    }, 2000)
  }

  return (
    <div style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} className="min-h-screen transition-colors duration-300">
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
      <header className="sticky top-0 z-50 backdrop-blur-sm" style={{ borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsla(var(--card), 0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br" style={{ backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r" style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SoundWave
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {selectedTab === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl sm:text-5xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                Professional Audio Editing
              </h2>
              <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Edit, enhance, and export your audio with Material 3 expressive design
              </p>
            </div>

            {/* Upload Section */}
            <div className="card space-y-6">
              <div
                className="border-4 border-dashed rounded-3xl p-8 sm:p-16 text-center cursor-pointer transition-all duration-300 hover:shadow-lg"
                style={{ borderColor: 'hsl(var(--primary))' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsla(var(--primary), 0.15)' }}>
                    <Upload className="w-10 h-10" style={{ color: 'hsl(var(--primary))' }} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Upload Audio</h3>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>Drag and drop or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {audioFile && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'hsla(var(--primary), 0.1)' }}>
                  <Music className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
                  <span className="font-semibold">{audioFile.name}</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Sparkles, label: 'AI Effects', desc: 'Smart audio enhancement' },
                { icon: TrendingUp, label: 'Equalizer', desc: 'Fine-tune frequencies' },
                { icon: Wand2, label: 'Effects', desc: 'Professional effects' },
                { icon: Download, label: 'Export', desc: 'Multiple formats' }
              ].map((f, i) => (
                <div key={i} className="card p-6 text-center space-y-3 hover:shadow-lg transition-all">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsla(var(--accent), 0.15)' }}>
                      <f.icon className="w-7 h-7" style={{ color: 'hsl(var(--accent))' }} />
                    </div>
                  </div>
                  <h3 className="font-bold">{f.label}</h3>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'edit' && audioFile && (
          <div className="space-y-6 animate-fadeIn">
            {/* Player Card */}
            <div className="card space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Music className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
                {audioFile.name}
              </h2>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div
                  className="w-full h-2 rounded-full cursor-pointer group"
                  style={{ backgroundColor: 'hsl(var(--muted))' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const percent = (e.clientX - rect.left) / rect.width
                    if (audioRef.current) audioRef.current.currentTime = percent * duration
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all group-hover:shadow-lg"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%`, backgroundColor: 'hsl(var(--primary))' }}
                  />
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 justify-center">
                <button onClick={handlePlayPause} className="btn-primary">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <select
                  value={speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="input-field py-2 w-24"
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                    <option key={s} value={s}>{s}x</option>
                  ))}
                </select>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1"
                />
                <span className="text-sm font-medium">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="card space-y-3">
                <label className="text-sm font-bold">Start Time</label>
                <input
                  type="number"
                  min="0"
                  max={endTime}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div className="card space-y-3">
                <label className="text-sm font-bold">End Time</label>
                <input
                  type="number"
                  min={startTime}
                  max={duration}
                  step="0.1"
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value) || duration)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Equalizer */}
            <div className="card space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                Equalizer
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Bass', value: equalizerBass, onChange: setEqualizerBass },
                  { label: 'Mid', value: equalizerMid, onChange: setEqualizerMid },
                  { label: 'Treble', value: equalizerTreble, onChange: setEqualizerTreble }
                ].map(band => (
                  <div key={band.label} className="space-y-2">
                    <label className="text-sm font-medium">{band.label}</label>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={band.value}
                      onChange={(e) => band.onChange(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {band.value > 0 ? '+' : ''}{band.value}dB
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fade Effects */}
            <div className="card space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                Fade Effects
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fade In: {fadeIn.toFixed(1)}s</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={fadeIn}
                    onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fade Out: {fadeOut.toFixed(1)}s</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={fadeOut}
                    onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Effects */}
            <div className="card space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                Advanced Effects
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Reverb', enabled: reverbEnabled, onChange: setReverbEnabled },
                  { label: 'Compressor', enabled: compressorEnabled, onChange: setCompressorEnabled }
                ].map(effect => (
                  <label key={effect.label} className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all" style={{ backgroundColor: 'hsla(var(--primary), 0.08)' }}>
                    <input
                      type="checkbox"
                      checked={effect.enabled}
                      onChange={(e) => effect.onChange(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="font-medium">{effect.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'export' && audioFile && (
          <div className="space-y-6 animate-fadeIn">
            <div className="card space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Download className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
                Export Audio
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Format</label>
                  <select className="input-field">
                    <option>WAV - Lossless</option>
                    <option>MP3 - Compressed</option>
                    <option>OGG - Open Format</option>
                    <option>M4A - Apple</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Quality</label>
                  <select className="input-field">
                    <option>320kbps - High</option>
                    <option>192kbps - Medium</option>
                    <option>128kbps - Low</option>
                  </select>
                </div>
              </div>

              <button onClick={handleExport} disabled={isProcessing} className="btn-primary w-full py-4 text-lg">
                {isProcessing ? 'Processing...' : 'Export Audio'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Tabs */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 px-4 py-3 rounded-full backdrop-blur-xl" style={{ backgroundColor: 'hsla(var(--card), 0.95)', border: '1px solid hsl(var(--border))' }}>
          {[
            { id: 'home', label: 'Home', icon: Music },
            { id: 'edit', label: 'Edit', icon: Settings, disabled: !audioFile },
            { id: 'export', label: 'Export', icon: Download, disabled: !audioFile }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              disabled={tab.disabled}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300"
              style={{
                backgroundColor: selectedTab === tab.id ? 'hsl(var(--primary))' : 'transparent',
                color: selectedTab === tab.id ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                opacity: tab.disabled ? 0.5 : 1
              }}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
