"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
} from "lucide-react"
import { formatTime, parseTimeInput } from "@/lib/time-utils"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/ui/theme-context"
import { useToast } from "@/components/ui/toast-provider"

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
    // Store the cursor position
    const cursorPosition = e.target.selectionStart || 0
    const value = e.target.value

    const newStartTime = parseTimeInput(value)
    if (newStartTime !== null && newStartTime >= 0 && newStartTime < endTime) {
      setStartTime(newStartTime)
      if (currentTime < newStartTime) {
        setCurrentTime(newStartTime)
        if (audioRef.current) {
          audioRef.current.currentTime = newStartTime
        }
      }

      // Schedule restoration of cursor position
      setTimeout(() => {
        if (startTimeInputRef.current) {
          startTimeInputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    }
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Store the cursor position
    const cursorPosition = e.target.selectionStart || 0
    const value = e.target.value

    const newEndTime = parseTimeInput(value)
    if (newEndTime !== null && newEndTime > startTime && newEndTime <= duration) {
      setEndTime(newEndTime)
      if (currentTime > newEndTime) {
        setCurrentTime(newEndTime)
        if (audioRef.current) {
          audioRef.current.currentTime = newEndTime
        }
      }

      // Schedule restoration of cursor position
      setTimeout(() => {
        if (endTimeInputRef.current) {
          endTimeInputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
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

      // Stop playback if we reach the end time
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
  }, [endTime])

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
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentTime, startTime, endTime, file])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Help Popup */}
      {showHelpPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-up border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <Info className="w-5 h-5 mr-2 text-violet-500" />
                Time Format Guide
              </h3>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setShowHelpPopup(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
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
            <Button
              className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => setShowHelpPopup(false)}
            >
              Got it!
            </Button>
          </div>
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
          <Card
            className={cn(
              "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mb-8 transition-all duration-300 shadow-md rounded-xl overflow-hidden",
              isDragging ? "border-dashed border-2 border-violet-400 dark:border-violet-500" : "",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-8">
              {!file ? (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Upload className="w-12 h-12 text-violet-500 dark:text-violet-400" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Upload Your Audio</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Drag and drop your audio file here or click to browse
                  </p>
                  <Button
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => document.getElementById("audio-upload")?.click()}
                  >
                    Select Audio File
                  </Button>
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
                  <div className="flex items-center justify-center mb-4">
                    <Badge
                      variant="outline"
                      className="px-3 py-1 text-sm bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300"
                    >
                      {file.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-violet-500 text-slate-900 dark:text-slate-100"
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
                  <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="h-24 flex items-end justify-between gap-0.5 mb-2">
                      {visualizerData.map((height, index) => {
                        const isInRange =
                          (index / visualizerData.length) * duration >= startTime &&
                          (index / visualizerData.length) * duration <= endTime
                        const isCurrentPosition =
                          Math.abs((index / visualizerData.length) * duration - currentTime) <
                          duration / visualizerData.length

                        return (
                          <div
                            key={index}
                            className={`w-full h-full flex items-end ${isCurrentPosition ? "animate-pulse-glow" : ""}`}
                            onClick={() => updateCurrentTime((index / visualizerData.length) * duration)}
                          >
                            <div
                              style={{ height: `${height * 100}%` }}
                              className={`w-full rounded-t ${
                                isCurrentPosition
                                  ? "bg-violet-500 dark:bg-violet-400"
                                  : isInRange
                                    ? "bg-violet-400 dark:bg-violet-600"
                                    : "bg-slate-300 dark:bg-slate-600"
                              } transition-all duration-150 hover:bg-violet-500 dark:hover:bg-violet-400 cursor-pointer`}
                            ></div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-14 h-14 border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-md"
                      onClick={togglePlayPause}
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>

                  {/* Cutting Controls - Modern Design */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2 p-6 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30 shadow-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-800/30 flex items-center justify-center mr-3">
                          <Clock className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                        </div>
                        <div>
                          <Label
                            htmlFor="start-time"
                            className="text-sm font-medium text-slate-800 dark:text-slate-200"
                          >
                            Start Time
                          </Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Set where to begin cutting</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto text-slate-400 hover:text-violet-600 dark:hover:text-violet-300"
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
                          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-violet-500 text-slate-900 dark:text-slate-100 pl-10 font-mono"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Zap className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 p-6 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30 shadow-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-800/30 flex items-center justify-center mr-3">
                          <Clock className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                        </div>
                        <div>
                          <Label htmlFor="end-time" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            End Time
                          </Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Set where to end cutting</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          id="end-time"
                          ref={endTimeInputRef}
                          value={formatTime(endTime)}
                          onChange={handleEndTimeChange}
                          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-violet-500 text-slate-900 dark:text-slate-100 pl-10 font-mono"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Zap className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="mb-6">
                    <Button
                      variant="ghost"
                      className="text-sm flex items-center gap-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                      onClick={() => setShowEffects(!showEffects)}
                    >
                      <Wand2 className="h-4 w-4" />
                      {showEffects ? "Hide Advanced Options" : "Show Advanced Options"}
                    </Button>

                    {showEffects && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="space-y-2">
                          <Label htmlFor="effect" className="text-sm text-slate-700 dark:text-slate-300">
                            Audio Effect
                          </Label>
                          <Select value={selectedEffect} onValueChange={setSelectedEffect}>
                            <SelectTrigger
                              id="effect"
                              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            >
                              <SelectValue placeholder="Select effect" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
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
                            <SelectTrigger
                              id="format"
                              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            >
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
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
                            <SelectTrigger
                              id="quality"
                              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            >
                              <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
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
                      </div>
                    )}
                  </div>

                  {/* Cut Completed Message */}
                  {cutCompleted && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
                      <Scissors className="h-4 w-4" />
                      <span>Audio successfully cut! Your download should begin automatically.</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-center gap-4 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Button
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 px-6 py-6 h-auto rounded-xl shadow-lg shadow-violet-500/20 dark:shadow-violet-900/30"
                      onClick={exportAudio}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Cut & Export
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 gap-2 px-6 py-6 h-auto rounded-xl"
                      onClick={saveProject}
                    >
                      <Bookmark className="h-5 w-5" />
                      Save Project
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-0">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl text-slate-800 dark:text-slate-100">Your Saved Projects</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Access and manage your previously saved audio projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Folder className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No saved projects yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">Save your work to access it later</p>
                  <Button
                    variant="outline"
                    className="border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    onClick={() => setActiveTab("editor")}
                  >
                    Go to Editor
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 dark:text-slate-100">{project.name}</h3>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTime(project.duration)}</span>
                          <span className="mx-2">•</span>
                          <span>{project.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                          onClick={() => loadProject(project)}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:ml-2">Open</span>
                        </Button>
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Section */}
      {!file && activeTab === "editor" && (
        <Tabs defaultValue="features" className="mt-12">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <TabsTrigger
              value="features"
              className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-violet-50 dark:data-[state=active]:bg-violet-900/30 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 rounded-lg"
            >
              Features
            </TabsTrigger>
            <TabsTrigger
              value="shortcuts"
              className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-violet-50 dark:data-[state=active]:bg-violet-900/30 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 rounded-lg"
            >
              Shortcuts
            </TabsTrigger>
            <TabsTrigger
              value="tips"
              className="text-slate-800 dark:text-slate-200 data-[state=active]:bg-violet-50 dark:data-[state=active]:bg-violet-900/30 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 rounded-lg"
            >
              Pro Tips
            </TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="mt-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-3 rounded-lg">
                      <Scissors className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1 text-slate-800 dark:text-slate-100">Precision Cutting</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Cut your audio with millisecond precision
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-3 rounded-lg">
                      <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1 text-slate-800 dark:text-slate-100">Audio Effects</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Apply professional effects to your audio
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-3 rounded-lg">
                      <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1 text-slate-800 dark:text-slate-100">Batch Processing</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Process multiple audio files at once</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-3 rounded-lg">
                      <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1 text-slate-800 dark:text-slate-100">Precise Time Control</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Fine-tune your cuts with millisecond accuracy
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Play/Pause</span>
                    <Badge
                      variant="outline"
                      className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                    >
                      Space
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Skip Forward</span>
                    <Badge
                      variant="outline"
                      className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                    >
                      →
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Skip Backward</span>
                    <Badge
                      variant="outline"
                      className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                    >
                      ←
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Set Start Point</span>
                    <Badge
                      variant="outline"
                      className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                    >
                      S
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Set End Point</span>
                    <Badge
                      variant="outline"
                      className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                    >
                      E
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Export</span>
                    <Badge
                      variant="outline"
                      className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                    >
                      Ctrl+E
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="mt-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
              <CardContent className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400"></div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Use the normalize feature to ensure consistent volume levels
                    </p>
                  </li>

                  <li className="flex items-start gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400"></div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Add fade in/out to avoid abrupt starts and endings
                    </p>
                  </li>

                  <li className="flex items-start gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400"></div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Save your project to continue editing later
                    </p>
                  </li>

                  <li className="flex items-start gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400"></div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Use WAV format for highest quality, MP3 for smaller file size
                    </p>
                  </li>

                  <li className="flex items-start gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-white dark:bg-slate-800">
                    <div className="bg-violet-50 dark:bg-violet-900/30 p-1 rounded-full mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400"></div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Use keyboard shortcuts for faster and more efficient editing
                    </p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
