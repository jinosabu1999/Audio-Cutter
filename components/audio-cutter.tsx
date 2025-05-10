"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  HelpCircle,
  Folder,
  Trash2,
  ChevronRight,
  Wand2,
  Zap,
  Download,
  Bookmark,
  Music,
  Minus,
  Plus,
} from "lucide-react"
import { formatTime, parseTimeInput } from "@/lib/time-utils"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/ui/theme-context"
import { useToast } from "@/components/ui/toast-provider"
import { AudioVisualizer } from "@/components/ui/audio-visualizer"
import { MaterialButton } from "@/components/ui/material-button"
import { MaterialCard } from "@/components/ui/material-card"
import { SpeedControl } from "@/components/ui/speed-control"
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
  const [cutCompleted, setCutCompleted] = useState<boolean>(false)
  const [cutAudioUrl, setCutAudioUrl] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>("")
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [showSavedProjects, setShowSavedProjects] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>("editor")
  const [visualizerData, setVisualizerData] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [loopPlayback, setLoopPlayback] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false)
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [showBatchProcessing, setShowBatchProcessing] = useState<boolean>(false)

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
      // If current time is outside the selected range, reset to start time
      if (currentTime < startTime || currentTime >= endTime) {
        audioRef.current.currentTime = startTime
        setCurrentTime(startTime)
      }
      audioRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  // Handle time input changes
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Allow direct editing without parsing immediately
    if (value.length <= 9) {
      // Max length for MM:SS.ms format
      // Store the raw input value
      const inputEl = startTimeInputRef.current
      if (inputEl) {
        // Keep cursor position
        const cursorPos = e.target.selectionStart || 0

        // Only parse and apply when the format is valid
        const newStartTime = parseTimeInput(value)
        if (newStartTime !== null && newStartTime >= 0 && newStartTime < endTime) {
          setStartTime(newStartTime)
          if (currentTime < newStartTime) {
            setCurrentTime(newStartTime)
            if (audioRef.current) {
              audioRef.current.currentTime = newStartTime
            }
          }
        }

        // Restore cursor position after React updates the input
        setTimeout(() => {
          if (inputEl) {
            inputEl.setSelectionRange(cursorPos, cursorPos)
          }
        }, 0)
      }
    }
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Allow direct editing without parsing immediately
    if (value.length <= 9) {
      // Max length for MM:SS.ms format
      // Store the raw input value
      const inputEl = endTimeInputRef.current
      if (inputEl) {
        // Keep cursor position
        const cursorPos = e.target.selectionStart || 0

        // Only parse and apply when the format is valid
        const newEndTime = parseTimeInput(value)
        if (newEndTime !== null && newEndTime > startTime && newEndTime <= duration) {
          setEndTime(newEndTime)
          if (currentTime > newEndTime) {
            setCurrentTime(newEndTime)
            if (audioRef.current) {
              audioRef.current.currentTime = newEndTime
            }
          }
        }

        // Restore cursor position after React updates the input
        setTimeout(() => {
          if (inputEl) {
            inputEl.setSelectionRange(cursorPos, cursorPos)
          }
        }, 0)
      }
    }
  }

  // Update current time manually
  const updateCurrentTime = (newTime: number) => {
    if (!audioRef.current) return

    const clampedTime = Math.max(0, Math.min(newTime, duration))
    setCurrentTime(clampedTime)
    audioRef.current.currentTime = clampedTime
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
      const fileName = `cut_${startTime.toFixed(2)}_${endTime.toFixed(2)}_${file.name.split(".")[0]}.wav`
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
        if (loopPlayback) {
          audioRef.current.currentTime = startTime
          setCurrentTime(startTime)
        } else {
          audioRef.current.pause()
          setIsPlaying(false)
          audioRef.current.currentTime = endTime
          setCurrentTime(endTime)
        }
      }
    }

    audioRef.current.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", handleTimeUpdate)
      }
    }
  }, [endTime, loopPlayback, startTime])

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
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentTime, startTime, endTime, file])

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

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
          <MaterialCard variant="glass" className="max-w-md w-full mx-4 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="title-large flex items-center text-slate-800 dark:text-slate-100">
                <Info className="w-5 h-5 mr-2 text-[var(--dynamic-primary)]" />
                Time Format Guide
              </h3>
              <MaterialButton
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setShowHelpPopup(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </MaterialButton>
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
                  <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">01:15.50</code> - 1 minute, 15.5 seconds
                </li>
                <li>
                  <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">00:05.75</code> - 5.75 seconds
                </li>
              </ul>
            </div>
            <MaterialButton className="w-full mt-6" onClick={() => setShowHelpPopup(false)}>
              Got it!
            </MaterialButton>
          </MaterialCard>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger
            value="editor"
            className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg"
          >
            Audio Editor
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 rounded-lg"
          >
            Saved Projects
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="mt-0">
          <MaterialCard
            variant="glass"
            className={cn(
              "mb-8 transition-all duration-500",
              isDragging ? "border-dashed border-2 border-[var(--dynamic-primary)]" : "",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-8">
              {!file ? (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center animate-float">
                    <div className="relative">
                      <Music className="w-16 h-16 text-[var(--dynamic-primary)]" />
                      <div className="absolute inset-0 bg-[var(--dynamic-primary)] opacity-20 blur-xl rounded-full animate-pulse-glow"></div>
                    </div>
                  </div>
                  <h2 className="headline-medium mb-2 text-slate-800 dark:text-slate-100">Upload Your Audio</h2>
                  <p className="body-large text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                    Drag and drop your audio file here or click to browse
                  </p>
                  <MaterialButton
                    onClick={() => document.getElementById("audio-upload")?.click()}
                    className="animate-shimmer"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Select Audio File
                  </MaterialButton>
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
                      className="px-3 py-1 text-sm bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/30 text-primary dark:text-primary-foreground"
                    >
                      {file.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
                      className="material-input"
                      placeholder="Enter project name"
                    />
                  </div>

                  {/* Audio Player */}
                  <audio
                    ref={audioRef}
                    src={audioUrl || undefined}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                    playbackRate={playbackSpeed}
                  />

                  {/* Audio Visualizer */}
                  <MaterialCard variant="glass" className="mb-6 p-4">
                    <AudioVisualizer
                      data={visualizerData}
                      currentTime={currentTime}
                      duration={duration}
                      startTime={startTime}
                      endTime={endTime}
                      onTimeUpdate={updateCurrentTime}
                      isPlaying={isPlaying}
                      zoomLevel={zoomLevel}
                    />
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                        disabled={zoomLevel <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-slate-600 dark:text-slate-400">Zoom: {zoomLevel}x</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
                        disabled={zoomLevel >= 4}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mt-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </MaterialCard>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <MaterialButton variant="fab" className="animate-breathe" onClick={togglePlayPause}>
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </MaterialButton>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch id="loop-playback" checked={loopPlayback} onCheckedChange={setLoopPlayback} />
                      <Label htmlFor="loop-playback" className="text-sm cursor-pointer">
                        Loop playback
                      </Label>
                    </div>
                  </div>

                  <div className="mt-4 max-w-xs mx-auto">
                    <SpeedControl onChange={handleSpeedChange} defaultValue={1} />
                  </div>

                  {/* Cutting Controls - Material 3 Design */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <MaterialCard
                      variant="glass"
                      shape="blob1"
                      className="space-y-2 p-6 bg-gradient-to-br from-primary/30 to-secondary/30 dark:from-primary/20 dark:to-secondary/20"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mr-3 shadow-md">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <Label
                            htmlFor="start-time"
                            className="text-sm font-medium text-slate-800 dark:text-slate-200"
                          >
                            Start Time
                          </Label>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Set where to begin cutting</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto text-slate-400 hover:text-primary dark:hover:text-primary"
                          onClick={() => setShowHelpPopup(true)}
                        >
                          <HelpCircle className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="start-time"
                          ref={startTimeInputRef}
                          value={formatTime(startTime)}
                          onChange={handleStartTimeChange}
                          className="time-input"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5">
                          <Zap className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </MaterialCard>

                    <MaterialCard
                      variant="glass"
                      shape="blob2"
                      className="space-y-2 p-6 bg-gradient-to-br from-secondary/30 to-primary/30 dark:from-secondary/20 dark:to-primary/20"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mr-3 shadow-md">
                          <Clock className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <Label htmlFor="end-time" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            End Time
                          </Label>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Set where to end cutting</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          id="end-time"
                          ref={endTimeInputRef}
                          value={formatTime(endTime)}
                          onChange={handleEndTimeChange}
                          className="time-input"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5">
                          <Zap className="h-4 w-4 text-secondary" />
                        </div>
                      </div>
                    </MaterialCard>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">Space: Play/Pause</span>
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">←/→: Skip 5s</span>
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">S: Set Start</span>
                    <span className="px-2 py-1 bg-slate-200/20 dark:bg-slate-700/30 rounded-md">E: Set End</span>
                  </div>

                  {/* Advanced Options */}
                  <div className="mb-6">
                    <MaterialButton
                      variant="outline"
                      className="text-sm flex items-center gap-2"
                      onClick={() => setShowEffects(!showEffects)}
                    >
                      <Wand2 className="h-4 w-4" />
                      {showEffects ? "Hide Advanced Options" : "Show Advanced Options"}
                    </MaterialButton>

                    <MaterialButton
                      variant="outline"
                      className="text-sm flex items-center gap-2 ml-2"
                      onClick={() => setShowBookmarks(!showBookmarks)}
                    >
                      <Bookmark className="h-4 w-4" />
                      {showBookmarks ? "Hide Bookmarks" : "Show Bookmarks"}
                    </MaterialButton>

                    <MaterialButton
                      variant="outline"
                      className="text-sm flex items-center gap-2 ml-2"
                      onClick={() => setShowBatchProcessing(!showBatchProcessing)}
                    >
                      <Layers className="h-4 w-4" />
                      {showBatchProcessing ? "Hide Batch Processing" : "Batch Processing"}
                    </MaterialButton>

                    {showEffects && (
                      <MaterialCard variant="glass" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                        <div className="space-y-2">
                          <Label htmlFor="effect" className="text-sm text-slate-700 dark:text-slate-300">
                            Audio Effect
                          </Label>
                          <Select value={selectedEffect} onValueChange={setSelectedEffect}>
                            <SelectTrigger id="effect" className="material-input">
                              <SelectValue placeholder="Select effect" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl">
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
                            <SelectTrigger id="format" className="material-input">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl">
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
                            <SelectTrigger id="quality" className="material-input">
                              <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl">
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
                            <Switch id="normalize" />
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Label htmlFor="fade" className="text-sm text-slate-700 dark:text-slate-300">
                              Add Fade In/Out
                            </Label>
                            <Switch id="fade" />
                          </div>
                        </div>
                      </MaterialCard>
                    )}

                    {showBookmarks && (
                      <MaterialCard variant="glass" className="mt-4 p-6">
                        <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-slate-200">Audio Bookmarks</h3>
                        <BookmarkManager currentTime={currentTime} onJumpToBookmark={jumpToBookmark} />
                      </MaterialCard>
                    )}

                    {showBatchProcessing && (
                      <MaterialCard variant="glass" className="mt-4 p-6">
                        <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-slate-200">
                          Batch Processing
                        </h3>

                        <div className="space-y-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
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

                            <MaterialButton
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
                            </MaterialButton>
                          </div>

                          {batchFiles.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {batchFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                >
                                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
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
                      </MaterialCard>
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
                    <MaterialButton
                      variant="default"
                      size="lg"
                      elevation="lg"
                      className="animate-shimmer"
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
                    </MaterialButton>

                    <MaterialButton variant="outline" size="lg" onClick={saveProject}>
                      <Bookmark className="h-5 w-5 mr-2" />
                      Save Project
                    </MaterialButton>
                  </div>
                </div>
              )}
            </div>
          </MaterialCard>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-0">
          <MaterialCard variant="glass">
            <CardHeader>
              <CardTitle className="headline-small text-slate-800 dark:text-slate-100">Your Saved Projects</CardTitle>
              <CardDescription className="body-medium text-slate-600 dark:text-slate-400">
                Access and manage your previously saved audio projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center animate-float">
                    <Folder className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="title-medium text-slate-700 dark:text-slate-300 mb-2">No saved projects yet</h3>
                  <p className="body-medium text-slate-500 dark:text-slate-400 mb-4">
                    Save your work to access it later
                  </p>
                  <MaterialButton variant="outline" onClick={() => setActiveTab("editor")}>
                    Go to Editor
                  </MaterialButton>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedProjects.map((project) => (
                    <MaterialCard
                      key={project.id}
                      variant="glass"
                      padding="sm"
                      className="flex items-center justify-between hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex-1">
                        <h3 className="title-small text-slate-800 dark:text-slate-100">{project.name}</h3>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTime(project.duration)}</span>
                          <span className="mx-2">•</span>
                          <span>{project.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MaterialButton variant="tonal" size="sm" onClick={() => loadProject(project)}>
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:ml-2">Open</span>
                        </MaterialButton>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          onClick={() => deleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:ml-2">Delete</span>
                        </Button>
                      </div>
                    </MaterialCard>
                  ))}
                </div>
              )}
            </CardContent>
          </MaterialCard>
        </TabsContent>
      </Tabs>

      {/* Features Section */}
      {!file && activeTab === "editor" && (
        <Tabs defaultValue="features" className="mt-12">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <TabsTrigger
              value="features"
              className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-[var(--dynamic-primary)] data-[state=active]:bg-opacity-10 dark:data-[state=active]:bg-opacity-20 data-[state=active]:text-[var(--dynamic-primary)] rounded-lg"
            >
              Features
            </TabsTrigger>
            <TabsTrigger
              value="shortcuts"
              className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-[var(--dynamic-primary)] data-[state=active]:bg-opacity-10 dark:data-[state=active]:bg-opacity-20 data-[state=active]:text-[var(--dynamic-primary)] rounded-lg"
            >
              Shortcuts
            </TabsTrigger>
            <TabsTrigger
              value="tips"
              className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-[var(--dynamic-primary)] data-[state=active]:bg-opacity-10 dark:data-[state=active]:bg-opacity-20 data-[state=active]:text-[var(--dynamic-primary)] rounded-lg"
            >
              Pro Tips
            </TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="mt-4">
            <MaterialCard variant="glass">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-3">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-3 rounded-lg">
                      <Scissors className="h-5 w-5 text-[var(--dynamic-primary)]" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-slate-100">Precision Cutting</h3>
                      <p className="body-small text-slate-600 dark:text-slate-400">
                        Cut your audio with millisecond precision
                      </p>
                    </div>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-3">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-3 rounded-lg">
                      <Sparkles className="h-5 w-5 text-[var(--dynamic-primary)]" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-slate-100">Audio Effects</h3>
                      <p className="body-small text-slate-600 dark:text-slate-400">
                        Apply professional effects to your audio
                      </p>
                    </div>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-3">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-3 rounded-lg">
                      <Layers className="h-5 w-5 text-[var(--dynamic-primary)]" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-slate-100">Batch Processing</h3>
                      <p className="body-small text-slate-600 dark:text-slate-400">
                        Process multiple audio files at once
                      </p>
                    </div>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-3">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-3 rounded-lg">
                      <Clock className="h-5 w-5 text-[var(--dynamic-primary)]" />
                    </div>
                    <div>
                      <h3 className="title-small mb-1 text-slate-800 dark:text-slate-100">Precise Time Control</h3>
                      <p className="body-small text-slate-600 dark:text-slate-400">
                        Fine-tune your cuts with millisecond accuracy
                      </p>
                    </div>
                  </MaterialCard>
                </div>
              </div>
            </MaterialCard>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-4">
            <MaterialCard variant="glass">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MaterialCard variant="glass" padding="sm" className="flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Play/Pause</span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 text-[var(--dynamic-primary)] border-[var(--dynamic-primary)] border-opacity-30 dark:border-opacity-30"
                    >
                      Space
                    </Badge>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Skip Forward</span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 text-[var(--dynamic-primary)] border-[var(--dynamic-primary)] border-opacity-30 dark:border-opacity-30"
                    >
                      →
                    </Badge>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Skip Backward</span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 text-[var(--dynamic-primary)] border-[var(--dynamic-primary)] border-opacity-30 dark:border-opacity-30"
                    >
                      ←
                    </Badge>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Set Start Point</span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 text-[var(--dynamic-primary)] border-[var(--dynamic-primary)] border-opacity-30 dark:border-opacity-30"
                    >
                      S
                    </Badge>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Set End Point</span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 text-[var(--dynamic-primary)] border-[var(--dynamic-primary)] border-opacity-30 dark:border-opacity-30"
                    >
                      E
                    </Badge>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex justify-between items-center">
                    <span className="body-medium text-slate-700 dark:text-slate-300">Export</span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 text-[var(--dynamic-primary)] border-[var(--dynamic-primary)] border-opacity-30 dark:border-opacity-30"
                    >
                      Ctrl+E
                    </Badge>
                  </MaterialCard>
                </div>
              </div>
            </MaterialCard>
          </TabsContent>

          <TabsContent value="tips" className="mt-4">
            <MaterialCard variant="glass">
              <div className="p-6">
                <ul className="space-y-3">
                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-2">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--dynamic-primary)]"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Use the normalize feature to ensure consistent volume levels
                    </p>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-2">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--dynamic-primary)]"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Add fade in/out to avoid abrupt starts and endings
                    </p>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-2">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--dynamic-primary)]"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Save your project to continue editing later
                    </p>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-2">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--dynamic-primary)]"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Use WAV format for highest quality, MP3 for smaller file size
                    </p>
                  </MaterialCard>

                  <MaterialCard variant="glass" padding="sm" className="flex items-start gap-2">
                    <div className="bg-[var(--dynamic-primary)] bg-opacity-10 dark:bg-opacity-20 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--dynamic-primary)]"></div>
                    </div>
                    <p className="body-medium text-slate-700 dark:text-slate-300">
                      Use keyboard shortcuts for faster and more efficient editing
                    </p>
                  </MaterialCard>
                </ul>
              </div>
            </MaterialCard>
          </TabsContent>
        </Tabs>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <MaterialButton
          variant="fab"
          size="icon-lg"
          className="bg-gradient-to-r from-[var(--dynamic-primary)] to-[var(--dynamic-secondary)] shadow-lg hover:shadow-xl"
          onClick={() => setShowHelpPopup(true)}
        >
          <HelpCircle className="h-6 w-6" />
        </MaterialButton>
      </div>
    </div>
  )
}
