"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Play,
  Pause,
  Scissors,
  RotateCcw,
  VolumeX,
  Volume2,
  X,
  Folder,
  Trash2,
  Download,
  BookmarkIcon,
  BookmarkPlus,
  Waves,
  Sliders,
  Zap,
  SkipBack,
  SkipForward,
  Repeat,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Home,
  Music2,
  Sparkles,
  Timer,
  Radio,
  Flame,
  Orbit,
  Filter,
  Gauge,
  AudioLines,
} from "lucide-react"
import { formatTime } from "@/lib/time-utils"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/ui/theme-context"
import { useToast } from "@/components/ui/toast-provider"

interface AudioBookmark {
  id: string
  time: number
  label: string
  color: string
}

interface SavedProject {
  id: string
  name: string
  date: string
  duration: number
  startTime: number
  endTime: number
  audioUrl: string
}

interface EffectSettings {
  eqLow: number
  eqMid: number
  eqHigh: number
  compressorThreshold: number
  compressorRatio: number
  reverbMix: number
  reverbDecay: number
  delayTime: number
  delayFeedback: number
  delayMix: number
  highpassFreq: number
  lowpassFreq: number
  distortionAmount: number
  chorusMix: number
  flangerMix: number
  gain: number
  stereoWidth: number
}

const defaultEffects: EffectSettings = {
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compressorThreshold: -24,
  compressorRatio: 4,
  reverbMix: 0,
  reverbDecay: 2,
  delayTime: 0.3,
  delayFeedback: 0.3,
  delayMix: 0,
  highpassFreq: 20,
  lowpassFreq: 20000,
  distortionAmount: 0,
  chorusMix: 0,
  flangerMix: 0,
  gain: 0,
  stereoWidth: 100,
}

const bookmarkColors = ["#8b5cf6", "#ec4899", "#22c55e", "#3b82f6", "#f97316", "#eab308"]

type TabType = "home" | "editor" | "effects" | "export" | "projects"

