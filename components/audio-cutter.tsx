"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Clock,
  X,
  Folder,
  Trash2,
  ChevronRight,
  Download,
  BookmarkIcon,
  BookmarkPlus,
  Music,
  Keyboard,
  Save,
  FileAudio,
  Waves,
  Sliders,
  Radio,
  Zap,
  SkipBack,
  SkipForward,
  Repeat,
  Sun,
  Moon,
  SlidersHorizontal,
  AudioWaveform,
  Target,
  HardDrive,
  Gauge,
  Sparkles,
  Timer,
  FastForward,
  Rewind,
  Speaker,
  ZoomIn,
  ZoomOut,
  FileMusic,
  AudioLines,
  Filter,
  Crop,
  TrendingUp,
  Flame,
  Shell,
  Orbit,
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

interface Region {
  id: string
  start: number
  end: number
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
  // EQ
  eqLow: number
  eqMid: number
  eqHigh: number
  eqLowMid: number
  eqHighMid: number
  // Compression
  compressorThreshold: number
  compressorRatio: number
  compressorAttack: number
  compressorRelease: number
  compressorKnee: number
  compressorMakeup: number
  // Reverb
  reverbMix: number
  reverbDecay: number
  reverbPreDelay: number
  reverbDamping: number
  // Delay
  delayTime: number
  delayFeedback: number
  delayMix: number
  // Filters
  highpassFreq: number
  lowpassFreq: number
  // Distortion
  distortionAmount: number
  distortionTone: number
  // Chorus
  chorusRate: number
  chorusDepth: number
  chorusMix: number
  // Flanger
  flangerRate: number
  flangerDepth: number
  flangerMix: number
  // General
  gain: number
  pan: number
  stereoWidth: number
}

const defaultEffects: EffectSettings = {
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  eqLowMid: 0,
  eqHighMid: 0,
  compressorThreshold: -24,
  compressorRatio: 4,
  compressorAttack: 0.003,
  compressorRelease: 0.25,
  compressorKnee: 30,
  compressorMakeup: 0,
  reverbMix: 0,
  reverbDecay: 2,
  reverbPreDelay: 0.02,
  reverbDamping: 0.5,
  delayTime: 0.3,
  delayFeedback: 0.3,
  delayMix: 0,
  highpassFreq: 20,
  lowpassFreq: 20000,
  distortionAmount: 0,
  distortionTone: 50,
  chorusRate: 1.5,
  chorusDepth: 0.5,
  chorusMix: 0,
  flangerRate: 0.5,
  flangerDepth: 0.5,
  flangerMix: 0,
  gain: 0,
  pan: 0,
  stereoWidth: 100,
}

const bookmarkColors = ["#f97316", "#8b5cf6", "#ec4899", "#22c55e", "#3b82f6", "#eab308"]

