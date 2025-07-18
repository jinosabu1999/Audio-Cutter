"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Play,
  Pause,
  Scissors,
  RefreshCw,
  VolumeX,
  Volume2,
  Clock,
  Sparkles,
  Layers,
  X,
  Info,
  Folder,
  Trash2,
  ChevronRight,
  Wand2,
  Download,
  Bookmark,
  Music,
  Minus,
  Plus,
  Keyboard,
  Settings,
  Save,
  FileText,
  BarChart2,
} from "lucide-react"
import { formatTime } from "@/lib/time-utils"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/ui/theme-context"
import { useToast } from "@/components/ui/toast-provider"
import { AudioVisualizer } from "@/components/ui/audio-visualizer"
import { BookmarkManager } from "@/components/ui/bookmark-manager"

interface SavedProject {
  id: string
  name: string
  date: string
  duration: number
  startTime: number
  endTime: number
  audioUrl: string
}

interface ExportPreset {
  id: string
  name: string
  format: string
  quality: string
  normalize: boolean
  fadeInOut: boolean
}

export default function AudioCutter() {
  const { theme } = useTheme()
  const { addToast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [selectedEffect, setSelectedEffect] = useState<string>("none")
  const [exportFormat, setExportFormat] = useState<string>("mp3")
  const [exportQuality, setExportQuality] = useState<string>("high")
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [showEffects, setShowEffects] = useState<boolean>(false)
  const [showHelpPopup, setShowHelpPopup] = useState<boolean>(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState<boolean>(false)
  const [cutCompleted, setCutCompleted] = useState<boolean>(false)
  const [cutAudioUrl, setCutAudioUrl] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>("")
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [showSavedProjects, setShowSavedProjects] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>("editor")
  const [visualizerData, setVisualizerData] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false)
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [showBatchProcessing, setShowBatchProcessing] = useState<boolean>(false)
  const [showExportPresets, setShowExportPresets] = useState<boolean>(false)
  const [exportPresets, setExportPresets] = useState<ExportPreset[]>([
    {
      id: "preset_1",
      name: "High Quality MP3",
      format: "mp3",
      quality: "high",
      normalize: true,
      fadeInOut: false,
    },
    {
      id: "preset_2",
      name: "Podcast Ready",
      format: "mp3",
      quality: "medium",
      normalize: true,
      fadeInOut: true,
    },
    {
      id: "preset_3",
      name: "Lossless WAV",
      format: "wav",
      quality: "ultra",
      normalize: false,
      fadeInOut: false,
    },
  ])
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [normalize, setNormalize] = useState<boolean>(false)
  const [fadeInOut, setFadeInOut] = useState<boolean>(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const startTimeInputRef = useRef<HTMLInputElement>(null)
  const endTimeInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Load saved projects from localStorage
  useEffect(() => {
    const savedProjectsData = localStorage.getItem("sonicSculptorProjects")
    if (savedProjectsData) {
      try {
        setSavedProjects(JSON.parse(savedProjectsData))
      } catch (e) {
        console.error("Error loading saved projects:", e)
      }
    }
  }, [])

  // Check if this is the first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem("audioSculptorVisited")
    if (!hasVisited) {
      setShowHelpPopup(true)
      localStorage.setItem("audioSculptorVisited", "true")
    }
  }, [])

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  // Process the uploaded file
  const processFile = (selectedFile: File) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    if (cutAudioUrl) {
      URL.revokeObjectURL(cutAudioUrl)
      setCutAudioUrl(null)
    }

    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setAudioUrl(url)
    setProjectName(selectedFile.name.split(".")[0])

    // Reset states
    setCurrentTime(0)
    setStartTime(0)
    setIsPlaying(false)
    setCutCompleted(false)

    // Create audio element to get duration
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      setDuration(audio.duration)
      setEndTime(audio.duration)

      // Generate random visualizer data for demo
      const randomData = Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)
      setVisualizerData(randomData)

      addToast("Audio file loaded successfully!", "success")
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith("audio/")) {
      processFile(droppedFile)
    }
  }

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      // Always reset to start time when play is clicked
      audioRef.current.currentTime = startTime
      setCurrentTime(startTime)
      audioRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  const updateCurrentTime = (newTime: number, updateType?: "startTime" | "endTime") => {
    if (!audioRef.current) return

    const clampedTime = Math.max(0, Math.min(newTime, duration))

    if (updateType === "startTime") {
      // Update start time
      setStartTime(clampedTime)
      // If current time is before new start time, update it too
      if (currentTime < clampedTime) {
        setCurrentTime(clampedTime)
        audioRef.current.currentTime = clampedTime
      }
    } else if (updateType === "endTime") {
      // Update end time
      setEndTime(clampedTime)
      // If current time is after new end time, update it too
      if (currentTime > clampedTime) {
        setCurrentTime(clampedTime)
        audioRef.current.currentTime = clampedTime
      }
    } else {
      // Update current time (playhead)
      setCurrentTime(clampedTime)
      audioRef.current.currentTime = clampedTime
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return

    const newMuteState = !isMuted
    setIsMuted(newMuteState)
    audioRef.current.muted = newMuteState
  }

  // Save project
  const saveProject = () => {
    if (!file || !audioUrl) return

    const projectId = `project_${Date.now()}`
    const newProject: SavedProject = {
      id: projectId,
      name: projectName || file.name.split(".")[0],
      date: new Date().toLocaleDateString(),
      duration,
      startTime,
      endTime,
      audioUrl,
    }

    const updatedProjects = [...savedProjects, newProject]
    setSavedProjects(updatedProjects)
    localStorage.setItem("sonicSculptorProjects", JSON.stringify(updatedProjects))

    addToast(`Project "${newProject.name}" saved successfully!`, "success")
  }

  // Load project
  const loadProject = (project: SavedProject) => {
    setAudioUrl(project.audioUrl)
    setDuration(project.duration)
    setStartTime(project.startTime)
    setEndTime(project.endTime)
    setProjectName(project.name)
    setCurrentTime(project.startTime)
    setCutCompleted(false)
    setActiveTab("editor")

    // Generate random visualizer data for demo
    const randomData = Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)
    setVisualizerData(randomData)

    // Create a new audio element
    const audio = new Audio(project.audioUrl)
    if (audioRef.current) {
      audioRef.current.src = project.audioUrl
      audioRef.current.currentTime = project.startTime
    }

    addToast(`Project "${project.name}" loaded successfully!`, "info")
  }

  // Delete project
  const deleteProject = (projectId: string) => {
    const projectToDelete = savedProjects.find((p) => p.id === projectId)
    const updatedProjects = savedProjects.filter((project) => project.id !== projectId)
    setSavedProjects(updatedProjects)
    localStorage.setItem("sonicSculptorProjects", JSON.stringify(updatedProjects))

    if (projectToDelete) {
      addToast(`Project "${projectToDelete.name}" deleted`, "info")
    }
  }

  // Apply export preset
  const applyPreset = (presetId: string) => {
    const preset = exportPresets.find((p) => p.id === presetId)
    if (preset) {
      setExportFormat(preset.format)
      setExportQuality(preset.quality)
      setNormalize(preset.normalize)
      setFadeInOut(preset.fadeInOut)
      setSelectedPreset(presetId)
      addToast(`Applied preset: ${preset.name}`, "info")
    }
  }

  // Export the cut audio
  const exportAudio = async () => {
    if (!file || !audioUrl) return

    setIsProcessing(true)
    setCutCompleted(false)

    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current

      // Fetch the audio file
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Calculate the start and end samples
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(startTime * sampleRate)
      const endSample = Math.floor(endTime * sampleRate)
      const frameCount = endSample - startSample

      // Create a new buffer for the cut portion
      const cutBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, frameCount, sampleRate)

      // Copy the data from the original buffer to the cut buffer
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel)
        const cutData = cutBuffer.getChannelData(channel)

        for (let i = 0; i < frameCount; i++) {
          cutData[i] = originalData[startSample + i]
        }
      }

      // Apply fade in/out if enabled
      if (fadeInOut) {
        const fadeLength = Math.min(sampleRate * 0.5, frameCount / 10) // 0.5 second fade or 10% of audio length

        for (let channel = 0; channel < cutBuffer.numberOfChannels; channel++) {
          const data = cutBuffer.getChannelData(channel)

          // Fade in
          for (let i = 0; i < fadeLength; i++) {
            const fadeInFactor = i / fadeLength
            data[i] *= fadeInFactor
          }

          // Fade out
          for (let i = 0; i < fadeLength; i++) {
            const fadeOutFactor = 1 - i / fadeLength
            data[frameCount - 1 - i] *= fadeOutFactor
          }
        }
      }

      // Apply normalization if enabled
      if (normalize) {
        let maxValue = 0

        // Find the maximum value in the buffer
        for (let channel = 0; channel < cutBuffer.numberOfChannels; channel++) {
          const data = cutBuffer.getChannelData(channel)
          for (let i = 0; i < frameCount; i++) {
            maxValue = Math.max(maxValue, Math.abs(data[i]))
          }
        }

        // Apply normalization if needed
        if (maxValue > 0 && maxValue < 1) {
          const normalizationFactor = 0.95 / maxValue // Leave a little headroom

          for (let channel = 0; channel < cutBuffer.numberOfChannels; channel++) {
            const data = cutBuffer.getChannelData(channel)
            for (let i = 0; i < frameCount; i++) {
              data[i] *= normalizationFactor
            }
          }
        }
      }

      // Convert the cut buffer to WAV format
      const offlineContext = new OfflineAudioContext(cutBuffer.numberOfChannels, cutBuffer.length, cutBuffer.sampleRate)

      const source = offlineContext.createBufferSource()
      source.buffer = cutBuffer
      source.connect(offlineContext.destination)
      source.start(0)

      const renderedBuffer = await offlineContext.startRendering()

      // Convert to desired format
      const audioData = audioBufferToWav(renderedBuffer)

      // Create a blob and URL for the cut audio
      const blob = new Blob([audioData], { type: "audio/wav" })

      if (cutAudioUrl) {
        URL.revokeObjectURL(cutAudioUrl)
      }

      const cutUrl = URL.createObjectURL(blob)
      setCutAudioUrl(cutUrl)
      setCutCompleted(true)

      // Create a download link
      const fileName = `cut_${startTime.toFixed(2)}_${endTime.toFixed(2)}_${file.name.split(".")[0]}.${exportFormat}`
      const a = document.createElement("a")
      a.href = cutUrl
      a.download = fileName
      a.click()

      addToast("Audio cut and exported successfully!", "success")
    } catch (error) {
      console.error("Error cutting audio:", error)
      addToast("Error cutting audio. Please try again.", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Convert AudioBuffer to WAV format
  function audioBufferToWav(buffer: AudioBuffer) {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2
    const sampleRate = buffer.sampleRate

    const wav = new DataView(new ArrayBuffer(44 + length))

    // RIFF chunk descriptor
    writeString(wav, 0, "RIFF")
    wav.setUint32(4, 36 + length, true)
    writeString(wav, 8, "WAVE")

    // FMT sub-chunk
    writeString(wav, 12, "fmt ")
    wav.setUint32(16, 16, true) // subchunk1size
    wav.setUint16(20, 1, true) // PCM format
    wav.setUint16(22, numOfChan, true) // num of channels
    wav.setUint32(24, sampleRate, true) // sample rate
    wav.setUint32(28, sampleRate * 2 * numOfChan, true) // byte rate
    wav.setUint16(32, numOfChan * 2, true) // block align
    wav.setUint16(34, 16, true) // bits per sample

    // Data sub-chunk
    writeString(wav, 36, "data")
    wav.setUint32(40, length, true)

    // Write the PCM samples
    const dataOffset = 44
    let offset = dataOffset

    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        wav.setInt16(offset, int16, true)
        offset += 2
      }
    }

    return wav.buffer
  }

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // Update audio time during playback
  useEffect(() => {
    if (!audioRef.current) return

    const handleTimeUpdate = () => {
      if (!audioRef.current) return

      const current = audioRef.current.currentTime
      setCurrentTime(current)

      // Stop or loop playback if we reach the end time
      if (current >= endTime) {
        audioRef.current.pause()
        setIsPlaying(false)
        audioRef.current.currentTime = endTime
        setCurrentTime(endTime)
      }
    }

    audioRef.current.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", handleTimeUpdate)
      }
    }
  }, [endTime, isPlaying])

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (cutAudioUrl) {
        URL.revokeObjectURL(cutAudioUrl)
      }
    }
  }, [audioUrl, cutAudioUrl])

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!file) return

      switch (e.key) {
        case " ": // Space bar
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft": // Left arrow
          if (audioRef.current) {
            const newTime = Math.max(startTime, currentTime - 5)
            setCurrentTime(newTime)
            audioRef.current.currentTime = newTime
          }
          break
        case "ArrowRight": // Right arrow
          if (audioRef.current) {
            const newTime = Math.min(endTime, currentTime + 5)
            setCurrentTime(newTime)
            audioRef.current.currentTime = newTime
          }
          break
        case "s": // Set start point
          if (audioRef.current) {
            const newStartTime = currentTime
            if (newStartTime < endTime) {
              setStartTime(newStartTime)
              addToast("Start point set", "info")
            }
          }
          break
        case "e": // Set end point
          if (audioRef.current) {
            const newEndTime = currentTime
            if (newEndTime > startTime) {
              setEndTime(newEndTime)
              addToast("End point set", "info")
            }
          }
          break
        case "m": // Toggle mute
          toggleMute()
          break
        case "k": // Show keyboard shortcuts
          setShowKeyboardShortcuts(!showKeyboardShortcuts)
          break
        case "c": // Cut and export (with Ctrl)
          if (e.ctrlKey) {
            e.preventDefault()
            exportAudio()
          }
          break
        case "=": // Plus key
        case "+":
          e.preventDefault()
          setZoomLevel(Math.min(4, zoomLevel + 0.5))
          break
        case "-": // Minus key
          e.preventDefault()
          setZoomLevel(Math.max(1, zoomLevel - 0.5))
          break
        case "a": // Set start to beginning
          setStartTime(0)
          addToast("Start time set to beginning", "info")
          break
        case "z": // Set end to end
          setEndTime(duration)
          addToast("End time set to end", "info")
          break
        case "x": // Select all
          setStartTime(0)
          setEndTime(duration)
          addToast("Selected entire audio", "info")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentTime, startTime, endTime, file, duration, zoomLevel])

  const jumpToBookmark = (time: number) => {
    if (audioRef.current) {
      const clampedTime = Math.max(0, Math.min(time, duration))
      setCurrentTime(clampedTime)
      audioRef.current.currentTime = clampedTime
    }
  }

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((file) => file.type.startsWith("audio/"))
      setBatchFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeBatchFile = (index: number) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const processBatchFiles = async () => {
    if (batchFiles.length === 0) return

    setIsProcessing(true)
    addToast(`Processing ${batchFiles.length} files...`, "info")

    try {
      // In a real app, you'd process each file here
      // For demo, we'll just simulate processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      addToast(`Successfully processed ${batchFiles.length} files!`, "success")
      setBatchFiles([])
    } catch (error) {
      console.error("Error processing batch files:", error)
      addToast("Error processing files. Please try again.", "error")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Help Popup */}
      {showHelpPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="card max-w-md w-full mx-4 animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="title-large flex items-center text-slate-800 dark:text-white">
                  <Info className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Time Format Guide
                </h3>
                <button
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => setShowHelpPopup(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="space-y-3 body-medium text-slate-700 dark:text-slate-300">
                <p>When editing the start and end times, use the following format:</p>
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md font-mono text-sm border border-slate-200 dark:border-slate-600">
                  <strong>mm:ss.ms</strong> - minutes:seconds.milliseconds
                </div>
                <p>Examples:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">00:30.00</code> - 30 seconds
                  </li>
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">01:15.50</code> - 1 minute, 15.5
                    seconds
                  </li>
                  <li>
                    <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">00:05.75</code> - 5.75 seconds
                  </li>
                </ul>
              </div>
              <button className="btn-primary w-full mt-6" onClick={() => setShowHelpPopup(false)}>
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Popup */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="card max-w-md w-full mx-4 animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="title-large flex items-center text-slate-800 dark:text-white">
                  <Keyboard className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Keyboard Shortcuts
                </h3>
                <button
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => setShowKeyboardShortcuts(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">Space</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Play/Pause</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">←/→</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Skip 5 seconds</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">S</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Set start point</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">E</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Set end point</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">M</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Toggle mute</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">K</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Show shortcuts</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">Ctrl+C</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Cut & Export</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">A</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Set start to beginning</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">Z</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Set end to end</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">X</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Select all audio</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                    <span className="font-mono text-purple-600 dark:text-purple-400">+/-</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">Zoom in/out</span>
                  </div>
                </div>
              </div>
              <button className="btn-primary w-full mt-6" onClick={() => setShowKeyboardShortcuts(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger
            value="editor"
            className="text-slate-800 dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg"
          >
            Audio Editor
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="text-slate-800 dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg"
          >
            Saved Projects
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="mt-0">
          <div
            className={cn(
              "card mb-8 transition-all duration-500",
              isDragging ? "border-dashed border-2 border-purple-500 dark:border-purple-400" : "",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-8">
              {!file ? (
                <div className="text-center">
                  <div className="relative w-full max-w-md mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-8 shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-sm"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 animate-pulse"></div>

                    <div className="relative">
                      <div className="w-36 h-36 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 dark:from-purple-400/30 dark:to-indigo-400/30 flex items-center justify-center animate-float shadow-lg">
                        <div className="relative">
                          <Music className="w-20 h-20 text-purple-600 dark:text-purple-400" />
                          <div className="absolute inset-0 bg-purple-500 dark:bg-purple-400 opacity-20 blur-xl rounded-full animate-pulse-glow"></div>
                        </div>
                      </div>

                      <h2 className="headline-medium mb-3 text-slate-800 dark:text-white font-bold">
                        Upload Your Audio
                      </h2>
                      <p className="body-large text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
                        Drag and drop your audio file here or click to browse
                      </p>

                      <button
                        className="relative overflow-hidden group px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-500 dark:to-indigo-500 text-white font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={() => document.getElementById("audio-upload")?.click()}
                      >
                        <span className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:-translate-x-[50%] transition-transform duration-1000 ease-in-out animate-shimmer"></span>
                        <span className="relative flex items-center justify-center">
                          <Upload className="mr-2 h-6 w-6" />
                          Select Audio File
                        </span>
                      </button>

                      <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                        Supports MP3, WAV, OGG, and other audio formats
                      </div>
                    </div>
                  </div>

                  <input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                    <Badge
                      variant="outline"
                      className="px-3 py-1 text-sm bg-purple-500/10 dark:bg-purple-400/20 border-purple-500/30 dark:border-purple-400/30 text-purple-600 dark:text-purple-400"
                    >
                      {file.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      onClick={() => {
                        setFile(null)
                        setAudioUrl(null)
                        if (cutAudioUrl) {
                          URL.revokeObjectURL(cutAudioUrl)
                          setCutAudioUrl(null)
                        }
                        setDuration(0)
                        setCurrentTime(0)
                        setStartTime(0)
                        setEndTime(0)
                        setIsPlaying(false)
                        setCutCompleted(false)
                        setVisualizerData([])
                      }}
                    >
                      Change
                    </Button>
                  </div>

                  {/* Project Name */}
                  <div className="mb-6">
                    <Label
                      htmlFor="project-name"
                      className="text-sm text-slate-700 dark:text-slate-300 mb-1 block text-left"
                    >
                      Project Name
                    </Label>
                    <Input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="input"
                      placeholder="Enter project name"
                    />
                  </div>

                  {/* Audio Player */}
                  <audio
                    ref={audioRef}
                    src={audioUrl || undefined}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  {/* Audio Visualizer */}
                  <div className="card mb-6">
                    <div className="p-4">
                      <AudioVisualizer
                        data={visualizerData}
                        currentTime={currentTime}
                        duration={duration}
                        startTime={startTime}
                        endTime={endTime}
                        onTimeUpdate={(time, updateType) => updateCurrentTime(time, updateType)}
                        isPlaying={isPlaying}
                        zoomLevel={zoomLevel}
                      />
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                          disabled={zoomLevel <= 1}
                          className="text-slate-600 dark:text-slate-300"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-slate-600 dark:text-slate-300">Zoom: {zoomLevel}x</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
                          disabled={zoomLevel >= 4}
                          className="text-slate-600 dark:text-slate-300"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300 mt-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <button className="btn-primary rounded-full p-3" onClick={togglePlayPause}>
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </button>

                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        onClick={toggleMute}
                      >
                        {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                      </Button>
                    </div>
                  </div>

                  {/* Time Editor Controls - Simplified */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-white text-center">
                      Edit Time Range
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Start Time Editor - Improved with milliseconds */}
                      <div className="card p-4 bg-gradient-to-r from-purple-500/10 to-purple-500/20 dark:from-purple-400/10 dark:to-purple-400/20 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-purple-600 dark:bg-purple-400 flex items-center justify-center mr-2">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium text-slate-800 dark:text-white">Start Time</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-3">
                          {/* Minutes */}
                          <div className="flex flex-col items-center">
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMinutes = Math.floor(startTime / 60) + 1
                                const newTime = newMinutes * 60 + (startTime % 60)
                                if (newTime < endTime) {
                                  updateCurrentTime(newTime, "startTime")
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={Math.floor(startTime / 60)}
                              onChange={(e) => {
                                const newMinutes = Number.parseInt(e.target.value) || 0
                                const newTime = newMinutes * 60 + (startTime % 60)
                                if (newTime < endTime) {
                                  updateCurrentTime(newTime, "startTime")
                                }
                              }}
                              className="w-12 h-12 text-center py-2 font-mono text-lg bg-white dark:bg-slate-800 border-2 border-purple-500/50 dark:border-purple-400/50 rounded-lg text-slate-900 dark:text-white my-1"
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMinutes = Math.max(0, Math.floor(startTime / 60) - 1)
                                const newTime = newMinutes * 60 + (startTime % 60)
                                updateCurrentTime(newTime, "startTime")
                              }}
                            >
                              <Minus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Min</span>
                          </div>

                          <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 self-center mt-1">
                            :
                          </span>

                          {/* Seconds */}
                          <div className="flex flex-col items-center">
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newSeconds = Math.min(59, Math.floor(startTime % 60) + 1)
                                const newTime = Math.floor(startTime / 60) * 60 + newSeconds + (startTime % 1)
                                if (newTime < endTime) {
                                  updateCurrentTime(newTime, "startTime")
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={Math.floor(startTime % 60)}
                              onChange={(e) => {
                                const newSeconds = Number.parseInt(e.target.value) || 0
                                const clampedSeconds = Math.min(59, Math.max(0, newSeconds))
                                const newTime = Math.floor(startTime / 60) * 60 + clampedSeconds + (startTime % 1)
                                if (newTime < endTime) {
                                  updateCurrentTime(newTime, "startTime")
                                }
                              }}
                              className="w-12 h-12 text-center py-2 font-mono text-lg bg-white dark:bg-slate-800 border-2 border-purple-500/50 dark:border-purple-400/50 rounded-lg text-slate-900 dark:text-white my-1"
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newSeconds = Math.max(0, Math.floor(startTime % 60) - 1)
                                const newTime = Math.floor(startTime / 60) * 60 + newSeconds + (startTime % 1)
                                updateCurrentTime(newTime, "startTime")
                              }}
                            >
                              <Minus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sec</span>
                          </div>

                          <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 self-center mt-1">
                            .
                          </span>

                          {/* Milliseconds */}
                          <div className="flex flex-col items-center">
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMilliseconds = Math.min(9, Math.floor((startTime % 1) * 10) + 1)
                                const newTime = Math.floor(startTime) + newMilliseconds / 10
                                if (newTime < endTime) {
                                  updateCurrentTime(newTime, "startTime")
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              value={Math.floor((startTime % 1) * 10)}
                              onChange={(e) => {
                                const newMilliseconds = Number.parseInt(e.target.value) || 0
                                const clampedMilliseconds = Math.min(9, Math.max(0, newMilliseconds))
                                const newTime = Math.floor(startTime) + clampedMilliseconds / 10
                                if (newTime < endTime) {
                                  updateCurrentTime(newTime, "startTime")
                                }
                              }}
                              className="w-12 h-12 text-center py-2 font-mono text-lg bg-white dark:bg-slate-800 border-2 border-purple-500/50 dark:border-purple-400/50 rounded-lg text-slate-900 dark:text-white my-1"
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMilliseconds = Math.max(0, Math.floor((startTime % 1) * 10) - 1)
                                const newTime = Math.floor(startTime) + newMilliseconds / 10
                                updateCurrentTime(newTime, "startTime")
                              }}
                            >
                              <Minus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">ms</span>
                          </div>

                          <div className="flex flex-col items-center ml-auto gap-2">
                            <button
                              className="w-full px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors text-sm"
                              onClick={() => {
                                setStartTime(0)
                                setCurrentTime(0)
                                if (audioRef.current) {
                                  audioRef.current.currentTime = 0
                                }
                              }}
                            >
                              Start
                            </button>
                            <button
                              className="w-full px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors text-sm"
                              onClick={() => {
                                if (audioRef.current) {
                                  const newStartTime = currentTime
                                  if (newStartTime < endTime) {
                                    setStartTime(newStartTime)
                                    addToast("Start point set", "info")
                                  }
                                }
                              }}
                            >
                              Current
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* End Time Editor - Improved with milliseconds */}
                      <div className="card p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/20 dark:from-blue-400/10 dark:to-blue-400/20 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-400 flex items-center justify-center mr-2">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium text-slate-800 dark:text-white">End Time</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-3">
                          {/* Minutes */}
                          <div className="flex flex-col items-center">
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMinutes = Math.floor(endTime / 60) + 1
                                const newTime = Math.min(duration, newMinutes * 60 + (endTime % 60))
                                updateCurrentTime(newTime, "endTime")
                              }}
                            >
                              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={Math.floor(endTime / 60)}
                              onChange={(e) => {
                                const newMinutes = Number.parseInt(e.target.value) || 0
                                const newTime = Math.min(duration, newMinutes * 60 + (endTime % 60))
                                if (newTime > startTime) {
                                  updateCurrentTime(newTime, "endTime")
                                }
                              }}
                              className="w-12 h-12 text-center py-2 font-mono text-lg bg-white dark:bg-slate-800 border-2 border-blue-500/50 dark:border-blue-400/50 rounded-lg text-slate-900 dark:text-white my-1"
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMinutes = Math.max(0, Math.floor(endTime / 60) - 1)
                                const newTime = newMinutes * 60 + (endTime % 60)
                                if (newTime > startTime) {
                                  updateCurrentTime(newTime, "endTime")
                                }
                              }}
                            >
                              <Minus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Min</span>
                          </div>

                          <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 self-center mt-1">
                            :
                          </span>

                          {/* Seconds */}
                          <div className="flex flex-col items-center">
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newSeconds = Math.min(59, Math.floor(endTime % 60) + 1)
                                const newTime = Math.min(
                                  duration,
                                  Math.floor(endTime / 60) * 60 + newSeconds + (endTime % 1),
                                )
                                updateCurrentTime(newTime, "endTime")
                              }}
                            >
                              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={Math.floor(endTime % 60)}
                              onChange={(e) => {
                                const newSeconds = Number.parseInt(e.target.value) || 0
                                const clampedSeconds = Math.min(59, Math.max(0, newSeconds))
                                const newTime = Math.floor(endTime / 60) * 60 + clampedSeconds + (endTime % 1)
                                if (newTime > startTime) {
                                  updateCurrentTime(newTime, "endTime")
                                }
                              }}
                              className="w-12 h-12 text-center py-2 font-mono text-lg bg-white dark:bg-slate-800 border-2 border-blue-500/50 dark:border-blue-400/50 rounded-lg text-slate-900 dark:text-white my-1"
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newSeconds = Math.max(0, Math.floor(endTime % 60) - 1)
                                const newTime = Math.floor(endTime / 60) * 60 + newSeconds + (endTime % 1)
                                if (newTime > startTime) {
                                  updateCurrentTime(newTime, "endTime")
                                }
                              }}
                            >
                              <Minus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sec</span>
                          </div>

                          <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 self-center mt-1">
                            .
                          </span>

                          {/* Milliseconds */}
                          <div className="flex flex-col items-center">
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMilliseconds = Math.min(9, Math.floor((endTime % 1) * 10) + 1)
                                const newTime = Math.min(duration, Math.floor(endTime) + newMilliseconds / 10)
                                updateCurrentTime(newTime, "endTime")
                              }}
                            >
                              <Plus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              value={Math.floor((endTime % 1) * 10)}
                              onChange={(e) => {
                                const newMilliseconds = Number.parseInt(e.target.value) || 0
                                const clampedMilliseconds = Math.min(9, Math.max(0, newMilliseconds))
                                const newTime = Math.floor(endTime) + clampedMilliseconds / 10
                                if (newTime > startTime) {
                                  updateCurrentTime(newTime, "endTime")
                                }
                              }}
                              className="w-12 h-12 text-center py-2 font-mono text-lg bg-white dark:bg-slate-800 border-2 border-blue-500/50 dark:border-blue-400/50 rounded-lg text-slate-900 dark:text-white my-1"
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                const newMilliseconds = Math.max(0, Math.floor((endTime % 1) * 10) - 1)
                                const newTime = Math.floor(endTime) + newMilliseconds / 10
                                if (newTime > startTime) {
                                  updateCurrentTime(newTime, "endTime")
                                }
                              }}
                            >
                              <Minus className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">ms</span>
                          </div>

                          <div className="flex flex-col items-center ml-auto gap-2">
                            <button
                              className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors text-sm"
                              onClick={() => {
                                if (audioRef.current) {
                                  const newEndTime = currentTime
                                  if (newEndTime > startTime) {
                                    setEndTime(newEndTime)
                                    addToast("End point set", "info")
                                  }
                                }
                              }}
                            >
                              Current
                            </button>
                            <button
                              className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors text-sm"
                              onClick={() => {
                                setEndTime(duration)
                              }}
                            >
                              End
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duration Display */}
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Selection Duration:
                        </span>
                        <span className="ml-2 font-mono text-lg font-bold text-slate-900 dark:text-white">
                          {formatTime(endTime - startTime)}
                        </span>
                      </div>
                    </div>
                    {/* Quick Selection Presets */}
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quick Selection:</span>
                        <div className="flex gap-2">
                          <button
                            className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-md border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                            onClick={() => {
                              setStartTime(0)
                              setEndTime(duration)
                            }}
                          >
                            All
                          </button>
                          <button
                            className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-md border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                            onClick={() => {
                              setStartTime(0)
                              setEndTime(Math.min(duration, 30))
                            }}
                          >
                            First 30s
                          </button>
                          <button
                            className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-md border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                            onClick={() => {
                              const newStart = Math.max(0, duration - 30)
                              setStartTime(newStart)
                              setEndTime(duration)
                            }}
                          >
                            Last 30s
                          </button>
                          <button
                            className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-md border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                            onClick={() => {
                              const middle = duration / 2
                              setStartTime(Math.max(0, middle - 15))
                              setEndTime(Math.min(duration, middle + 15))
                            }}
                          >
                            Middle 30s
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-300">
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">Space: Play/Pause</span>
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">←/→: Skip 5s</span>
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">S: Set Start</span>
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">E: Set End</span>
                  </div>

                  {/* Advanced Options */}
                  <div className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        className="btn-outline text-sm flex items-center justify-center gap-2"
                        onClick={() => setShowEffects(!showEffects)}
                      >
                        <Wand2 className="h-4 w-4" />
                        {showEffects ? "Hide Advanced Options" : "Show Advanced Options"}
                      </button>

                      <button
                        className="btn-outline text-sm flex items-center justify-center gap-2"
                        onClick={() => setShowBookmarks(!showBookmarks)}
                      >
                        <Bookmark className="h-4 w-4" />
                        {showBookmarks ? "Hide Bookmarks" : "Show Bookmarks"}
                      </button>

                      <button
                        className="btn-outline text-sm flex items-center justify-center gap-2"
                        onClick={() => setShowBatchProcessing(!showBatchProcessing)}
                      >
                        <Layers className="h-4 w-4" />
                        {showBatchProcessing ? "Hide Batch Processing" : "Batch Processing"}
                      </button>

                      <button
                        className="btn-outline text-sm flex items-center justify-center gap-2"
                        onClick={() => setShowExportPresets(!showExportPresets)}
                      >
                        <Settings className="h-4 w-4" />
                        {showExportPresets ? "Hide Export Presets" : "Export Presets"}
                      </button>
                    </div>

                    {showEffects && (
                      <div className="card mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                        <div className="space-y-2">
                          <Label htmlFor="effect" className="text-sm text-slate-700 dark:text-slate-300">
                            Audio Effect
                          </Label>
                          <Select value={selectedEffect} onValueChange={setSelectedEffect}>
                            <SelectTrigger id="effect" className="input">
                              <SelectValue placeholder="Select effect" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="echo">Echo</SelectItem>
                              <SelectItem value="reverb">Reverb</SelectItem>
                              <SelectItem value="pitch">Pitch Shift</SelectItem>
                              <SelectItem value="speed">Speed Up/Slow Down</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="format" className="text-sm text-slate-700 dark:text-slate-300">
                            Export Format
                          </Label>
                          <Select value={exportFormat} onValueChange={setExportFormat}>
                            <SelectTrigger id="format" className="input">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                              <SelectItem value="mp3">MP3</SelectItem>
                              <SelectItem value="wav">WAV</SelectItem>
                              <SelectItem value="ogg">OGG</SelectItem>
                              <SelectItem value="m4a">M4A</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quality" className="text-sm text-slate-700 dark:text-slate-300">
                            Export Quality
                          </Label>
                          <Select value={exportQuality} onValueChange={setExportQuality}>
                            <SelectTrigger id="quality" className="input">
                              <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                              <SelectItem value="low">Low (64kbps)</SelectItem>
                              <SelectItem value="medium">Medium (128kbps)</SelectItem>
                              <SelectItem value="high">High (256kbps)</SelectItem>
                              <SelectItem value="ultra">Ultra (320kbps)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="normalize" className="text-sm text-slate-700 dark:text-slate-300">
                              Normalize Audio
                            </Label>
                            <Switch id="normalize" checked={normalize} onCheckedChange={setNormalize} />
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Label htmlFor="fade" className="text-sm text-slate-700 dark:text-slate-300">
                              Add Fade In/Out
                            </Label>
                            <Switch id="fade" checked={fadeInOut} onCheckedChange={setFadeInOut} />
                          </div>
                        </div>
                      </div>
                    )}

                    {showExportPresets && (
                      <div className="card mt-4 p-6">
                        <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-white">Export Presets</h3>

                        <div className="space-y-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Select a preset to quickly apply export settings.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {exportPresets.map((preset) => (
                              <div
                                key={preset.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                  selectedPreset === preset.id
                                    ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700"
                                }`}
                                onClick={() => applyPreset(preset.id)}
                              >
                                <div className="font-medium text-slate-800 dark:text-white">{preset.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {preset.format.toUpperCase()} •{" "}
                                  {preset.quality === "ultra"
                                    ? "Ultra"
                                    : preset.quality === "high"
                                      ? "High"
                                      : preset.quality === "medium"
                                        ? "Medium"
                                        : "Low"}{" "}
                                  Quality
                                </div>
                                <div className="flex gap-2 mt-2">
                                  {preset.normalize && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                                      Normalize
                                    </span>
                                  )}
                                  {preset.fadeInOut && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded">
                                      Fade In/Out
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {showBookmarks && (
                      <div className="card mt-4 p-6">
                        <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-white">Audio Bookmarks</h3>
                        <BookmarkManager currentTime={currentTime} onJumpToBookmark={jumpToBookmark} />
                      </div>
                    )}

                    {showBatchProcessing && (
                      <div className="card mt-4 p-6">
                        <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-white">Batch Processing</h3>

                        <div className="space-y-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Process multiple audio files with the same settings.
                          </p>

                          <div className="flex items-center gap-2">
                            <Button onClick={() => document.getElementById("batch-upload")?.click()}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Files
                            </Button>
                            <input
                              id="batch-upload"
                              type="file"
                              accept="audio/*"
                              multiple
                              className="hidden"
                              onChange={handleBatchFileSelect}
                            />

                            <button
                              className="btn-primary"
                              onClick={processBatchFiles}
                              disabled={batchFiles.length === 0 || isProcessing}
                            >
                              {isProcessing ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Scissors className="h-4 w-4 mr-1" />
                                  Process All
                                </>
                              )}
                            </button>
                          </div>

                          {batchFiles.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {batchFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                >
                                  <span className="text-sm truncate max-w-[200px] text-slate-700 dark:text-slate-300">
                                    {file.name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    onClick={() => removeBatchFile(index)}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove file</span>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                              No files added yet. Add audio files to process them in batch.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cut Completed Message */}
                  {cutCompleted && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 flex items-center justify-center gap-2 animate-slide-up">
                      <Scissors className="h-4 w-4" />
                      <span>Audio successfully cut! Your download should begin automatically.</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-center gap-4 p-6">
                    <button
                      className="btn-primary shadow-lg hover:shadow-xl"
                      onClick={exportAudio}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5 mr-2" />
                          Cut & Export
                        </>
                      )}
                    </button>

                    <button className="btn-outline" onClick={saveProject}>
                      <Save className="h-5 w-5 mr-2" />
                      Save Project
                    </button>
                  </div>

                  {/* Audio Stats */}
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex flex-wrap justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <FileText className="h-4 w-4" />
                        <span>Format: {file.type.split("/")[1].toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {formatTime(duration)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <BarChart2 className="h-4 w-4" />
                        <span>Selection: {formatTime(endTime - startTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-0">
          <div className="card">
            <div className="p-6">
              <div className="mb-4">
                <h2 className="headline-small text-slate-800 dark:text-white">Your Saved Projects</h2>
                <p className="body-medium text-slate-600 dark:text-slate-300">
                  Access and manage your previously saved audio projects
                </p>
              </div>
              {savedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center animate-float">
                    <Folder className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="title-medium text-slate-700 dark:text-slate-300 mb-2">No saved projects yet</h3>
                  <p className="body-medium text-slate-500 dark:text-slate-400 mb-4">
                    Save your work to access it later
                  </p>
                  <button className="btn-outline" onClick={() => setActiveTab("editor")}>
                    Go to Editor
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="card p-4 flex items-center justify-between hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex-1">
                        <h3 className="title-small text-slate-800 dark:text-white">{project.name}</h3>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTime(project.duration)}</span>
                          <span className="mx-2">•</span>
                          <span>{project.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full px-4 py-2 text-sm"
                          onClick={() => loadProject(project)}
                        >
                          <ChevronRight className="h-4 w-4 inline mr-1" />
                          <span className="sr-only md:not-sr-only">Open</span>
                        </button>
                        <button
                          className="border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full px-4 py-2 text-sm"
                          onClick={() => deleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4 inline mr-1" />
                          <span className="sr-only md:not-sr-only">Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Features Section */}
      {!file && activeTab === "editor" && (
        <Tabs defaultValue="features" className="mt-12">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <TabsTrigger
              value="features"
              className="text-slate-800 dark:text-white data-[state=active]:bg-purple-500/10 dark:data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-lg"
            >
              Features
            </TabsTrigger>
            <TabsTrigger
              value="shortcuts"
              className="text-slate-800 dark:text-white data-[state=active]:bg-purple-500/10 dark:data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-lg"
            >
              Shortcuts
            </TabsTrigger>
            <TabsTrigger
              value="tips"
              className="text-slate-800 dark:text-white data-[state=active]:bg-purple-500/10 dark:data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-lg"
            >
              Pro Tips
            </TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="mt-4">
            <div className="card">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card p-4 flex items-start gap-3">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-3 rounded-lg">
                      <Scissors className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-white">Precision Audio Trimming</h3>
                      <p className="body-small text-slate-600 dark:text-slate-300">
                        Cut audio with frame-perfect accuracy down to milliseconds using our advanced waveform editor
                      </p>
                    </div>
                  </div>

                  <div className="card p-4 flex items-start gap-3">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-3 rounded-lg">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-white">Professional Audio Effects</h3>
                      <p className="body-small text-slate-600 dark:text-slate-300">
                        Apply studio-quality effects including normalization, fade in/out, reverb, and pitch adjustment
                      </p>
                    </div>
                  </div>

                  <div className="card p-4 flex items-start gap-3">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-3 rounded-lg">
                      <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-white">Intelligent Batch Processing</h3>
                      <p className="body-small text-slate-600 dark:text-slate-300">
                        Process hundreds of audio files simultaneously with consistent settings and quality
                      </p>
                    </div>
                  </div>

                  <div className="card p-4 flex items-start gap-3">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-3 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-white">Smart Time Navigation</h3>
                      <p className="body-small text-slate-600 dark:text-slate-300">
                        Navigate through audio with bookmarks, quick selections, and precision time controls
                      </p>
                    </div>
                  </div>

                  <div className="card p-4 flex items-start gap-3">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-3 rounded-lg">
                      <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-white">Multi-Format Export</h3>
                      <p className="body-small text-slate-600 dark:text-slate-300">
                        Export to MP3, WAV, OGG, M4A with customizable quality settings and compression
                      </p>
                    </div>
                  </div>

                  <div className="card p-4 flex items-start gap-3">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-3 rounded-lg">
                      <Save className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-white">Project Management</h3>
                      <p className="body-small text-slate-600 dark:text-slate-300">
                        Save, organize, and revisit your audio projects with automatic progress preservation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-4">
            <div className="card">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Play/Pause Audio</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      Space
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Skip Forward 5s</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      →
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Skip Backward 5s</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      ←
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Set Start Point</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      S
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Set End Point</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      E
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Toggle Mute</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      M
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Cut & Export</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      Ctrl+C
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Zoom In/Out</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      +/-
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Select All Audio</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      X
                    </Badge>
                  </div>

                  <div className="card p-4 flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Show Shortcuts</span>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30"
                    >
                      K
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="mt-4">
            <div className="card">
              <div className="p-6">
                <ul className="space-y-3">
                  <div className="card p-4 flex items-start gap-2">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Use the normalize feature to ensure consistent volume levels across all your audio exports
                    </p>
                  </div>

                  <div className="card p-4 flex items-start gap-2">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Double-tap on the waveform to quickly set start and end points based on your current position
                    </p>
                  </div>

                  <div className="card p-4 flex items-start gap-2">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Save export presets for different use cases like podcasts, music, or voice recordings
                    </p>
                  </div>

                  <div className="card p-4 flex items-start gap-2">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Use bookmarks to mark important sections and quickly navigate through long audio files
                    </p>
                  </div>

                  <div className="card p-4 flex items-start gap-2">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Enable fade in/out effects for smoother transitions, especially when cutting from the middle of
                      tracks
                    </p>
                  </div>

                  <div className="card p-4 flex items-start gap-2">
                    <div className="bg-purple-500/10 dark:bg-purple-400/20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Use batch processing to apply the same cuts and effects to multiple files with identical timing
                    </p>
                  </div>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