export default function AudioCutter() {
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isLooping, setIsLooping] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [projectName, setProjectName] = useState<string>("")
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([])
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [effects, setEffects] = useState<EffectSettings>(defaultEffects)
  const [exportFormat, setExportFormat] = useState<string>("wav")
  const [exportQuality, setExportQuality] = useState<string>("high")
  const [fadeIn, setFadeIn] = useState<number>(0)
  const [fadeOut, setFadeOut] = useState<number>(0)
  const [normalize, setNormalize] = useState<boolean>(false)
  const [trimSilence, setTrimSilence] = useState<boolean>(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const currentTimeRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const endTimeRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = startTime
    endTimeRef.current = endTime
  }, [startTime, endTime])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      const time = audio.currentTime
      currentTimeRef.current = time
      setCurrentTime(time)

      if (isLooping && time >= endTimeRef.current) {
        audio.currentTime = startTimeRef.current
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      if (!isLooping) {
        audio.currentTime = 0
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [isLooping])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft":
          e.preventDefault()
          seekTo(Math.max(0, currentTimeRef.current - 5))
          break
        case "ArrowRight":
          e.preventDefault()
          seekTo(Math.min(duration, currentTimeRef.current + 5))
          break
        case "KeyM":
          setIsMuted(!isMuted)
          break
        case "KeyL":
          setIsLooping(!isLooping)
          break
        case "KeyS":
          if (file) setStartTime(currentTimeRef.current)
          break
        case "KeyE":
          if (file) setEndTime(currentTimeRef.current)
          break
        case "KeyB":
          if (file) addBookmark()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [duration, isMuted, isLooping, file])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) await processFile(selectedFile)
  }

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true)
    try {
      const url = URL.createObjectURL(selectedFile)
      setFile(selectedFile)
      setAudioUrl(url)
      setProjectName(selectedFile.name.replace(/\.[^/.]+$/, ""))

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const arrayBuffer = await selectedFile.arrayBuffer()
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setEndTime(buffer.duration)
      endTimeRef.current = buffer.duration

      generateWaveformData(buffer)

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      setActiveTab("editor")
      addToast("Audio loaded successfully", "success")
    } catch (error) {
      addToast("Failed to load audio file", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  const generateWaveformData = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0)
    const samples = 150
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData: number[] = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j])
      }
      filteredData.push(sum / blockSize)
    }

    const maxVal = Math.max(...filteredData)
    const normalizedData = filteredData.map((val) => val / maxVal)
    setWaveformData(normalizedData)
  }

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seekTo = (time: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = time
      currentTimeRef.current = time
      setCurrentTime(time)
    }
  }

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    seekTo(time)
  }

  const addBookmark = () => {
    const newBookmark: AudioBookmark = {
      id: Date.now().toString(),
      time: currentTimeRef.current,
      label: `Marker ${bookmarks.length + 1}`,
      color: bookmarkColors[bookmarks.length % bookmarkColors.length],
    }
    setBookmarks([...bookmarks, newBookmark])
    addToast("Bookmark added", "success")
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type.startsWith("audio/") || droppedFile?.type.startsWith("video/")) {
      await processFile(droppedFile)
    } else {
      addToast("Please drop an audio file", "error")
    }
  }

  const exportAudio = async () => {
    if (!audioBuffer) return
    setIsProcessing(true)

    try {
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(startTime * sampleRate)
      const endSample = Math.floor(endTime * sampleRate)
      const length = endSample - startSample

      const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, length, sampleRate)
      const source = offlineContext.createBufferSource()

      const newBuffer = offlineContext.createBuffer(audioBuffer.numberOfChannels, length, sampleRate)
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          newData[i] = oldData[startSample + i]
        }
      }

      source.buffer = newBuffer
      source.connect(offlineContext.destination)
      source.start()

      const renderedBuffer = await offlineContext.startRendering()
      const wavBlob = audioBufferToWav(renderedBuffer)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName || "audio"}_cut.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)

      addToast("Export complete!", "success")
    } catch (error) {
      addToast("Export failed", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1
    const bitDepth = 16
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample
    const dataLength = buffer.length * blockAlign
    const bufferLength = 44 + dataLength
    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + dataLength, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, "data")
    view.setUint32(40, dataLength, true)

    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  const saveProject = () => {
    if (!file || !audioUrl) {
      addToast("No audio file to save", "warning")
      return
    }

    const project: SavedProject = {
      id: Date.now().toString(),
      name: projectName || file.name.replace(/\.[^/.]+$/, ""),
      date: new Date().toISOString().split("T")[0],
      duration,
      startTime: startTimeRef.current,
      endTime: endTimeRef.current,
      audioUrl,
    }

    setSavedProjects([project, ...savedProjects])
    addToast("Project saved", "success")
  }

  const loadProject = async (project: SavedProject) => {
    setAudioUrl(project.audioUrl)
    setDuration(project.duration)
    setStartTime(project.startTime)
    setEndTime(project.endTime)
    startTimeRef.current = project.startTime
    endTimeRef.current = project.endTime
    setProjectName(project.name)

    try {
      const response = await fetch(project.audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      generateWaveformData(buffer)
      addToast("Project loaded", "success")
    } catch {
      addToast("Error loading project", "error")
    }

    setActiveTab("editor")
  }

  const deleteProject = (id: string) => {
    setSavedProjects(savedProjects.filter((p) => p.id !== id))
    addToast("Project deleted", "info")
  }

  const resetFile = () => {
    setFile(null)
    setAudioUrl(null)
    setAudioBuffer(null)
    setDuration(0)
    setCurrentTime(0)
    setStartTime(0)
    setEndTime(0)
    setWaveformData([])
    setBookmarks([])
    setProjectName("")
    setIsPlaying(false)
    setEffects(defaultEffects)
    setActiveTab("home")
  }

  const navItems = [
    { id: "home" as TabType, icon: Home, label: "Home" },
    { id: "editor" as TabType, icon: Scissors, label: "Editor", disabled: !file },
    { id: "effects" as TabType, icon: Sliders, label: "Effects", disabled: !file },
    { id: "export" as TabType, icon: Download, label: "Export", disabled: !file },
    { id: "projects" as TabType, icon: Folder, label: "Projects" },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" muted={isMuted} />}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <AudioLines className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient">Modus Audio</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {file && (
              <span className="badge badge-primary text-xs hidden sm:inline-flex">
                {file.name.length > 15 ? file.name.slice(0, 15) + "..." : file.name}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="btn-icon">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-4 overflow-auto">
        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Upload Area */}
            <div
              className={cn(
                "card-elevated p-8 text-center transition-all duration-300 relative overflow-hidden",
                isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-float">
                  <Music2 className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold mb-2">
                  <span className="text-gradient">Drop Your Audio</span>
                </h2>
                <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto">
                  Drag & drop any audio file or click to browse. Supports MP3, WAV, OGG, FLAC, M4A and more.
                </p>

                <Button
                  className="btn-primary"
                  onClick={() => document.getElementById("audio-upload")?.click()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </>
                  )}
                </Button>

                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Features Grid - Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Scissors, label: "Precision Cut", color: "from-violet-500 to-purple-500" },
                { icon: Sliders, label: "Pro Effects", color: "from-pink-500 to-rose-500" },
                { icon: Waves, label: "Waveform View", color: "from-blue-500 to-cyan-500" },
                { icon: Download, label: "Multi-Format", color: "from-emerald-500 to-teal-500" },
              ].map((item, i) => (
                <div key={i} className="card p-4 text-center group hover:border-primary/30 transition-colors">
                  <div
                    className={cn(
                      "w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-110",
                      item.color,
                    )}
                  >
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Info */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Quick Start</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <kbd className="px-1.5 py-0.5 bg-card rounded text-[10px] font-mono">Space</kbd>
                  <span>Play/Pause</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <kbd className="px-1.5 py-0.5 bg-card rounded text-[10px] font-mono">S / E</kbd>
                  <span>Set Start/End</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <kbd className="px-1.5 py-0.5 bg-card rounded text-[10px] font-mono">B</kbd>
                  <span>Add Bookmark</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR TAB */}
        {activeTab === "editor" && file && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Project Header */}
            <div className="flex items-center justify-between gap-3">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="input-field text-sm font-medium max-w-[200px]"
                placeholder="Project name"
              />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={saveProject} className="btn-ghost text-xs">
                  <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFile} className="btn-ghost text-xs text-destructive">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Close
                </Button>
              </div>
            </div>

            {/* Waveform */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Waveform</span>
                  <span className="badge badge-primary text-[10px]">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                    disabled={zoomLevel <= 1}
                    className="btn-icon p-1.5"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs w-8 text-center">{zoomLevel}x</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
                    disabled={zoomLevel >= 4}
                    className="btn-icon p-1.5"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div
                className="relative h-28 bg-secondary/50 rounded-xl overflow-hidden cursor-pointer"
                onClick={handleWaveformClick}
              >
                {/* Selection highlight */}
                <div
                  className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`,
                  }}
                />

                {/* Waveform bars */}
                <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-2">
                  {waveformData.map((value, index) => {
                    const position = index / waveformData.length
                    const time = position * duration
                    const isInSelection = time >= startTime && time <= endTime
                    const isBeforePlayhead = time <= currentTime

                    return (
                      <div
                        key={index}
                        className={cn(
                          "w-1 rounded-full transition-all duration-75",
                          isInSelection
                            ? isBeforePlayhead
                              ? "bg-primary"
                              : "bg-primary/60"
                            : isBeforePlayhead
                              ? "bg-muted-foreground/60"
                              : "bg-muted-foreground/30",
                        )}
                        style={{ height: `${Math.max(8, value * 100)}%` }}
                      />
                    )
                  })}
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-accent z-10"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-accent rounded-full" />
                </div>

                {/* Bookmarks */}
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="absolute top-0 bottom-0 w-0.5 cursor-pointer z-20"
                    style={{ left: `${(bookmark.time / duration) * 100}%`, backgroundColor: bookmark.color }}
                    onClick={(e) => {
                      e.stopPropagation()
                      seekTo(bookmark.time)
                    }}
                  >
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: bookmark.color }}
                    />
                  </div>
                ))}
              </div>

              {/* Time display */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="card p-4">
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => seekTo(startTime)} className="btn-icon">
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button onClick={togglePlayPause} className="btn-primary w-12 h-12 rounded-full p-0">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => seekTo(endTime)} className="btn-icon">
                  <SkipForward className="w-4 h-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-2" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLooping(!isLooping)}
                  className={cn("btn-icon", isLooping && "bg-primary/20 text-primary")}
                >
                  <Repeat className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setIsMuted(!isMuted)} className="btn-icon">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={(v) => {
                    setVolume(v[0])
                    setIsMuted(v[0] === 0)
                    if (audioRef.current) audioRef.current.volume = v[0]
                  }}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-20"
                />
              </div>
            </div>

            {/* Selection Controls */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Selection</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="text"
                      value={formatTime(startTime)}
                      readOnly
                      className="input-field text-sm font-mono"
                    />
                    <Button variant="ghost" size="sm" onClick={() => setStartTime(currentTime)} className="btn-icon">
                      <BookmarkIcon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="text" value={formatTime(endTime)} readOnly className="input-field text-sm font-mono" />
                    <Button variant="ghost" size="sm" onClick={() => setEndTime(currentTime)} className="btn-icon">
                      <BookmarkIcon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  {
                    label: "First 10s",
                    action: () => {
                      setStartTime(0)
                      setEndTime(Math.min(10, duration))
                    },
                  },
                  {
                    label: "Last 10s",
                    action: () => {
                      setStartTime(Math.max(0, duration - 10))
                      setEndTime(duration)
                    },
                  },
                  {
                    label: "Select All",
                    action: () => {
                      setStartTime(0)
                      setEndTime(duration)
                    },
                  },
                  {
                    label: "Reset",
                    action: () => {
                      setStartTime(0)
                      setEndTime(duration)
                    },
                  },
                ].map((preset, i) => (
                  <Button key={i} variant="ghost" size="sm" onClick={preset.action} className="btn-ghost text-xs">
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bookmarks */}
            {bookmarks.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Bookmarks</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={addBookmark} className="btn-ghost text-xs">
                    <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bookmarks.map((bookmark) => (
                    <button
                      key={bookmark.id}
                      onClick={() => seekTo(bookmark.time)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary rounded-lg text-xs hover:bg-secondary/80 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bookmark.color }} />
                      <span>{formatTime(bookmark.time)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setBookmarks(bookmarks.filter((b) => b.id !== bookmark.id))
                        }}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === "effects" && file && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* EQ */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Equalizer</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Low", key: "eqLow" },
                  { label: "Mid", key: "eqMid" },
                  { label: "High", key: "eqHigh" },
                ].map((band) => (
                  <div key={band.key} className="text-center">
                    <div className="h-24 flex items-center justify-center">
                      <Slider
                        orientation="vertical"
                        value={[effects[band.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [band.key]: v[0] })}
                        min={-12}
                        max={12}
                        step={0.5}
                        className="h-20"
                      />
                    </div>
                    <p className="text-xs font-medium mt-2">{band.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(effects[band.key as keyof EffectSettings] as number) > 0 ? "+" : ""}
                      {effects[band.key as keyof EffectSettings]}dB
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Effects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Compressor */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Compressor</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Threshold", key: "compressorThreshold", min: -60, max: 0, unit: "dB" },
                    { label: "Ratio", key: "compressorRatio", min: 1, max: 20, unit: ":1" },
                  ].map((param) => (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-xs w-16">{param.label}</span>
                      <Slider
                        value={[effects[param.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                        min={param.min}
                        max={param.max}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-12 text-right">
                        {effects[param.key as keyof EffectSettings]}
                        {param.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reverb */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Reverb</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Mix", key: "reverbMix", min: 0, max: 100, unit: "%" },
                    { label: "Decay", key: "reverbDecay", min: 0.1, max: 10, unit: "s", step: 0.1 },
                  ].map((param) => (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-xs w-16">{param.label}</span>
                      <Slider
                        value={[effects[param.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                        min={param.min}
                        max={param.max}
                        step={param.step || 1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-12 text-right">
                        {(effects[param.key as keyof EffectSettings] as number).toFixed(param.step ? 1 : 0)}
                        {param.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delay */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Delay</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Time", key: "delayTime", min: 0, max: 2, unit: "s", step: 0.01 },
                    { label: "Feedback", key: "delayFeedback", min: 0, max: 0.9, unit: "", step: 0.01 },
                    { label: "Mix", key: "delayMix", min: 0, max: 100, unit: "%" },
                  ].map((param) => (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-xs w-16">{param.label}</span>
                      <Slider
                        value={[effects[param.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                        min={param.min}
                        max={param.max}
                        step={param.step || 1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-12 text-right">
                        {(effects[param.key as keyof EffectSettings] as number).toFixed(
                          param.step && param.step < 1 ? 2 : 0,
                        )}
                        {param.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "High Pass", key: "highpassFreq", min: 20, max: 2000, unit: "Hz" },
                    { label: "Low Pass", key: "lowpassFreq", min: 1000, max: 20000, unit: "Hz" },
                  ].map((param) => (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-xs w-16">{param.label}</span>
                      <Slider
                        value={[effects[param.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                        min={param.min}
                        max={param.max}
                        step={10}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-14 text-right">
                        {effects[param.key as keyof EffectSettings]}
                        {param.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modulation */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Orbit className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Modulation</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Chorus", key: "chorusMix", min: 0, max: 100, unit: "%" },
                    { label: "Flanger", key: "flangerMix", min: 0, max: 100, unit: "%" },
                  ].map((param) => (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-xs w-16">{param.label}</span>
                      <Slider
                        value={[effects[param.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                        min={param.min}
                        max={param.max}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-12 text-right">
                        {effects[param.key as keyof EffectSettings]}
                        {param.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distortion & Width */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Drive & Width</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Distortion", key: "distortionAmount", min: 0, max: 100, unit: "%" },
                    { label: "Stereo", key: "stereoWidth", min: 0, max: 200, unit: "%" },
                  ].map((param) => (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-xs w-16">{param.label}</span>
                      <Slider
                        value={[effects[param.key as keyof EffectSettings] as number]}
                        onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                        min={param.min}
                        max={param.max}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-12 text-right">
                        {effects[param.key as keyof EffectSettings]}
                        {param.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <Button variant="ghost" onClick={() => setEffects(defaultEffects)} className="btn-ghost w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All Effects
            </Button>
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === "export" && file && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Export Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="input-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wav">WAV (Lossless)</SelectItem>
                      <SelectItem value="mp3">MP3 (Compressed)</SelectItem>
                      <SelectItem value="ogg">OGG Vorbis</SelectItem>
                      <SelectItem value="m4a">M4A / AAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Quality</Label>
                  <Select value={exportQuality} onValueChange={setExportQuality}>
                    <SelectTrigger className="input-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (64 kbps)</SelectItem>
                      <SelectItem value="medium">Medium (128 kbps)</SelectItem>
                      <SelectItem value="high">High (256 kbps)</SelectItem>
                      <SelectItem value="ultra">Ultra (320 kbps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Processing</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Fade In: {fadeIn.toFixed(1)}s</Label>
                  <Slider value={[fadeIn]} onValueChange={(v) => setFadeIn(v[0])} min={0} max={5} step={0.1} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Fade Out: {fadeOut.toFixed(1)}s</Label>
                  <Slider value={[fadeOut]} onValueChange={(v) => setFadeOut(v[0])} min={0} max={5} step={0.1} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Normalize Audio</Label>
                  <Switch checked={normalize} onCheckedChange={setNormalize} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Trim Silence</Label>
                  <Switch checked={trimSilence} onCheckedChange={setTrimSilence} />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-primary/5 border-primary/20">
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Selection Duration</p>
                <p className="text-2xl font-bold text-gradient">{formatTime(endTime - startTime)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(startTime)} → {formatTime(endTime)}
                </p>
              </div>
            </div>

            <Button onClick={exportAudio} disabled={isProcessing} className="btn-primary w-full">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Audio
                </>
              )}
            </Button>
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === "projects" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Saved Projects</span>
              </div>
              <span className="text-xs text-muted-foreground">{savedProjects.length} projects</span>
            </div>

            {savedProjects.length === 0 ? (
              <div className="card p-8 text-center">
                <Folder className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No saved projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">Load an audio file and save your work</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedProjects.map((project) => (
                  <div key={project.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Music2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(project.duration)} • {project.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => loadProject(project)} className="btn-icon">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(project.id)}
                        className="btn-icon text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Show message when trying to access editor/effects/export without file */}
        {(activeTab === "editor" || activeTab === "effects" || activeTab === "export") && !file && (
          <div className="card p-8 text-center animate-in fade-in duration-300">
            <Music2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No audio file loaded</p>
            <Button className="btn-primary mt-4" onClick={() => setActiveTab("home")}>
              <Upload className="w-4 h-4 mr-2" />
              Load Audio
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => !item.disabled && setActiveTab(item.id)}
                disabled={item.disabled}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                  activeTab === item.id
                    ? "text-primary bg-primary/10"
                    : item.disabled
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