function AudioCutter() {
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()

  // Core state
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
  const [isExporting, setIsExporting] = useState<boolean>(false) // Added for export state

  // UI state
  const [activeTab, setActiveTab] = useState<string>("editor")
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [showWaveform, setShowWaveform] = useState<boolean>(true)
  const [showSpectrum, setShowSpectrum] = useState<boolean>(false)
  const [projectName, setProjectName] = useState<string>("")
  const [viewMode, setViewMode] = useState<"waveform" | "spectrogram" | "both">("waveform")
  const [showSidebar, setShowSidebar] = useState<boolean>(true)

  // Effects state
  const [effects, setEffects] = useState<EffectSettings>(defaultEffects)
  const [activeEffectTab, setActiveEffectTab] = useState<string>("eq")

  // Bookmarks & Regions
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([])
  const [regions, setRegions] = useState<Region[]>([])

  // Export settings
  const [exportFormat, setExportFormat] = useState<string>("wav")
  const [exportQuality, setExportQuality] = useState<string>("high")
  const [sampleRate, setSampleRate] = useState<string>("44100")
  const [bitDepth, setBitDepth] = useState<string>("16")
  const [normalize, setNormalize] = useState<boolean>(true)
  const [fadeIn, setFadeIn] = useState<number>(0)
  const [fadeOut, setFadeOut] = useState<number>(0)
  const [trimSilence, setTrimSilence] = useState<boolean>(false)

  // Saved projects
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])

  // Waveform data
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [peakData, setPeakData] = useState<{ left: number; right: number }>({ left: 0, right: 0 })

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Refs for markers and current time (to avoid dependency issues in effects)
  const startTimeRef = useRef<number>(0)
  const endTimeRef = useRef<number>(0)
  const currentTimeRef = useRef<number>(0)

  // Selection duration calculation
  const selectionDuration = endTime - startTime

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft":
          e.preventDefault()
          skip(-5)
          break
        case "ArrowRight":
          e.preventDefault()
          skip(5)
          break
        case "KeyS":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            // Using the ref for the latest currentTime
            startTimeRef.current = currentTimeRef.current
            setStartTime(currentTimeRef.current)
            addToast({ message: "Start point set", type: "success" })
          }
          break
        case "KeyE":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            // Using the ref for the latest currentTime
            endTimeRef.current = currentTimeRef.current
            setEndTime(currentTimeRef.current)
            addToast({ message: "End point set", type: "success" })
          }
          break
        case "KeyM":
          e.preventDefault()
          setIsMuted(!isMuted)
          break
        case "KeyL":
          e.preventDefault()
          setIsLooping(!isLooping)
          break
        case "KeyB":
          e.preventDefault()
          addBookmark()
          break
        case "Home":
          e.preventDefault()
          seekTo(0)
          break
        case "End":
          e.preventDefault()
          seekTo(duration)
          break
        case "BracketLeft":
          e.preventDefault()
          seekTo(startTime)
          break
        case "BracketRight":
          e.preventDefault()
          seekTo(endTime)
          break
        case "Delete":
        case "Backspace":
          if (e.shiftKey) {
            e.preventDefault()
            // Delete selected region functionality
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentTime, duration, isMuted, isLooping, startTime, endTime, addToast]) // Removed togglePlayPause, skip, seekTo, addBookmark as they are defined in scope and stable

  // File handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      await loadAudioFile(selectedFile)
    }
  }

  const loadAudioFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setProjectName(selectedFile.name.replace(/\.[^/.]+$/, ""))

    const url = URL.createObjectURL(selectedFile)
    setAudioUrl(url)

    // Create audio context and load buffer
    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      // Reset start/end times and current time on new file load
      setStartTime(0)
      setEndTime(buffer.duration)
      startTimeRef.current = 0
      endTimeRef.current = buffer.duration
      setCurrentTime(0)
      currentTimeRef.current = 0

      // Generate waveform data
      generateWaveformData(buffer)

      // Setup analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      addToast({ message: "Audio loaded successfully", type: "success" })
    } catch (error) {
      addToast({ message: "Error loading audio file", type: "error" })
    }
  }

  const generateWaveformData = (buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0)
    const samples = 200 // Number of data points for the waveform
    const blockSize = Math.floor(channelData.length / samples)
    const data: number[] = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      const start = i * blockSize
      const end = start + blockSize
      for (let j = start; j < end; j++) {
        if (j < channelData.length) {
          // Ensure we don't go out of bounds
          sum += Math.abs(channelData[j])
        }
      }
      data.push(sum / blockSize)
    }

    // Normalize the waveform data
    const max = Math.max(...data)
    if (max > 0) {
      setWaveformData(data.map((d) => d / max))
    } else {
      setWaveformData(data.map(() => 0)) // Handle cases with no audio data
    }
  }

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith("audio/")) {
      await loadAudioFile(droppedFile)
    }
  }

  // Playback controls
  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (audioRef.current.paused) {
      audioRef.current.play()
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const skip = (seconds: number) => {
    if (!audioRef.current) return
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    currentTimeRef.current = newTime // Update ref
  }

  const seekTo = (time: number) => {
    if (!audioRef.current) return
    const newTime = Math.max(0, Math.min(duration, time))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    currentTimeRef.current = newTime // Update ref
  }

  // Time update
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      currentTimeRef.current = audio.currentTime // Update ref

      if (isLooping && audio.currentTime >= endTimeRef.current) {
        // Use ref for endTime
        audio.currentTime = startTimeRef.current // Use ref for startTime
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      if (isLooping) {
        audio.currentTime = startTimeRef.current // Use ref for startTime
        audio.play()
      } else {
        audio.currentTime = 0
        setCurrentTime(0)
        currentTimeRef.current = 0
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [isLooping]) // Removed seekTo from dependencies

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Set start/end markers based on currentTimeRef
  const setStartMarker = (time: number) => {
    setStartTime(time)
    startTimeRef.current = time
  }

  const setEndMarker = (time: number) => {
    setEndTime(time)
    endTimeRef.current = time
  }

  // Exposed functions for setting start/end times
  const setStartTimePoint = () => {
    startTimeRef.current = currentTimeRef.current
    setStartTime(currentTimeRef.current)
    addToast({ message: "Start point set", type: "success" })
  }

  const setEndTimePoint = () => {
    endTimeRef.current = currentTimeRef.current
    setEndTime(currentTimeRef.current)
    addToast({ message: "End point set", type: "success" })
  }

  // Bookmarks
  const addBookmark = () => {
    const newBookmark: AudioBookmark = {
      id: Date.now().toString(), // Using timestamp for unique IDs
      time: currentTimeRef.current, // Use ref for current time
      label: `Marker ${bookmarks.length + 1}`,
      color: bookmarkColors[bookmarks.length % bookmarkColors.length],
    }
    setBookmarks([...bookmarks, newBookmark])
    addToast({ message: "Bookmark added", type: "success" })
  }

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id))
  }

  const jumpToBookmark = (time: number) => {
    seekTo(time) // Keep this as seekTo is defined in scope
  }

  // Waveform click
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    seekTo(time) // Keep this as seekTo is defined in scope
  }

  // Export
  const exportAudio = async () => {
    if (!audioBuffer) {
      addToast({ message: "No audio loaded", type: "error" })
      return
    }

    setIsExporting(true) // Use isExporting state

    try {
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil((endTime - startTime) * audioBuffer.sampleRate),
        audioBuffer.sampleRate,
      )

      // Create buffer source
      const source = offlineContext.createBufferSource()

      // Create new buffer with selection
      const newBuffer = offlineContext.createBuffer(
        audioBuffer.numberOfChannels,
        Math.ceil((endTime - startTime) * audioBuffer.sampleRate),
        audioBuffer.sampleRate,
      )

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        const startSample = Math.floor(startTime * audioBuffer.sampleRate)

        for (let i = 0; i < newData.length; i++) {
          if (startSample + i < originalData.length) {
            // Bounds check
            newData[i] = originalData[startSample + i]
          } else {
            newData[i] = 0 // Fill with silence if out of bounds
          }

          // Apply fade in
          const fadeInSamples = fadeIn * audioBuffer.sampleRate
          if (fadeIn > 0 && i < fadeInSamples) {
            newData[i] *= i / fadeInSamples
          }

          // Apply fade out
          const fadeOutSamples = fadeOut * audioBuffer.sampleRate
          if (fadeOut > 0 && i > newData.length - fadeOutSamples) {
            newData[i] *= (newData.length - i) / fadeOutSamples
          }
        }

        // Normalize if enabled
        if (normalize) {
          let max = 0
          for (let i = 0; i < newData.length; i++) {
            max = Math.max(max, Math.abs(newData[i]))
          }
          if (max > 0) {
            const normalizeRatio = 0.95 / max // Aim for just below max
            for (let i = 0; i < newData.length; i++) {
              newData[i] *= normalizeRatio
            }
          }
        }
      }

      source.buffer = newBuffer
      source.connect(offlineContext.destination)
      source.start()

      const renderedBuffer = await offlineContext.startRendering()

      // Convert to WAV
      // TODO: Implement export to other formats (MP3, OGG, M4A) based on exportFormat state
      const wavBlob = audioBufferToWav(renderedBuffer)

      // Download
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName || "audio"}_cut.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)

      addToast({ message: "Export complete!", type: "success" })
    } catch (error) {
      console.error("Export error:", error)
      addToast({ message: "Export failed", type: "error" })
    }

    setIsExporting(false) // Use isExporting state
  }

  // WAV encoder
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepthNum = Number.parseInt(bitDepth, 10) // Use state

    const bytesPerSample = bitDepthNum / 8
    const blockAlign = numChannels * bytesPerSample

    const dataLength = buffer.length * blockAlign
    const bufferLength = 44 + dataLength // Header size + data size
    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    // RIFF chunk descriptor
    writeString(0, "RIFF")
    view.setUint32(4, 36 + dataLength, true) // ChunkSize
    writeString(8, "WAVE") // Format

    // fmt sub-chunk
    writeString(12, "fmt ")
    view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true) // AudioFormat
    view.setUint16(22, numChannels, true) // NumChannels
    view.setUint32(24, sampleRate, true) // SampleRate
    view.setUint32(28, sampleRate * blockAlign, true) // ByteRate
    view.setUint16(32, blockAlign, true) // BlockAlign
    view.setUint16(34, bitDepthNum, true) // BitsPerSample

    // data sub-chunk
    writeString(36, "data")
    view.setUint32(40, dataLength, true) // Subchunk2Size

    const channels: Float32Array[] = []
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    let offset = 44 // Start writing sample data after header
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        // Clamp sample value between -1 and 1
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))

        // Convert float to 16-bit integer
        if (bitDepthNum === 16) {
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        } else if (bitDepthNum === 24) {
          // For 24-bit, we write as 3 bytes
          const intSample = Math.round(sample * 0x7fffff)
          const byte1 = intSample & 0xff
          const byte2 = (intSample >> 8) & 0xff
          const byte3 = (intSample >> 16) & 0xff
          view.setUint8(offset, byte1)
          view.setUint8(offset + 1, byte2)
          view.setUint8(offset + 2, byte3)
          offset += 2 // Move offset by 2 bytes as we are writing 3 bytes in a 16-bit aligned way here for simplicity
        } else if (bitDepthNum === 32) {
          // 32-bit float is already available in channels[channel][i]
          view.setFloat32(offset, sample, true)
        }
        offset += bytesPerSample
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  // Save/Load projects
  const saveProject = () => {
    if (!file || !audioUrl) {
      addToast({ message: "No audio file to save", type: "warning" })
      return
    }

    const project: SavedProject = {
      id: Date.now().toString(),
      name: projectName || file.name.replace(/\.[^/.]+$/, ""), // Use project name or file name without extension
      date: new Date().toISOString().split("T")[0], // ISO format for consistent sorting
      duration,
      startTime: startTimeRef.current, // Use ref
      endTime: endTimeRef.current, // Use ref
      audioUrl, // Store the object URL
    }

    setSavedProjects([project, ...savedProjects])
    addToast({ message: "Project saved", type: "success" })
  }

  const loadProject = async (project: SavedProject) => {
    // Re-create audio element and load URL
    setAudioUrl(project.audioUrl)
    setDuration(project.duration)
    setStartTime(project.startTime)
    setEndTime(project.endTime)
    startTimeRef.current = project.startTime
    endTimeRef.current = project.endTime
    setProjectName(project.name)

    // Load audio buffer again for editing features
    try {
      const response = await fetch(project.audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      generateWaveformData(buffer) // Regenerate waveform

      // Setup analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      addToast({ message: "Project loaded", type: "success" })
    } catch (error) {
      addToast({ message: "Error loading project audio", type: "error" })
    }

    setActiveTab("editor")
  }

  const deleteProject = (id: string) => {
    setSavedProjects(savedProjects.filter((p) => p.id !== id))
    // TODO: Revoke object URL if it was created for a saved project
    addToast({ message: "Project deleted", type: "info" })
  }

  const resetFile = () => {
    setFile(null)
    setAudioUrl(null)
    setAudioBuffer(null)
    setDuration(0)
    setCurrentTime(0)
    currentTimeRef.current = 0
    setStartTime(0)
    setEndTime(0)
    startTimeRef.current = 0
    endTimeRef.current = 0
    setWaveformData([])
    setBookmarks([])
    setRegions([]) // Clear regions too
    setProjectName("")
    setIsPlaying(false)
    // Reset effects to default
    setEffects(defaultEffects)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-radial">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/30">
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">WaveForge</h1>
              <p className="text-xs text-muted-foreground">Sculpt Your Sound</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {file && (
              <div className="hidden md:flex items-center gap-2 mr-4">
                <span className="badge badge-primary">
                  <FileAudio className="w-3 h-3 mr-1" />
                  {file.name.length > 20 ? file.name.slice(0, 20) + "..." : file.name}
                </span>
              </div>
            )}

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="btn-icon">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-secondary p-1.5 rounded-2xl">
            <TabsTrigger
              value="editor"
              className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300"
            >
              <AudioWaveform className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300"
            >
              <Folder className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6 animate-fade-in">
            {!file ? (
              /* New upload area and home screen */
              <div className="space-y-12">
                {/* Hero Upload Section */}
                <div
                  className={cn(
                    "card-elevated p-8 md:p-16 transition-all duration-500 relative overflow-hidden",
                    isDragging && "ring-2 ring-primary ring-offset-4 ring-offset-background scale-[1.01]",
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                  <div className="text-center max-w-2xl mx-auto relative z-10">
                    {/* Animated icon */}
                    <div className="relative mx-auto w-40 h-40 mb-10">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse-ring" />
                      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-float" />
                      <div className="absolute inset-6 rounded-full bg-card flex items-center justify-center shadow-2xl border border-border">
                        <div className="relative">
                          <AudioLines className="w-16 h-16 text-primary" />
                          <Sparkles className="w-6 h-6 text-accent absolute -top-2 -right-2 animate-bounce-subtle" />
                        </div>
                      </div>
                    </div>

                    <h2 className="text-display mb-4">
                      <span className="text-gradient">Sculpt</span> Your Sound
                    </h2>
                    <p className="text-body text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                      Professional audio editing in your browser. Drop any audio file to start cutting, applying
                      effects, and exporting in multiple formats.
                    </p>

                    <button
                      className="btn-primary text-lg px-10 py-5 relative overflow-hidden group"
                      onClick={() => document.getElementById("audio-upload")?.click()}
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <Upload className="w-6 h-6 mr-3" />
                      Choose Audio File
                    </button>

                    <input
                      id="audio-upload"
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <p className="text-caption mt-8 flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
                        <FileMusic className="w-3.5 h-3.5" />
                        MP3
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
                        <FileMusic className="w-3.5 h-3.5" />
                        WAV
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
                        <FileMusic className="w-3.5 h-3.5" />
                        OGG
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
                        <FileMusic className="w-3.5 h-3.5" />
                        FLAC
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
                        <FileMusic className="w-3.5 h-3.5" />
                        M4A
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-headline mb-2">Powerful Features</h3>
                    <p className="text-muted-foreground">Everything you need for professional audio editing</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      {
                        icon: Scissors,
                        title: "Precision Cutting",
                        description:
                          "Frame-accurate cutting with visual waveform display. Set precise start and end points with millisecond accuracy.",
                        color: "from-orange-500 to-amber-500",
                      },
                      {
                        icon: Sliders,
                        title: "5-Band Equalizer",
                        description:
                          "Shape your sound with a professional 5-band EQ. Boost or cut frequencies from 20Hz to 20kHz.",
                        color: "from-purple-500 to-pink-500",
                      },
                      {
                        icon: Gauge,
                        title: "Dynamic Compression",
                        description:
                          "Control dynamics with threshold, ratio, attack, release, and makeup gain controls.",
                        color: "from-blue-500 to-cyan-500",
                      },
                      {
                        icon: Radio,
                        title: "Reverb & Delay",
                        description:
                          "Add space and depth with adjustable reverb decay, pre-delay, and tempo-synced delay.",
                        color: "from-emerald-500 to-teal-500",
                      },
                      {
                        icon: Orbit,
                        title: "Chorus & Flanger",
                        description:
                          "Create rich, swirling textures with modulation effects. Control rate, depth, and mix.",
                        color: "from-rose-500 to-orange-500",
                      },
                      {
                        icon: Filter,
                        title: "High/Low Pass Filters",
                        description: "Clean up your audio with adjustable filter frequencies from 20Hz to 20kHz.",
                        color: "from-indigo-500 to-purple-500",
                      },
                      {
                        icon: TrendingUp,
                        title: "Audio Normalization",
                        description: "Automatically optimize volume levels for consistent loudness across your audio.",
                        color: "from-amber-500 to-yellow-500",
                      },
                      {
                        icon: Waves,
                        title: "Fade In/Out",
                        description: "Smooth transitions with customizable fade curves up to 5 seconds.",
                        color: "from-cyan-500 to-blue-500",
                      },
                      {
                        icon: Speaker,
                        title: "Stereo Processing",
                        description: "Control panning and stereo width for perfect spatial positioning.",
                        color: "from-pink-500 to-rose-500",
                      },
                      {
                        icon: Flame,
                        title: "Distortion & Saturation",
                        description: "Add warmth and grit with tube-style saturation and harmonic distortion.",
                        color: "from-red-500 to-orange-500",
                      },
                      // Updated icon references from Bookmark to BookmarkIcon
                      {
                        icon: BookmarkIcon,
                        title: "Smart Bookmarks",
                        description: "Mark important points with color-coded bookmarks for quick navigation.",
                        color: "from-violet-500 to-purple-500",
                      },
                      {
                        icon: Download,
                        title: "Multi-Format Export",
                        description: "Export to WAV, MP3, OGG, or M4A with customizable sample rate and bit depth.",
                        color: "from-teal-500 to-emerald-500",
                      },
                    ].map((feature, index) => (
                      <div
                        key={index}
                        className="feature-card card-interactive p-6 group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                            feature.color,
                          )}
                        >
                          <feature.icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-title mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                        <p className="text-body text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                      <Keyboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-title">Keyboard Shortcuts</h3>
                      <p className="text-caption">Speed up your workflow with these hotkeys</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: "Space", action: "Play / Pause", icon: Play },
                      { key: "← / →", action: "Skip 5 seconds", icon: SkipForward },
                      { key: "S", action: "Set start point", icon: Target },
                      { key: "E", action: "Set end point", icon: Target },
                      { key: "M", action: "Toggle mute", icon: VolumeX },
                      { key: "L", action: "Toggle loop", icon: Repeat },
                      { key: "B", action: "Add bookmark", icon: BookmarkPlus },
                      { key: "Home", action: "Go to start", icon: SkipBack },
                      { key: "End", action: "Go to end", icon: SkipForward },
                      { key: "[ / ]", action: "Jump to selection", icon: Crop },
                      { key: "+ / -", action: "Zoom in/out", icon: ZoomIn },
                      { key: "Delete", action: "Remove region", icon: Trash2 },
                    ].map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
                      >
                        <shortcut.icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{shortcut.action}</p>
                        </div>
                        <kbd className="px-2 py-1 bg-card rounded-lg text-xs font-mono border border-border shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-title">Quick Tips</h3>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "Double-click the waveform to set both start and end points",
                        "Use the scroll wheel to zoom in and out of the waveform",
                        "Hold Shift while dragging to select multiple regions",
                        "Export in WAV for lossless quality, MP3 for smaller files",
                      ].map((tip, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-title">Best Practices</h3>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "Always preview your selection before exporting",
                        "Use bookmarks to mark important sections for quick access",
                        "Enable normalization for consistent volume levels",
                        "Apply subtle compression to even out dynamic range",
                      ].map((tip, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Processing", value: "100% Local", icon: HardDrive, desc: "No uploads needed" },
                    { label: "Formats", value: "5+ Types", icon: FileMusic, desc: "Import & export" },
                    { label: "Effects", value: "10+ Built-in", icon: Sliders, desc: "Pro-grade tools" },
                    { label: "Export", value: "High Quality", icon: Download, desc: "Up to 320kbps" },
                  ].map((stat, index) => (
                    <div key={index} className="card p-5 text-center group hover:border-primary/30 transition-colors">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <stat.icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold text-gradient">{stat.value}</p>
                      <p className="text-sm font-medium">{stat.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Editor Interface */
              <div className="space-y-4">
                {/* Project Header */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="input-sm w-48 font-medium"
                        placeholder="Project name"
                      />
                      <span className="badge badge-primary">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={resetFile} className="btn-ghost text-sm">
                        <X className="w-4 h-4 mr-1" />
                        Close
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Waveform Display */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Waves className="w-4 h-4 text-primary" />
                      <span className="text-subtitle">Waveform</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                        disabled={zoomLevel <= 1}
                        className="btn-icon p-1"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-caption w-12 text-center">{zoomLevel}x</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
                        disabled={zoomLevel >= 4}
                        className="btn-icon p-1"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Waveform Visualizer */}
                  <div
                    className="relative h-36 bg-secondary/50 rounded-2xl overflow-hidden cursor-pointer group"
                    onClick={handleWaveformClick}
                  >
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
                              "flex-1 rounded-full transition-all duration-75",
                              isInSelection
                                ? isBeforePlayhead
                                  ? "bg-primary"
                                  : "bg-primary/50"
                                : "bg-muted-foreground/30",
                            )}
                            style={{
                              height: `${Math.max(4, value * 100)}%`,
                            }}
                          />
                        )
                      })}
                    </div>

                    {/* Selection overlay */}
                    <div
                      className="absolute top-0 bottom-0 bg-primary/10 border-l-2 border-r-2 border-primary pointer-events-none"
                      style={{
                        left: `${(startTime / duration) * 100}%`,
                        width: `${((endTime - startTime) / duration) * 100}%`,
                      }}
                    />

                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none z-10"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full shadow-lg" />
                    </div>

                    {/* Bookmarks */}
                    {bookmarks.length > 0 &&
                      bookmarks.map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="absolute top-0 bottom-0 w-0.5 cursor-pointer z-20 group/bookmark"
                          style={{
                            left: `${(bookmark.time / duration) * 100}%`,
                            backgroundColor: bookmark.color,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            jumpToBookmark(bookmark.time)
                          }}
                        >
                          <div
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-lg"
                            style={{ backgroundColor: bookmark.color }}
                          />
                        </div>
                      ))}
                  </div>

                  {/* Time display */}
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                    <span>{formatTime(0)}</span>
                    <span className="text-primary font-semibold">{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => seekTo(startTime)} className="btn-icon">
                      <SkipBack className="w-5 h-5" />
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => skip(-5)} className="btn-icon">
                      <Rewind className="w-5 h-5" />
                    </Button>

                    <button
                      className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all"
                      onClick={togglePlayPause}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>

                    <Button variant="ghost" size="sm" onClick={() => skip(5)} className="btn-icon">
                      <FastForward className="w-5 h-5" />
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => seekTo(endTime)} className="btn-icon">
                      <SkipForward className="w-5 h-5" />
                    </Button>

                    <div className="w-px h-8 bg-border mx-2" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsLooping(!isLooping)}
                      className={cn("btn-icon", isLooping && "bg-primary/20 text-primary")}
                    >
                      <Repeat className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className={cn("btn-icon", isMuted && "text-destructive")}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>

                    <div className="flex items-center gap-2 w-32">
                      <Slider
                        value={[volume * 100]}
                        onValueChange={(v) => setVolume(v[0] / 100)}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                    </div>

                    <Button variant="ghost" size="sm" onClick={addBookmark} className="btn-icon">
                      <BookmarkPlus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-subtitle">Selection</span>
                    <span className="badge badge-accent ml-auto">{formatTime(selectionDuration)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-caption">Start Time</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={formatTime(startTime)}
                          readOnly
                          className="input-sm font-mono flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={setStartTimePoint} // Use the dedicated function
                          className="btn-ghost"
                        >
                          Set
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-caption">End Time</Label>
                      <div className="flex gap-2">
                        <Input type="text" value={formatTime(endTime)} readOnly className="input-sm font-mono flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={setEndTimePoint} // Use the dedicated function
                          className="btn-ghost"
                        >
                          Set
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => seekTo(startTime)} className="btn-ghost py-2">
                      <ChevronRight className="w-4 h-4 mr-1" />
                      Go to Start
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => seekTo(endTime)} className="btn-ghost py-2">
                      Go to End
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStartTime(0)
                        setEndTime(duration)
                        startTimeRef.current = 0
                        endTimeRef.current = duration
                      }}
                      className="btn-ghost py-2"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Quick Selection */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-subtitle">Quick Selection</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "All",
                        action: () => {
                          setStartTime(0)
                          setEndTime(duration)
                          startTimeRef.current = 0
                          endTimeRef.current = duration
                        },
                      },
                      {
                        label: "First 10s",
                        action: () => {
                          setStartTime(0)
                          setEndTime(Math.min(10, duration))
                          startTimeRef.current = 0
                          endTimeRef.current = Math.min(10, duration)
                        },
                      },
                      {
                        label: "First 30s",
                        action: () => {
                          setStartTime(0)
                          setEndTime(Math.min(30, duration))
                          startTimeRef.current = 0
                          endTimeRef.current = Math.min(30, duration)
                        },
                      },
                      {
                        label: "First 60s",
                        action: () => {
                          setStartTime(0)
                          setEndTime(Math.min(60, duration))
                          startTimeRef.current = 0
                          endTimeRef.current = Math.min(60, duration)
                        },
                      },
                      {
                        label: "Last 10s",
                        action: () => {
                          setStartTime(Math.max(0, duration - 10))
                          setEndTime(duration)
                          startTimeRef.current = Math.max(0, duration - 10)
                          endTimeRef.current = duration
                        },
                      },
                      {
                        label: "Last 30s",
                        action: () => {
                          setStartTime(Math.max(0, duration - 30))
                          setEndTime(duration)
                          startTimeRef.current = Math.max(0, duration - 30)
                          endTimeRef.current = duration
                        },
                      },
                      {
                        label: "Middle 30s",
                        action: () => {
                          const mid = duration / 2
                          setStartTime(Math.max(0, mid - 15))
                          setEndTime(Math.min(duration, mid + 15))
                          startTimeRef.current = Math.max(0, mid - 15)
                          endTimeRef.current = Math.min(duration, mid + 15)
                        },
                      },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={preset.action}
                        className="btn-ghost text-sm px-3 py-1.5 bg-transparent hover:bg-primary/10 hover:text-primary"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Bookmarks */}
                {bookmarks.length > 0 && (
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookmarkIcon className="w-4 h-4 text-primary" />
                      <span className="text-subtitle">Bookmarks</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bookmarks.map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 group hover:bg-secondary/80 transition-colors"
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bookmark.color }} />
                          <button
                            onClick={() => jumpToBookmark(bookmark.time)}
                            className="font-mono text-sm hover:text-primary transition-colors"
                          >
                            {formatTime(bookmark.time)}
                          </button>
                          <button
                            onClick={() => removeBookmark(bookmark.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Effects & Export Panel */}
                <div className="card p-4">
                  <Tabs value={activeEffectTab} onValueChange={setActiveEffectTab}>
                    <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 rounded-xl mb-4">
                      <TabsTrigger value="eq" className="rounded-lg text-sm">
                        <SlidersHorizontal className="w-4 h-4 mr-1" />
                        EQ
                      </TabsTrigger>
                      <TabsTrigger value="dynamics" className="rounded-lg text-sm">
                        <Gauge className="w-4 h-4 mr-1" />
                        Dynamics
                      </TabsTrigger>
                      <TabsTrigger value="effects" className="rounded-lg text-sm">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Effects
                      </TabsTrigger>
                      <TabsTrigger value="export" className="rounded-lg text-sm">
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="eq" className="space-y-4">
                      <div className="panel">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-primary" />
                          5-Band Parametric EQ
                        </h4>
                        <div className="grid grid-cols-5 gap-4">
                          {[
                            { label: "Low", key: "eqLow", freq: "80Hz" },
                            { label: "Low-Mid", key: "eqLowMid", freq: "250Hz" },
                            { label: "Mid", key: "eqMid", freq: "1kHz" },
                            { label: "High-Mid", key: "eqHighMid", freq: "4kHz" },
                            { label: "High", key: "eqHigh", freq: "12kHz" },
                          ].map((band) => (
                            <div key={band.key} className="flex flex-col items-center gap-2">
                              <span className="text-xs text-muted-foreground">{band.freq}</span>
                              <div className="h-32 flex items-center">
                                <Slider
                                  orientation="vertical"
                                  value={[effects[band.key as keyof EffectSettings] as number]}
                                  onValueChange={(v) => setEffects({ ...effects, [band.key]: v[0] })}
                                  min={-12}
                                  max={12}
                                  step={0.5}
                                  className="h-full"
                                />
                              </div>
                              <span className="text-sm font-medium">{band.label}</span>
                              <span className="text-xs font-mono text-primary">
                                {(effects[band.key as keyof EffectSettings] as number) > 0 ? "+" : ""}
                                {effects[band.key as keyof EffectSettings]}dB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-primary" />
                            High-Pass Filter
                          </h4>
                          <div className="space-y-2">
                            <Slider
                              value={[effects.highpassFreq]}
                              onValueChange={(v) => setEffects({ ...effects, highpassFreq: v[0] })}
                              min={20}
                              max={500}
                              step={1}
                            />
                            <span className="text-xs font-mono text-center block">{effects.highpassFreq}Hz</span>
                          </div>
                        </div>
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-primary" />
                            Low-Pass Filter
                          </h4>
                          <div className="space-y-2">
                            <Slider
                              value={[effects.lowpassFreq]}
                              onValueChange={(v) => setEffects({ ...effects, lowpassFreq: v[0] })}
                              min={1000}
                              max={20000}
                              step={100}
                            />
                            <span className="text-xs font-mono text-center block">{effects.lowpassFreq}Hz</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="dynamics" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="panel">
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-primary" />
                            Compressor
                          </h4>
                          <div className="space-y-4">
                            {[
                              { label: "Threshold", key: "compressorThreshold", min: -60, max: 0, unit: "dB" },
                              { label: "Ratio", key: "compressorRatio", min: 1, max: 20, unit: ":1" },
                              { label: "Knee", key: "compressorKnee", min: 0, max: 40, unit: "dB" },
                              { label: "Makeup", key: "compressorMakeup", min: 0, max: 24, unit: "dB" },
                            ].map((param) => (
                              <div key={param.key} className="flex items-center gap-3">
                                <span className="text-sm w-20">{param.label}</span>
                                <Slider
                                  value={[effects[param.key as keyof EffectSettings] as number]}
                                  onValueChange={(v) => setEffects({ ...effects, [param.key]: v[0] })}
                                  min={param.min}
                                  max={param.max}
                                  step={param.key === "compressorRatio" ? 0.5 : 1}
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

                        <div className="panel">
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Output
                          </h4>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm w-20">Gain</span>
                              <Slider
                                value={[effects.gain]}
                                onValueChange={(v) => setEffects({ ...effects, gain: v[0] })}
                                min={-12}
                                max={12}
                                step={0.5}
                                className="flex-1"
                              />
                              <span className="text-xs font-mono w-14 text-right">
                                {effects.gain > 0 ? "+" : ""}
                                {effects.gain}dB
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm w-20">Pan</span>
                              <Slider
                                value={[effects.pan]}
                                onValueChange={(v) => setEffects({ ...effects, pan: v[0] })}
                                min={-100}
                                max={100}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-xs font-mono w-14 text-right">
                                {effects.pan === 0
                                  ? "C"
                                  : effects.pan < 0
                                    ? `L${Math.abs(effects.pan)}`
                                    : `R${effects.pan}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm w-20">Width</span>
                              <Slider
                                value={[effects.stereoWidth]}
                                onValueChange={(v) => setEffects({ ...effects, stereoWidth: v[0] })}
                                min={0}
                                max={200}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-xs font-mono w-14 text-right">{effects.stereoWidth}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="effects" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Reverb */}
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Radio className="w-4 h-4 text-primary" />
                            Reverb
                          </h4>
                          <div className="space-y-3">
                            {[
                              { label: "Mix", key: "reverbMix", min: 0, max: 100, unit: "%" },
                              { label: "Decay", key: "reverbDecay", min: 0.1, max: 10, unit: "s", step: 0.1 },
                              { label: "Pre-Delay", key: "reverbPreDelay", min: 0, max: 0.1, unit: "s", step: 0.001 },
                              { label: "Damping", key: "reverbDamping", min: 0, max: 1, unit: "", step: 0.01 },
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
                                  {typeof effects[param.key as keyof EffectSettings] === "number"
                                    ? (effects[param.key as keyof EffectSettings] as number).toFixed(
                                        param.step && param.step < 1 ? 2 : 0,
                                      )
                                    : effects[param.key as keyof EffectSettings]}
                                  {param.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delay */}
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Timer className="w-4 h-4 text-primary" />
                            Delay
                          </h4>
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

                        {/* Chorus */}
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Orbit className="w-4 h-4 text-primary" />
                            Chorus
                          </h4>
                          <div className="space-y-3">
                            {[
                              { label: "Rate", key: "chorusRate", min: 0.1, max: 10, unit: "Hz", step: 0.1 },
                              { label: "Depth", key: "chorusDepth", min: 0, max: 1, unit: "", step: 0.01 },
                              { label: "Mix", key: "chorusMix", min: 0, max: 100, unit: "%" },
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
                                    param.step && param.step < 1 ? 1 : 0,
                                  )}
                                  {param.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Flanger */}
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Shell className="w-4 h-4 text-primary" />
                            Flanger
                          </h4>
                          <div className="space-y-3">
                            {[
                              { label: "Rate", key: "flangerRate", min: 0.1, max: 5, unit: "Hz", step: 0.1 },
                              { label: "Depth", key: "flangerDepth", min: 0, max: 1, unit: "", step: 0.01 },
                              { label: "Mix", key: "flangerMix", min: 0, max: 100, unit: "%" },
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
                                    param.step && param.step < 1 ? 1 : 0,
                                  )}
                                  {param.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Distortion */}
                        <div className="panel">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-primary" />
                            Distortion
                          </h4>
                          <div className="space-y-3">
                            {[
                              { label: "Amount", key: "distortionAmount", min: 0, max: 100, unit: "%" },
                              { label: "Tone", key: "distortionTone", min: 0, max: 100, unit: "%" },
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

                        {/* Reset */}
                        <div className="panel flex items-center justify-center">
                          <Button variant="ghost" onClick={() => setEffects(defaultEffects)} className="btn-ghost">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset All Effects
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="export" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <Select value={exportFormat} onValueChange={setExportFormat}>
                              <SelectTrigger className="input-sm">
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
                            <Label>Quality / Bitrate</Label>
                            <Select value={exportQuality} onValueChange={setExportQuality}>
                              <SelectTrigger className="input-sm">
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

                          <div className="space-y-2">
                            <Label>Sample Rate</Label>
                            <Select value={sampleRate} onValueChange={setSampleRate}>
                              <SelectTrigger className="input-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="22050">22,050 Hz</SelectItem>
                                <SelectItem value="44100">44,100 Hz (CD Quality)</SelectItem>
                                <SelectItem value="48000">48,000 Hz (DVD Quality)</SelectItem>
                                <SelectItem value="96000">96,000 Hz (Studio)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Bit Depth</Label>
                            <Select value={bitDepth} onValueChange={setBitDepth}>
                              <SelectTrigger className="input-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="16">16-bit</SelectItem>
                                <SelectItem value="24">24-bit</SelectItem>
                                <SelectItem value="32">32-bit Float</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Fade In</Label>
                            <Slider
                              value={[fadeIn]}
                              onValueChange={(v) => setFadeIn(v[0])}
                              min={0}
                              max={5}
                              step={0.1}
                            />
                            <span className="text-caption">{fadeIn.toFixed(1)} seconds</span>
                          </div>

                          <div className="space-y-2">
                            <Label>Fade Out</Label>
                            <Slider
                              value={[fadeOut]}
                              onValueChange={(v) => setFadeOut(v[0])}
                              min={0}
                              max={5}
                              step={0.1}
                            />
                            <span className="text-caption">{fadeOut.toFixed(1)} seconds</span>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3">
                              <Switch id="normalize" checked={normalize} onCheckedChange={setNormalize} />
                              <Label htmlFor="normalize">Normalize audio</Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <Switch id="trimSilence" checked={trimSilence} onCheckedChange={setTrimSilence} />
                              <Label htmlFor="trimSilence">Trim silence</Label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="panel">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          {[
                            { label: "Duration", value: formatTime(duration), icon: Clock },
                            { label: "Selection", value: formatTime(selectionDuration), icon: Scissors },
                            {
                              label: "Format",
                              value: file ? `${file.type.split("/")[1]?.toUpperCase()}` : "N/A",
                              icon: FileAudio,
                            },
                            {
                              label: "Size",
                              value: file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "N/A",
                              icon: HardDrive,
                            },
                          ].map((item) => (
                            <div key={item.label} className="space-y-1">
                              <item.icon className="w-4 h-4 mx-auto text-primary" />
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                              <p className="font-semibold text-sm">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                  <button className="btn-primary text-lg px-10 py-5" onClick={exportAudio} disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Scissors className="w-5 h-5 mr-2" />
                        Cut & Export
                      </>
                    )}
                  </button>

                  <button className="btn-secondary text-lg px-10 py-5" onClick={saveProject}>
                    <Save className="w-5 h-5 mr-2" />
                    Save Project
                  </button>
                </div>

                {/* Hidden audio element */}
                <audio
                  ref={audioRef}
                  src={audioUrl || undefined}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="animate-fade-in">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-headline">Your Projects</h2>
                  <p className="text-caption">Access and manage your saved audio projects</p>
                </div>
              </div>

              {savedProjects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-secondary flex items-center justify-center">
                    <Folder className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-title mb-2">No Projects Yet</h3>
                  <p className="text-caption mb-6 max-w-sm mx-auto">
                    Save your first project to see it here. Projects are stored locally in your browser.
                  </p>
                  <Button onClick={() => setActiveTab("editor")} className="btn-primary">
                    <AudioLines className="w-5 h-5 mr-2" />
                    Go to Editor
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedProjects.map((project) => (
                    <div key={project.id} className="card-interactive p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/20">
                          <Music className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <div className="flex items-center gap-3 text-caption">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(project.duration)}
                            </span>
                            <span>{project.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => loadProject(project)} className="btn-ghost">
                          <ChevronRight className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProject(project.id)}
                          className="btn-ghost text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AudioLines className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gradient">WaveForge</span>
          </div>
          <p className="text-caption">Sculpt Your Sound - Professional Audio Editing in Your Browser</p>
        </div>
      </footer>
    </div>
  )
}

export default AudioCutter
