"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
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
  Undo2,
  Redo2,
  FastForward,
  Rewind,
  BarChart3,
  HelpCircle,
  Lightbulb,
  Clock,
  Save,
  History,
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

interface HistoryState {
  startTime: number
  endTime: number
  bookmarks: AudioBookmark[]
  effects: EffectSettings
}

interface RecentFile {
  name: string
  date: string
  size: string
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

const effectPresets = {
  voice: { eqLow: 2, eqMid: 4, eqHigh: -1, compressorThreshold: -18, compressorRatio: 6 },
  podcast: { eqLow: -2, eqMid: 3, eqHigh: 2, compressorThreshold: -16, compressorRatio: 4 },
  music: { eqLow: 3, eqMid: 0, eqHigh: 3, reverbMix: 20, stereoWidth: 150 },
  bass: { eqLow: 8, eqMid: -2, eqHigh: 0, compressorThreshold: -20, compressorRatio: 3 },
  clarity: { eqLow: -3, eqMid: 2, eqHigh: 5, highpassFreq: 80, compressorThreshold: -18 },
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

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [showTutorial, setShowTutorial] = useState<boolean>(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(128))
  const [showSpectrum, setShowSpectrum] = useState<boolean>(false)
  const [waveformOffset, setWaveformOffset] = useState<number>(0) // Not used in current implementation, but potentially for future scrolling
  const [isDraggingStart, setIsDraggingStart] = useState<boolean>(false)
  const [isDraggingEnd, setIsDraggingEnd] = useState<boolean>(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const currentTimeRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const endTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const hasVisited = localStorage.getItem("modusAudioVisited")
    if (!hasVisited) {
      setShowTutorial(true)
      localStorage.setItem("modusAudioVisited", "true")
    }

    // Load recent files
    const saved = localStorage.getItem("recentFiles")
    if (saved) {
      setRecentFiles(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (!autoSaveEnabled || !file) return

    const autoSaveInterval = setInterval(() => {
      saveProject(true)
    }, 60000) // Auto-save every 60 seconds

    return () => clearInterval(autoSaveInterval)
  }, [autoSaveEnabled, file, projectName, startTime, endTime])

  useEffect(() => {
    if (!showSpectrum || !analyserRef.current || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateSpectrum = () => {
      analyser.getByteFrequencyData(dataArray)
      // Slice to 128 bins for a reasonable spectrum display
      setFrequencyData(new Uint8Array(dataArray.slice(0, 128)))
      animationFrameRef.current = requestAnimationFrame(updateSpectrum)
    }

    updateSpectrum()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [showSpectrum, isPlaying])

  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      startTime,
      endTime,
      bookmarks: [...bookmarks],
      effects: { ...effects },
    }

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)

    // Keep only last 20 states
    if (newHistory.length > 20) {
      newHistory.shift()
    }

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [startTime, endTime, bookmarks, effects, history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setStartTime(prevState.startTime)
      setEndTime(prevState.endTime)
      setBookmarks(prevState.bookmarks)
      setEffects(prevState.effects)
      setHistoryIndex(historyIndex - 1)
      addToast("Undo successful", "info")
    }
  }, [historyIndex, history, addToast])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setStartTime(nextState.startTime)
      setEndTime(nextState.endTime)
      setBookmarks(nextState.bookmarks)
      setEffects(nextState.effects)
      setHistoryIndex(historyIndex + 1)
      addToast("Redo successful", "info")
    }
  }, [historyIndex, history, addToast])

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
      // Ignore if the event target is an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Show help
      if (e.code === "Slash" && e.shiftKey) {
        e.preventDefault()
        setShowKeyboardHelp(true)
        return
      }

      switch (e.code) {
        case "Space":
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft":
          e.preventDefault()
          seekTo(Math.max(0, currentTimeRef.current - (e.shiftKey ? 1 : 5)))
          break
        case "ArrowRight":
          e.preventDefault()
          seekTo(Math.min(duration, currentTimeRef.current + (e.shiftKey ? 1 : 5)))
          break
        case "KeyM":
          setIsMuted(!isMuted)
          break
        case "KeyL":
          setIsLooping(!isLooping)
          break
        case "KeyS":
          // Check for Ctrl/Cmd + S for saving project
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            saveProject()
          } else if (file) {
            // If just 'S' and file exists, set start time
            setStartTime(currentTimeRef.current)
            saveToHistory()
          }
          break
        case "KeyE":
          if (file) {
            setEndTime(currentTimeRef.current)
            saveToHistory()
          }
          break
        case "KeyB":
          if (file) addBookmark()
          break
        case "KeyZ":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
        case "BracketLeft": // '[' key
          setPlaybackSpeed(Math.max(0.25, playbackSpeed - 0.25))
          break
        case "BracketRight": // ']' key
          setPlaybackSpeed(Math.min(2, playbackSpeed + 0.25))
          break
        case "KeyV": // 'V' key
          setShowSpectrum(!showSpectrum)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [duration, isMuted, isLooping, file, playbackSpeed, showSpectrum, undo, redo, saveToHistory])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

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

      const newRecent: RecentFile = {
        name: selectedFile.name,
        date: new Date().toISOString(),
        size: (selectedFile.size / 1024 / 1024).toFixed(2) + " MB",
      }
      // Keep only the last 5 recent files and avoid duplicates
      const updated = [newRecent, ...recentFiles.filter((f) => f.name !== selectedFile.name)].slice(0, 5)
      setRecentFiles(updated)
      localStorage.setItem("recentFiles", JSON.stringify(updated))

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

      setHistory([]) // Clear existing history when loading a new file
      setHistoryIndex(-1)
      saveToHistory()

      setActiveTab("editor")
      addToast("Audio loaded successfully", "success")
    } catch (error) {
      console.error("Error processing file:", error)
      addToast("Failed to load audio file. Please try a different format.", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  const generateWaveformData = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0)
    const samples = 150 // Number of points to represent the waveform
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData: number[] = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      // Calculate the average absolute value for each block
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j])
      }
      filteredData.push(sum / blockSize)
    }

    // Normalize the data to a 0-1 range for consistent display
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
    // Prevent seeking if dragging selection or waveform markers
    if (!duration || isDraggingStart || isDraggingEnd) return

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
    saveToHistory()
    addToast("Bookmark added", "success")
  }

  const applyEffectPreset = (presetName: keyof typeof effectPresets) => {
    const preset = effectPresets[presetName]
    setEffects({ ...effects, ...preset })
    saveToHistory()
    addToast(`Applied ${presetName} preset`, "success")
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
    // Check if the dropped file is an audio file
    if (droppedFile && droppedFile.type.startsWith("audio/")) {
      await processFile(droppedFile)
    } else {
      addToast("Please drop an audio file", "warning")
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

      // Use OfflineAudioContext for non-real-time audio processing
      const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, length, sampleRate)
      const source = offlineContext.createBufferSource()

      // Create a new buffer for the selected segment
      const newBuffer = offlineContext.createBuffer(audioBuffer.numberOfChannels, length, sampleRate)
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        // Copy the relevant part of the audio data
        for (let i = 0; i < length; i++) {
          newData[i] = oldData[startSample + i]
        }
      }

      source.buffer = newBuffer
      source.connect(offlineContext.destination)
      source.start()

      const renderedBuffer = await offlineContext.startRendering()

      // Convert AudioBuffer to WAV blob
      const wavBlob = audioBufferToWav(renderedBuffer)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName || "audio"}_cut.${exportFormat}` // Set default filename
      a.click()
      URL.revokeObjectURL(url) // Clean up the object URL

      addToast("Export complete!", "success")
    } catch (error) {
      console.error("Export failed:", error)
      addToast("Export failed. Please try again.", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to convert AudioBuffer to WAV Blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM format
    const bitDepth = 16 // 16-bit audio
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample
    const dataLength = buffer.length * blockAlign
    const bufferLength = 44 + dataLength // 44 bytes for WAV header
    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    // Helper to write strings to DataView
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    // Write WAV header
    writeString(0, "RIFF")
    view.setUint32(4, 36 + dataLength, true) // File size - 8
    writeString(8, "WAVE")
    writeString(12, "fmt ") // Format chunk identifier
    view.setUint32(16, 16, true) // Format chunk size (16 for PCM)
    view.setUint16(20, format, true) // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true) // Number of channels
    view.setUint32(24, sampleRate, true) // Sample rate
    view.setUint32(28, sampleRate * blockAlign, true) // Byte rate
    view.setUint16(32, blockAlign, true) // Block align
    view.setUint16(34, bitDepth, true) // Bits per sample
    writeString(36, "data") // Data chunk identifier
    view.setUint32(40, dataLength, true) // Subchunk2 size (data size)

    // Write audio data
    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        // Get sample value, clamp between -1 and 1, then scale to 16-bit integer
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true) // 0x7fff is the max value for a signed 16-bit integer
        offset += 2 // 2 bytes per sample
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  const saveProject = (isAutoSave = false) => {
    if (!file || !audioUrl) {
      if (!isAutoSave) addToast("No audio file to save", "warning")
      return
    }

    const project: SavedProject = {
      id: Date.now().toString(),
      name: projectName || file.name.replace(/\.[^/.]+$/, ""),
      date: new Date().toISOString().split("T")[0],
      duration,
      startTime: startTimeRef.current,
      endTime: endTimeRef.current,
      audioUrl, // Note: Storing URL might be problematic if the object URL is revoked. For persistent storage, consider uploading to a server or using IndexedDB.
    }

    // Update or add project
    const existingIndex = savedProjects.findIndex((p) => p.name === project.name)
    if (existingIndex >= 0) {
      const updated = [...savedProjects]
      updated[existingIndex] = project
      setSavedProjects(updated)
    } else {
      setSavedProjects([project, ...savedProjects])
    }

    setLastSaved(new Date())
    if (!isAutoSave) addToast("Project saved", "success")
  }

  const loadProject = async (project: SavedProject) => {
    // Reset all states before loading a new project
    resetFile()

    setAudioUrl(project.audioUrl)
    setDuration(project.duration)
    setStartTime(project.startTime)
    setEndTime(project.endTime)
    startTimeRef.current = project.startTime
    endTimeRef.current = project.endTime
    setProjectName(project.name)

    try {
      // Fetch the audio data from the stored URL
      const response = await fetch(project.audioUrl)
      if (!response.ok) throw new Error("Network response was not ok")
      const arrayBuffer = await response.arrayBuffer()

      // Re-initialize AudioContext and decode audio data
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)

      // Regenerate waveform and set analyser
      generateWaveformData(buffer)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      // Initialize history for the loaded project
      setHistory([])
      setHistoryIndex(-1)
      saveToHistory() // Save initial state of loaded project

      setActiveTab("editor")
      addToast("Project loaded successfully", "success")
    } catch (error) {
      console.error("Error loading project:", error)
      addToast("Error loading project. The audio file might be missing or corrupted.", "error")
      // Optionally clear the project if loading fails
      // resetFile();
    }
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
    setHistory([]) // Clear history
    setHistoryIndex(-1) // Reset history index
    setPlaybackSpeed(1) // Reset playback speed
    setWaveformOffset(0) // Reset waveform scroll offset
    setIsDraggingStart(false) // Reset drag states
    setIsDraggingEnd(false)
    setActiveTab("home") // Return to home tab
    // Revoke object URL if it exists to free up memory
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
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

      {showTutorial && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-elevated max-w-lg w-full p-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Welcome to Modus Audio</h2>
                <p className="text-xs text-muted-foreground">Your professional audio editing suite</p>
              </div>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <p>Get started in seconds:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Upload or drag & drop your audio file</li>
                <li>Use the waveform to select the section you want</li>
                <li>Apply professional effects from the Effects tab</li>
                <li>Export in your preferred format</li>
              </ol>
              <p className="text-xs bg-primary/10 border border-primary/20 rounded-lg p-3 mt-4">
                <strong className="text-primary">Pro Tip:</strong> Press{" "}
                <kbd className="px-1.5 py-0.5 bg-card rounded text-[10px] font-mono">?</kbd> anytime to see all keyboard
                shortcuts!
              </p>
            </div>

            <Button onClick={() => setShowTutorial(false)} className="btn-primary w-full">
              Got it, let's start!
            </Button>
          </div>
        </div>
      )}

      {showKeyboardHelp && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="card-elevated max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(false)} className="btn-icon">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                {
                  category: "Playback",
                  shortcuts: [
                    { key: "Space", action: "Play / Pause" },
                    { key: "← →", action: "Skip 5s" },
                    { key: "Shift + ← →", action: "Skip 1s" },
                    { key: "[ ]", action: "Playback speed" },
                    { key: "M", action: "Mute" },
                    { key: "L", action: "Loop" },
                  ],
                },
                {
                  category: "Editing",
                  shortcuts: [
                    { key: "S", action: "Set start" },
                    { key: "E", action: "Set end" },
                    { key: "B", action: "Add bookmark" },
                    { key: "Cmd/Ctrl + Z", action: "Undo" },
                    { key: "Cmd/Ctrl + Shift + Z", action: "Redo" },
                    { key: "Cmd/Ctrl + S", action: "Save project" },
                  ],
                },
                {
                  category: "View",
                  shortcuts: [
                    { key: "V", action: "Toggle spectrum" },
                    { key: "?", action: "Show this help" },
                  ],
                },
              ].map((section, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-2 text-primary">{section.category}</h3>
                  <div className="space-y-1.5">
                    {section.shortcuts.map((shortcut, j) => (
                      <div key={j} className="flex items-center justify-between">
                        <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">{shortcut.key}</kbd>
                        <span className="text-muted-foreground text-xs">{shortcut.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            {file && activeTab !== "home" && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-[1px] h-6">
                  {waveformData.slice(0, 30).map((value, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-primary/60 rounded-full"
                      style={{ height: `${Math.max(4, value * 100)}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono">{formatTime(currentTime)}</span>
              </div>
            )}

            {file && (
              <>
                <span className="badge badge-primary text-xs hidden sm:inline-flex">
                  {file.name.length > 15 ? file.name.slice(0, 15) + "..." : file.name}
                </span>
                {lastSaved && (
                  <span className="text-[10px] text-muted-foreground hidden lg:inline">
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKeyboardHelp(true)}
              className="btn-icon"
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>

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
                isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]",
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

            {recentFiles.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Recent Files</span>
                </div>
                <div className="space-y-2">
                  {recentFiles.map((recent, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Music2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{recent.name}</p>
                          <p className="text-[10px] text-muted-foreground">{recent.size}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(recent.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features Grid - Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Scissors, label: "Precision Cut", color: "from-violet-500 to-purple-500" },
                { icon: Sliders, label: "Pro Effects", color: "from-pink-500 to-rose-500" },
                { icon: Waves, label: "Waveform View", color: "from-blue-500 to-cyan-500" },
                { icon: Download, label: "Multi-Format", color: "from-emerald-500 to-teal-500" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="card p-4 text-center group hover:border-primary/30 transition-all hover:-translate-y-1"
                >
                  <div
                    className={cn(
                      "w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3",
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
                  <kbd className="px-1.5 py-0.5 bg-card rounded text-[10px] font-mono">?</kbd>
                  <span>Show Help</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR TAB */}
        {activeTab === "editor" && file && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="input-field text-sm font-medium w-40"
                  placeholder="Project name"
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="btn-icon"
                    title="Undo (Cmd+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="btn-icon"
                    title="Redo (Cmd+Shift+Z)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => saveProject()} className="btn-ghost text-xs">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFile} className="btn-ghost text-xs text-destructive">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Close
                </Button>
              </div>
            </div>

            {showSpectrum && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Live Spectrum</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowSpectrum(false)} className="btn-icon p-1">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="h-20 bg-secondary/50 rounded-lg flex items-end justify-center gap-[2px] p-2">
                  {/* Render spectrum bars from frequencyData */}
                  {Array.from(frequencyData.slice(0, 64)).map(
                    (
                      value,
                      i, // Limit to 64 bars for better visibility
                    ) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-primary to-accent rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, (value / 255) * 100)}%` }} // Normalize value to 0-100% height
                      />
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Waveform */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Waveform</span>
                  <span className="badge badge-primary text-[10px]">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!showSpectrum && ( // Only show spectrum toggle if spectrum is not visible
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSpectrum(true)}
                      className="btn-icon p-1.5"
                      title="Show spectrum (V)"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                  )}
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
                className="relative h-32 bg-secondary/50 rounded-xl overflow-hidden cursor-pointer"
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

                <div
                  className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize z-20 group"
                  style={{ left: `${(startTime / duration) * 100}%` }}
                  onMouseDown={() => setIsDraggingStart(true)}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full group-hover:scale-125 transition-transform" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Start: {formatTime(startTime)}
                  </div>
                </div>

                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-20 group"
                  style={{ left: `${(endTime / duration) * 100}%` }}
                  onMouseDown={() => setIsDraggingEnd(true)}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full group-hover:scale-125 transition-transform" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    End: {formatTime(endTime)}
                  </div>
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-accent z-10"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-accent rounded-full shadow-lg shadow-accent/50" />
                </div>

                {/* Bookmarks */}
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="absolute top-0 bottom-0 w-0.5 cursor-pointer z-20 group"
                    style={{ left: `${(bookmark.time / duration) * 100}%`, backgroundColor: bookmark.color }}
                    onClick={(e) => {
                      e.stopPropagation()
                      seekTo(bookmark.time)
                    }}
                  >
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full group-hover:scale-150 transition-transform"
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

            <div className="card p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => seekTo(startTime)} className="btn-icon">
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => seekTo(Math.max(0, currentTime - 5))}
                    className="btn-icon"
                  >
                    <Rewind className="w-4 h-4" />
                  </Button>

                  <Button
                    onClick={togglePlayPause}
                    className="btn-primary w-12 h-12 rounded-full p-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => seekTo(Math.min(duration, currentTime + 5))}
                    className="btn-icon"
                  >
                    <FastForward className="w-4 h-4" />
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

                {/* Playback Speed Control */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs text-muted-foreground w-20">Speed:</span>
                  <div className="flex items-center gap-2">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                          playbackSpeed === speed
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "bg-secondary hover:bg-secondary/80",
                        )}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Selection</span>
                <span className="badge badge-accent text-[10px] ml-auto">{formatTime(endTime - startTime)}</span>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStartTime(currentTime)
                        saveToHistory()
                      }}
                      className="btn-icon"
                      title="Set start (S)"
                    >
                      <BookmarkIcon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="text" value={formatTime(endTime)} readOnly className="input-field text-sm font-mono" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEndTime(currentTime)
                        saveToHistory()
                      }}
                      className="btn-icon"
                      title="Set end (E)"
                    >
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
                      saveToHistory()
                    },
                  },
                  {
                    label: "Last 10s",
                    action: () => {
                      setStartTime(Math.max(0, duration - 10))
                      setEndTime(duration)
                      saveToHistory()
                    },
                  },
                  {
                    label: "Select All",
                    action: () => {
                      setStartTime(0)
                      setEndTime(duration)
                      saveToHistory()
                    },
                  },
                  {
                    label: "Reset",
                    action: () => {
                      setStartTime(0)
                      setEndTime(duration)
                      saveToHistory()
                    },
                  },
                ].map((preset, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={preset.action}
                    className="btn-ghost text-xs hover:scale-105 transition-transform"
                  >
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
                    <span className="badge badge-primary text-[10px]">{bookmarks.length}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addBookmark}
                    className="btn-ghost text-xs"
                    title="Add bookmark (B)"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bookmarks.map((bookmark) => (
                    <button
                      key={bookmark.id}
                      onClick={() => seekTo(bookmark.time)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-lg text-xs hover:bg-secondary/80 transition-all hover:scale-105 active:scale-95"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bookmark.color }} />
                      <span className="font-mono">{formatTime(bookmark.time)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setBookmarks(bookmarks.filter((b) => b.id !== bookmark.id))
                          saveToHistory()
                        }}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
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
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Quick Presets</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(effectPresets).map((preset) => (
                  <Button
                    key={preset}
                    variant="ghost"
                    size="sm"
                    onClick={() => applyEffectPreset(preset as keyof typeof effectPresets)}
                    className="btn-ghost text-xs capitalize hover:scale-105 transition-transform"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

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
              <div className="card p-4 hover:border-primary/30 transition-colors">
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
              <div className="card p-4 hover:border-primary/30 transition-colors">
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
              <div className="card p-4 hover:border-primary/30 transition-colors">
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
              <div className="card p-4 hover:border-primary/30 transition-colors">
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
              <div className="card p-4 hover:border-primary/30 transition-colors">
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
              <div className="card p-4 hover:border-primary/30 transition-colors">
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
            <Button
              variant="ghost"
              onClick={() => {
                setEffects(defaultEffects)
                saveToHistory()
                addToast("Effects reset", "info")
              }}
              className="btn-ghost w-full hover:scale-105 transition-transform"
            >
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

                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                  <div>
                    <Label className="text-xs font-medium">Normalize Audio</Label>
                    <p className="text-[10px] text-muted-foreground">Maximize volume without clipping</p>
                  </div>
                  <Switch checked={normalize} onCheckedChange={setNormalize} />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                  <div>
                    <Label className="text-xs font-medium">Trim Silence</Label>
                    <p className="text-[10px] text-muted-foreground">Remove silence from start/end</p>
                  </div>
                  <Switch checked={trimSilence} onCheckedChange={setTrimSilence} />
                </div>
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Selection Duration</p>
                <p className="text-3xl font-bold text-gradient">{formatTime(endTime - startTime)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  From {formatTime(startTime)} to {formatTime(endTime)}
                </p>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Format: {exportFormat.toUpperCase()}</span>
                  <span>•</span>
                  <span>Quality: {exportQuality}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={exportAudio}
              disabled={isProcessing}
              className="btn-primary w-full hover:scale-105 transition-transform active:scale-95"
            >
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

            <div className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <Label className="text-xs font-medium">Auto-Save</Label>
                  <p className="text-[10px] text-muted-foreground">Automatically save every minute</p>
                </div>
              </div>
              <Switch checked={autoSaveEnabled} onCheckedChange={setAutoSaveEnabled} />
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
                  <div
                    key={project.id}
                    className="card p-3 flex items-center justify-between gap-3 hover:border-primary/30 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadProject(project)}
                        className="btn-icon hover:scale-110 transition-transform"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(project.id)}
                        className="btn-icon text-destructive hover:scale-110 transition-transform"
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
            <Button
              className="btn-primary mt-4 hover:scale-105 transition-transform"
              onClick={() => setActiveTab("home")}
            >
              <Upload className="w-4 h-4 mr-2" />
              Load Audio
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg shadow-2xl">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => !item.disabled && setActiveTab(item.id)}
                disabled={item.disabled}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] relative",
                  activeTab === item.id
                    ? "text-primary bg-primary/10 scale-110"
                    : item.disabled
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-105",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
