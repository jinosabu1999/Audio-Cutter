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
  Download,
  BookmarkPlus,
  Waves,
  Sliders,
  SkipBack,
  SkipForward,
  Repeat,
  Sun,
  Moon,
  HomeIcon,
  Music2,
  Sparkles,
  BarChart3,
  HelpCircle,
  FolderOpen,
  Undo2,
  Redo2,
  Zap,
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

interface HistoryState {
  startTime: number
  endTime: number
}

interface EffectSettings {
  eq: { low: number; mid: number; high: number }
  compressor: number
  reverb: number
  delay: number
  highpass: number
  lowpass: number
}

const defaultEffects: EffectSettings = {
  eq: { low: 0, mid: 0, high: 0 },
  compressor: 0,
  reverb: 0,
  delay: 0,
  highpass: 20,
  lowpass: 20000,
}

const bookmarkColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function AudioCutter() {
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isLooping, setIsLooping] = useState<boolean>(false)

  const [activeTab, setActiveTab] = useState<string>("home")
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([])
  const [effects, setEffects] = useState<EffectSettings>(defaultEffects)
  const [exportFormat, setExportFormat] = useState<string>("wav")
  const [normalize, setNormalize] = useState<boolean>(false)

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [showSpectrum, setShowSpectrum] = useState<boolean>(false)
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64))
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const [projectName, setProjectName] = useState<string>("")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const handleFileUpload = async (uploadedFile: File) => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }

      const url = URL.createObjectURL(uploadedFile)
      setAudioUrl(url)
      setFile(uploadedFile)
      setProjectName(uploadedFile.name.replace(/\.[^/.]+$/, ""))

      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      // Decode audio
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setStartTime(0)
      setEndTime(buffer.duration)

      // Generate waveform
      generateWaveformData(buffer)

      addToast("Audio loaded successfully!", "success")
      setActiveTab("editor")
    } catch (error) {
      console.error("File upload failed:", error)
      addToast("Failed to load audio file", "error")
    }
  }

  const generateWaveformData = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0)
    const samples = 100
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData: number[] = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j])
      }
      filteredData.push(sum / blockSize)
    }

    const maxVal = Math.max(...filteredData, 0.01)
    setWaveformData(filteredData.map((v) => v / maxVal))
  }

  useEffect(() => {
    if (!audioRef.current || !audioUrl) return

    const audio = audioRef.current
    audio.src = audioUrl

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    if (!sourceNodeRef.current) {
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      sourceNodeRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)
    }

    audio.volume = isMuted ? 0 : volume
    audio.playbackRate = playbackSpeed

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [audioUrl])

  useEffect(() => {
    if (!showSpectrum || !analyserRef.current || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const updateSpectrum = () => {
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount)
      analyserRef.current!.getByteFrequencyData(dataArray)
      setFrequencyData(new Uint8Array(dataArray.slice(0, 64)))
      animationFrameRef.current = requestAnimationFrame(updateSpectrum)
    }

    updateSpectrum()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [showSpectrum, isPlaying])

  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current
    const updateTime = () => {
      setCurrentTime(audio.currentTime)
    }

    audio.addEventListener("timeupdate", updateTime)
    return () => audio.removeEventListener("timeupdate", updateTime)
  }, [audioUrl])

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume()
      }
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seekTo = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const skipForward = () => seekTo(Math.min(currentTime + 5, duration))
  const skipBackward = () => seekTo(Math.max(currentTime - 5, 0))

  const saveToHistory = useCallback(() => {
    const newState: HistoryState = { startTime, endTime }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    if (newHistory.length > 20) newHistory.shift()
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [startTime, endTime, history, historyIndex])

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setStartTime(prevState.startTime)
      setEndTime(prevState.endTime)
      setHistoryIndex(historyIndex - 1)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setStartTime(nextState.startTime)
      setEndTime(nextState.endTime)
      setHistoryIndex(historyIndex + 1)
    }
  }

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickTime = (x / rect.width) * duration
    seekTo(clickTime)
  }

  const addBookmark = () => {
    const newBookmark: AudioBookmark = {
      id: Date.now().toString(),
      time: currentTime,
      label: formatTime(currentTime),
      color: bookmarkColors[bookmarks.length % bookmarkColors.length],
    }
    setBookmarks([...bookmarks, newBookmark])
    addToast("Bookmark added", "success")
  }

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id))
  }

  const exportAudio = async () => {
    if (!audioBuffer) return

    try {
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(startTime * sampleRate)
      const endSample = Math.floor(endTime * sampleRate)
      const length = endSample - startSample

      const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, length, sampleRate)
      const newBuffer = offlineContext.createBuffer(audioBuffer.numberOfChannels, length, sampleRate)

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          newData[i] = oldData[startSample + i]
        }
      }

      const source = offlineContext.createBufferSource()
      source.buffer = newBuffer
      source.connect(offlineContext.destination)
      source.start()

      const renderedBuffer = await offlineContext.startRendering()
      const wavBlob = audioBufferToWav(renderedBuffer)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName || "audio"}.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)

      addToast("Export complete!", "success")
    } catch (error) {
      console.error("Export failed:", error)
      addToast("Export failed", "error")
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case " ":
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft":
          e.preventDefault()
          skipBackward()
          break
        case "ArrowRight":
          e.preventDefault()
          skipForward()
          break
        case "m":
          setIsMuted(!isMuted)
          break
        case "b":
          if (file) addBookmark()
          break
        case "?":
          setShowHelp(!showHelp)
          break
        case "z":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            if (e.shiftKey) redo()
            else undo()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, isMuted, currentTime, file, showHelp, historyIndex, history.length])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <audio ref={audioRef} />

      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
              <Button onClick={() => setShowHelp(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Playback",
                  shortcuts: [
                    { key: "Space", action: "Play/Pause" },
                    { key: "← →", action: "Skip 5s" },
                    { key: "M", action: "Mute" },
                  ],
                },
                {
                  title: "Editing",
                  shortcuts: [
                    { key: "B", action: "Add bookmark" },
                    { key: "Cmd+Z", action: "Undo" },
                    { key: "Cmd+Shift+Z", action: "Redo" },
                  ],
                },
              ].map((section, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-3 text-primary">{section.title}</h3>
                  <div className="space-y-2">
                    {section.shortcuts.map((s, j) => (
                      <div key={j} className="flex justify-between items-center">
                        <kbd className="px-3 py-1.5 bg-secondary rounded-lg text-sm font-mono">{s.key}</kbd>
                        <span className="text-sm text-muted-foreground">{s.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Modus Audio</h1>
              {file && <p className="text-xs text-muted-foreground hidden sm:block">{file.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowHelp(true)} className="btn-icon">
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button onClick={toggleTheme} className="btn-icon">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-24 overflow-y-auto">
        {/* Home Tab */}
        {activeTab === "home" && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Upload Section */}
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Music2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Professional Audio Editing</h2>
              <p className="text-muted-foreground mb-6">Cut, edit, and enhance your audio with precision</p>

              <label className="btn-primary cursor-pointer inline-flex">
                <Upload className="w-5 h-5" />
                <span>Upload Audio File</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Scissors, title: "Precise Cutting", desc: "Frame-accurate audio trimming" },
                { icon: Sparkles, title: "Pro Effects", desc: "EQ, compression, reverb & more" },
                { icon: BarChart3, title: "Live Spectrum", desc: "Real-time frequency analysis" },
                { icon: Zap, title: "Fast Export", desc: "Multiple formats supported" },
              ].map((feature, i) => (
                <div key={i} className="card p-6 hover:border-primary/50 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Quick Tips */}
            <div className="card p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Tips
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Use Space bar to play/pause quickly</li>
                <li>• Press B to add bookmarks at important moments</li>
                <li>• Click the waveform to seek to any position</li>
                <li>• Press ? to view all keyboard shortcuts</li>
              </ul>
            </div>
          </div>
        )}

        {/* Editor Tab */}
        {activeTab === "editor" && file && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Project Name */}
            <div className="card p-4">
              <Label className="text-sm mb-2 block">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Audio Project"
                className="max-w-md"
              />
            </div>

            {/* Spectrum Analyzer */}
            {showSpectrum && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Live Spectrum
                  </h3>
                  <Button onClick={() => setShowSpectrum(false)} className="btn-icon">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-32 bg-secondary/30 rounded-xl flex items-end justify-center gap-1 p-4">
                  {Array.from(frequencyData).map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t-full transition-all duration-75"
                      style={{ height: `${Math.max(4, (value / 255) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Waveform */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Waves className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Waveform</span>
                  <span className="badge badge-primary">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!showSpectrum && (
                    <Button onClick={() => setShowSpectrum(true)} size="sm" variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Show Spectrum
                    </Button>
                  )}
                  <Button onClick={addBookmark} size="sm" variant="outline">
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    Bookmark
                  </Button>
                </div>
              </div>

              {/* Waveform Display */}
              <div
                className="relative h-32 sm:h-40 bg-secondary/30 rounded-xl cursor-pointer overflow-hidden"
                onClick={handleWaveformClick}
              >
                {/* Selection Highlight */}
                <div
                  className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`,
                  }}
                />

                {/* Waveform Bars */}
                <div className="absolute inset-0 flex items-center gap-1 px-4">
                  {waveformData.map((value, i) => {
                    const time = (i / waveformData.length) * duration
                    const isInSelection = time >= startTime && time <= endTime
                    const isPassed = time <= currentTime

                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-full transition-all duration-75",
                          isInSelection
                            ? isPassed
                              ? "bg-primary"
                              : "bg-primary/50"
                            : isPassed
                              ? "bg-muted-foreground/50"
                              : "bg-muted-foreground/20",
                        )}
                        style={{ height: `${Math.max(10, value * 90)}%` }}
                      />
                    )
                  })}
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-accent z-10"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full" />
                </div>

                {/* Bookmarks */}
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="absolute top-0 bottom-0 w-1 cursor-pointer z-20 group"
                    style={{ left: `${(bookmark.time / duration) * 100}%`, backgroundColor: bookmark.color }}
                    onClick={(e) => {
                      e.stopPropagation()
                      seekTo(bookmark.time)
                    }}
                  >
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full group-hover:scale-150 transition-transform"
                      style={{ backgroundColor: bookmark.color }}
                    />
                  </div>
                ))}
              </div>

              {/* Time Labels */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{formatTime(0)}</span>
                <span className="text-primary font-semibold">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="card p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Transport Controls */}
                <div className="flex items-center gap-2">
                  <Button onClick={skipBackward} className="btn-icon">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button onClick={togglePlayPause} className="btn-primary">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  <Button onClick={skipForward} className="btn-icon">
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => setIsLooping(!isLooping)}
                    className={cn("btn-icon", isLooping && "bg-primary/20")}
                  >
                    <Repeat className="w-5 h-5" />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button onClick={() => setIsMuted(!isMuted)} className="btn-icon">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={(v) => {
                      setVolume(v[0])
                      setIsMuted(false)
                      if (audioRef.current) audioRef.current.volume = v[0]
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-24"
                  />
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <Button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed)
                        if (audioRef.current) audioRef.current.playbackRate = speed
                      }}
                      size="sm"
                      variant={playbackSpeed === speed ? "default" : "outline"}
                      className="min-w-[50px]"
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                Selection
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm mb-2 block">Start Time</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={startTime.toFixed(2)}
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value)
                        if (val >= 0 && val < endTime) {
                          saveToHistory()
                          setStartTime(val)
                        }
                      }}
                      step="0.1"
                      className="flex-1"
                    />
                    <Button onClick={() => setStartTime(currentTime)} variant="outline">
                      Set
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">End Time</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={endTime.toFixed(2)}
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value)
                        if (val > startTime && val <= duration) {
                          saveToHistory()
                          setEndTime(val)
                        }
                      }}
                      step="0.1"
                      className="flex-1"
                    />
                    <Button onClick={() => setEndTime(currentTime)} variant="outline">
                      Set
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Select */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    saveToHistory()
                    setStartTime(0)
                    setEndTime(Math.min(10, duration))
                  }}
                  size="sm"
                  variant="outline"
                >
                  First 10s
                </Button>
                <Button
                  onClick={() => {
                    saveToHistory()
                    setStartTime(Math.max(0, duration - 10))
                    setEndTime(duration)
                  }}
                  size="sm"
                  variant="outline"
                >
                  Last 10s
                </Button>
                <Button
                  onClick={() => {
                    saveToHistory()
                    setStartTime(0)
                    setEndTime(duration)
                  }}
                  size="sm"
                  variant="outline"
                >
                  Select All
                </Button>
              </div>
            </div>

            {/* Bookmarks List */}
            {bookmarks.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Bookmarks</h3>
                <div className="space-y-2">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bookmark.color }} />
                        <span className="font-mono text-sm">{bookmark.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => seekTo(bookmark.time)} size="sm" variant="ghost">
                          Jump
                        </Button>
                        <Button onClick={() => removeBookmark(bookmark.id)} size="sm" variant="ghost">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Controls */}
            <div className="flex items-center gap-2">
              <Button onClick={undo} disabled={historyIndex <= 0} size="sm" variant="outline">
                <Undo2 className="w-4 h-4 mr-2" />
                Undo
              </Button>
              <Button onClick={redo} disabled={historyIndex >= history.length - 1} size="sm" variant="outline">
                <Redo2 className="w-4 h-4 mr-2" />
                Redo
              </Button>
            </div>
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === "effects" && file && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Sliders className="w-6 h-6 text-primary" />
                Audio Effects
              </h2>

              {/* EQ */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Equalizer</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Low", key: "low" as const },
                    { label: "Mid", key: "mid" as const },
                    { label: "High", key: "high" as const },
                  ].map((band) => (
                    <div key={band.key}>
                      <Label className="text-sm mb-2 block">{band.label}</Label>
                      <Slider
                        value={[effects.eq[band.key]]}
                        onValueChange={(v) => setEffects({ ...effects, eq: { ...effects.eq, [band.key]: v[0] } })}
                        min={-12}
                        max={12}
                        step={0.5}
                      />
                      <div className="text-xs text-center mt-1 text-muted-foreground">{effects.eq[band.key]} dB</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Effects */}
              <div className="space-y-6">
                {[
                  { label: "Compressor", key: "compressor" as const, min: 0, max: 100, unit: "%" },
                  { label: "Reverb", key: "reverb" as const, min: 0, max: 100, unit: "%" },
                  { label: "Delay", key: "delay" as const, min: 0, max: 100, unit: "%" },
                ].map((effect) => (
                  <div key={effect.key}>
                    <div className="flex justify-between mb-2">
                      <Label className="text-sm">{effect.label}</Label>
                      <span className="text-sm text-muted-foreground">
                        {effects[effect.key]}
                        {effect.unit}
                      </span>
                    </div>
                    <Slider
                      value={[effects[effect.key]]}
                      onValueChange={(v) => setEffects({ ...effects, [effect.key]: v[0] })}
                      min={effect.min}
                      max={effect.max}
                      step={1}
                    />
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4">Filters</h3>
                <div className="space-y-6">
                  {[
                    { label: "High Pass", key: "highpass" as const, min: 20, max: 2000, unit: "Hz" },
                    { label: "Low Pass", key: "lowpass" as const, min: 1000, max: 20000, unit: "Hz" },
                  ].map((filter) => (
                    <div key={filter.key}>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">{filter.label}</Label>
                        <span className="text-sm text-muted-foreground">
                          {effects[filter.key]} {filter.unit}
                        </span>
                      </div>
                      <Slider
                        value={[effects[filter.key]]}
                        onValueChange={(v) => setEffects({ ...effects, [filter.key]: v[0] })}
                        min={filter.min}
                        max={filter.max}
                        step={10}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <Button onClick={() => setEffects(defaultEffects)} variant="outline" className="mt-6 w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Effects
              </Button>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && file && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Download className="w-6 h-6 text-primary" />
                Export Audio
              </h2>

              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wav">WAV (Lossless)</SelectItem>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="ogg">OGG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div>
                    <div className="font-medium">Normalize Audio</div>
                    <div className="text-sm text-muted-foreground">Balance volume levels</div>
                  </div>
                  <Switch checked={normalize} onCheckedChange={setNormalize} />
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-sm mb-2">
                    <strong>Selection:</strong> {formatTime(startTime)} - {formatTime(endTime)}
                  </div>
                  <div className="text-sm">
                    <strong>Duration:</strong> {formatTime(endTime - startTime)}
                  </div>
                </div>

                <Button onClick={exportAudio} className="btn-primary w-full">
                  <Download className="w-5 h-5 mr-2" />
                  Export Audio
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-6 text-center">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Saved Projects</h3>
              <p className="text-muted-foreground mb-6">Start editing audio to create your first project</p>
              <Button onClick={() => setActiveTab("home")} variant="outline">
                Go to Home
              </Button>
            </div>
          </div>
        )}

        {/* Empty State for Editor/Effects/Export */}
        {!file && activeTab !== "home" && activeTab !== "projects" && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-12 text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Audio Loaded</h3>
              <p className="text-muted-foreground mb-6">Upload an audio file to start editing</p>
              <Button onClick={() => setActiveTab("home")} className="btn-primary">
                Go to Home
              </Button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-around h-20">
            {[
              { id: "home", icon: HomeIcon, label: "Home" },
              { id: "editor", icon: Scissors, label: "Editor" },
              { id: "effects", icon: Sliders, label: "Effects" },
              { id: "export", icon: Download, label: "Export" },
              { id: "projects", icon: FolderOpen, label: "Projects" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.id !== "home" && tab.id !== "projects" && !file}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                  activeTab === tab.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                  tab.id !== "home" && tab.id !== "projects" && !file && "opacity-40 cursor-not-allowed",
                )}
              >
                <tab.icon className={cn("w-6 h-6 transition-transform", activeTab === tab.id && "scale-110")} />
                <span className="text-[10px] sm:text-xs font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
