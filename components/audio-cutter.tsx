"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Upload, Play, Pause, Download, Home, Sliders,
  HelpCircle, Volume2, Loader, Music, Scissors
} from "lucide-react"
import { formatTime } from "@/lib/time-utils"
import { ThemeToggle } from "@/components/ui/theme-context"
import { useToast } from "@/components/ui/toast-provider"

export default function AudioCutter() {
  const { addToast } = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<"home" | "editor" | "export">("home")
  const [isProcessing, setIsProcessing] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // Auto-set end time when audio loads
  useEffect(() => {
    if (audioRef.current && duration > 0 && endTime === 0) {
      setEndTime(duration)
    }
  }, [duration])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    if (!uploadedFile.type.startsWith("audio/")) {
      addToast("Please select a valid audio file", "error")
      return
    }

    setFile(uploadedFile)
    const url = URL.createObjectURL(uploadedFile)
    setAudioUrl(url)
    setActiveTab("editor")
    addToast("Audio file loaded successfully", "success")
  }

  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setEndTime(audioRef.current.duration)
    }
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      if (currentTime >= endTime) {
        audioRef.current.currentTime = startTime
      }
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (audioRef.current.currentTime >= endTime) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const drawWaveform = async () => {
    if (!audioRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const bars = 100
    const barData: number[] = []

    for (let i = 0; i < bars; i++) {
      barData.push(Math.random() * 100)
    }
    setWaveformData(barData)
  }

  const handleCutAudio = async () => {
    if (!audioUrl) return
    setIsProcessing(true)
    try {
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(startTime * sampleRate)
      const endSample = Math.floor(endTime * sampleRate)
      const duration = endSample - startSample

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        duration,
        sampleRate
      )

      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(offlineContext.destination)
      source.start(0, startTime, endTime - startTime)

      const renderedBuffer = await offlineContext.startRendering()
      const wav = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wav], { type: "audio/wav" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cut-audio-${Date.now()}.wav`
      a.click()

      addToast("Audio cut and downloaded successfully", "success")
    } catch (error) {
      addToast("Error processing audio", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  const audioBufferToWav = (audioBuffer: AudioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numberOfChannels * bytesPerSample

    let offset = 0
    let pos = 0

    const setUint16 = (data: DataView, byteOffset: number, value: number) => {
      data.setUint16(byteOffset, value, true)
    }

    const setUint32 = (data: DataView, byteOffset: number, value: number) => {
      data.setUint32(byteOffset, value, true)
    }

    const interleave = (channelData: Float32Array[], length: number) => {
      let result = new Float32Array(length * numberOfChannels)
      let index = 0
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          result[index++] = channelData[channel][i]
        }
      }
      return result
    }

    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      }
    }

    const channels: Float32Array[] = []
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    const length = audioBuffer.length * numberOfChannels * 2 + 44
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)

    setUint32(view, pos, 0x46464952); pos += 4
    setUint32(view, pos, length - 8); pos += 4
    setUint32(view, pos, 0x45564157); pos += 4
    setUint32(view, pos, 0x20746d66); pos += 4
    setUint32(view, pos, 16); pos += 4
    setUint16(view, pos, format); pos += 2
    setUint16(view, pos, numberOfChannels); pos += 2
    setUint32(view, pos, sampleRate); pos += 4
    setUint32(view, pos, sampleRate * blockAlign); pos += 4
    setUint16(view, pos, blockAlign); pos += 2
    setUint16(view, pos, bitDepth); pos += 2

    setUint32(view, pos, 0x61746164); pos += 4
    setUint32(view, pos, length - pos - 4); pos += 4

    const interleaved = interleave(channels, audioBuffer.length)
    floatTo16BitPCM(view, pos, interleaved)

    return arrayBuffer
  }

  const addBookmark = () => {
    if (!file) return
    const bookmark: AudioBookmark = {
      id: Math.random().toString(),
      time: currentTime,
      label: `Bookmark at ${formatTime(currentTime)}`
    }
    setBookmarks([...bookmarks, bookmark])
    addToast("Bookmark added", "success")
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors duration-300">
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
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Music className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Modus Audio
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button className="btn-icon" title="Help">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {activeTab === "home" && (
          <div className="animate-fadeIn space-y-8 sm:space-y-12">
            {/* Hero */}
            <div className="text-center space-y-4 sm:space-y-6">
              <h2 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Professional Audio Editing
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] text-base sm:text-lg max-w-2xl mx-auto">
                Cut, trim, and enhance your audio with precision. Fast, simple, and powerful.
              </p>
            </div>

            {/* Upload Area */}
            <div className="card space-y-4">
              <label className="flex flex-col items-center justify-center gap-4 p-8 sm:p-12 cursor-pointer hover:bg-[hsl(var(--secondary))]/50 rounded-lg transition-all duration-200 border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary))]/15 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[hsl(var(--primary))]" />
                </div>
                <div className="text-center">
                  <p className="font-semibold mb-1">Upload audio file</p>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm">Drag and drop or click to select</p>
                </div>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {file && <p className="text-center text-[hsl(var(--primary))] font-medium">{file.name}</p>}
            </div>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { icon: Upload, title: "Easy Upload", desc: "Drag & drop support" },
                { icon: Scissors, title: "Precise Cutting", desc: "Frame-accurate trimming" },
                { icon: Volume2, title: "Volume Control", desc: "Adjust levels easily" }
              ].map((f, i) => (
                <div key={i} className="card flex flex-col items-center text-center space-y-3 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-[hsl(var(--primary))]/15 flex items-center justify-center">
                    <f.icon className="w-6 h-6 text-[hsl(var(--primary))]" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "editor" && file && (
          <div className="animate-fadeIn space-y-6">
            {/* Progress Bar */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate">{file.name}</h3>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{formatTime(duration)}</span>
              </div>
              <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-2 cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, Math.min(duration, percent * duration))
              }}>
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-100" 
                  style={{width: `${(currentTime / duration) * 100 || 0}%`}} 
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="card space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button onClick={handlePlayPause} className="btn-primary flex-1 sm:flex-none">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>
                
                <div className="flex items-center gap-2 flex-1">
                  <Volume2 className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
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
                    className="w-full"
                  />
                  <span className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] min-w-[2.5rem]">{(volume * 100).toFixed(0)}%</span>
                </div>

                <select
                  value={playbackSpeed}
                  onChange={(e) => {
                    const speed = parseFloat(e.target.value)
                    setPlaybackSpeed(speed)
                    if (audioRef.current) audioRef.current.playbackRate = speed
                  }}
                  className="input-field py-2 text-sm"
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

            {/* Time Selection */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card space-y-2">
                <label className="text-sm font-semibold block">Start Time</label>
                <input
                  type="number"
                  min="0"
                  max={endTime}
                  step="0.1"
                  value={startTime.toFixed(2)}
                  onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input-field"
                />
              </div>
              <div className="card space-y-2">
                <label className="text-sm font-semibold block">End Time</label>
                <input
                  type="number"
                  min={startTime}
                  max={duration}
                  step="0.1"
                  value={endTime.toFixed(2)}
                  onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "export" && file && (
          <div className="animate-fadeIn space-y-6">
            <div className="card space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold block">Selection: {formatTime(startTime)} - {formatTime(endTime)}</label>
                <div className="w-full h-2 bg-[hsl(var(--secondary))] rounded-full cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = (e.clientX - rect.left) / rect.width
                  const newStart = percent * duration
                  if (newStart < endTime) setStartTime(newStart)
                }}>
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    style={{width: `${((endTime - startTime) / duration) * 100}%`, marginLeft: `${(startTime / duration) * 100}%`}}
                  />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card space-y-2">
                <label className="text-sm font-semibold block">Start Time</label>
                <input
                  type="number"
                  min="0"
                  max={endTime}
                  step="0.1"
                  value={startTime.toFixed(2)}
                  onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input-field"
                />
              </div>
              <div className="card space-y-2">
                <label className="text-sm font-semibold block">End Time</label>
                <input
                  type="number"
                  min={startTime}
                  max={duration}
                  step="0.1"
                  value={endTime.toFixed(2)}
                  onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                  className="input-field"
                />
              </div>
            </div>

            <button 
              onClick={handleCutAudio} 
              disabled={isProcessing} 
              className="btn-primary w-full py-3 sm:py-4 text-base sm:text-lg font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export Audio
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation - iOS 27 Style */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 w-full sm:w-auto">
        <nav className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 bg-[hsl(var(--card))]/90 backdrop-blur-xl border border-[hsl(var(--border))] rounded-full shadow-2xl">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "editor", label: "Editor", icon: Sliders, disabled: !file },
            { id: "export", label: "Export", icon: Download, disabled: !file }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-[hsl(var(--primary))]"
                  : tab.disabled
                  ? "text-[hsl(var(--muted-foreground))] cursor-not-allowed opacity-50"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
