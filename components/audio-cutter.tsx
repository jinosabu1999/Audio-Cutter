"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Upload, Play, Pause, Download, Home, Sliders, Settings, Sun, Moon,
  HelpCircle, Volume2, VolumeX, BookmarkPlus, Trash2, BarChart3, Copy,
  Zap, Wand2, Loader, Check, AlertCircle, Music
} from "lucide-react"
import { formatTime } from "@/lib/time-utils"
import { useTheme } from "@/components/ui/theme-context"
import { useToast } from "@/components/ui/toast-provider"

interface AudioBookmark {
  id: string
  time: number
  label: string
}

export default function AudioCutter() {
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<"home" | "editor" | "export">("home")
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={handleAudioMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Modus Audio</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-icon">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="btn-icon">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "home" && (
          <div className="animate-fadeIn space-y-12">
            {/* Hero */}
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Professional Audio Editing
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Cut, edit, and enhance your audio with precision. Powerful tools, intuitive interface.
              </p>
            </div>

            {/* Upload Area */}
            <div className="card">
              <label className="flex flex-col items-center justify-center gap-4 p-12 cursor-pointer hover:bg-slate-800/50 rounded-lg transition-colors">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold mb-1">Upload audio file</p>
                  <p className="text-slate-400 text-sm">Drag and drop or click to select</p>
                </div>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {file && <p className="text-center text-blue-400 mt-4">{file.name}</p>}
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "Fast Processing", desc: "Real-time audio editing" },
                { icon: Wand2, title: "Smart Tools", desc: "AI-powered suggestions" },
                { icon: BarChart3, title: "Visualization", desc: "Live frequency analysis" }
              ].map((f, i) => (
                <div key={i} className="card flex flex-col items-center text-center">
                  <f.icon className="w-8 h-8 text-blue-400 mb-3" />
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "editor" && file && (
          <div className="animate-fadeIn space-y-8">
            {/* Waveform Canvas */}
            <div className="card">
              <canvas
                ref={canvasRef}
                className="w-full h-32 bg-slate-800/50 rounded-lg"
              />
            </div>

            {/* Time Display */}
            <div className="card flex items-center justify-center gap-8 text-center">
              <div>
                <p className="text-slate-400 text-sm mb-1">Current</p>
                <p className="text-2xl font-mono font-bold">{formatTime(currentTime)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Duration</p>
                <p className="text-2xl font-mono font-bold">{formatTime(duration)}</p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="card flex justify-center gap-4">
              <button onClick={handlePlayPause} className="btn-primary">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button onClick={addBookmark} className="btn-secondary">
                <BookmarkPlus className="w-5 h-5" />
                Bookmark
              </button>
            </div>

            {/* Time Selection */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <input
                  type="number"
                  min="0"
                  max={endTime}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input-field"
                />
              </div>
              <div className="card">
                <label className="block text-sm font-medium mb-2">End Time</label>
                <input
                  type="number"
                  min={startTime}
                  max={duration}
                  step="0.1"
                  value={endTime}
                  onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                  className="input-field"
                />
              </div>
            </div>

            {/* Bookmarks */}
            {bookmarks.length > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-4">Bookmarks</h3>
                <div className="space-y-2">
                  {bookmarks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span>{b.label}</span>
                      <button
                        onClick={() => setBookmarks(bookmarks.filter((x) => x.id !== b.id))}
                        className="btn-icon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && file && (
          <div className="animate-fadeIn space-y-8">
            <div className="card">
              <h3 className="text-xl font-semibold mb-6">Export Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <button onClick={handleCutAudio} disabled={isProcessing} className="btn-primary w-full">
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Cut & Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-around h-16">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "editor", label: "Editor", icon: Sliders, disabled: !file },
            { id: "export", label: "Export", icon: Download, disabled: !file }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              className={`flex flex-col items-center gap-1 p-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "text-blue-400"
                  : tab.disabled
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon className="w-6 h-6" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Padding for fixed nav */}
      <div className="h-20" />
    </div>
  )
}
