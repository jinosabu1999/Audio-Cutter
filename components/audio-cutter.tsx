"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Upload,
  Play,
  Pause,
  Download,
  Home,
  Sliders,
  Settings,
  Sun,
  Moon,
  HelpCircle,
  Volume2,
  VolumeX,
  BookmarkPlus,
  Trash2,
  BarChart3,
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

  const [activeTab, setActiveTab] = useState<"home" | "editor" | "export">("home")
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([])
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64))
  const [showSpectrum, setShowSpectrum] = useState<boolean>(true)
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3">("wav")

  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile || !uploadedFile.type.startsWith("audio")) {
      addToast("Please select an audio file", "error")
      return
    }

    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl)

      const url = URL.createObjectURL(uploadedFile)
      setAudioUrl(url)
      setFile(uploadedFile)

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const arrayBuffer = await uploadedFile.arrayBuffer()
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setStartTime(0)
      setEndTime(buffer.duration)
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
    const samples = 200
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
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (!sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      sourceNodeRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)
    }

    audio.volume = isMuted ? 0 : volume
  }, [audioUrl, isMuted, volume])

  useEffect(() => {
    if (!showSpectrum || !analyserRef.current || !isPlaying) return

    const updateSpectrum = () => {
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount)
      analyserRef.current!.getByteFrequencyData(dataArray)
      setFrequencyData(new Uint8Array(dataArray.slice(0, 64)))
      animationFrameRef.current = requestAnimationFrame(updateSpectrum)
    }

    updateSpectrum()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [showSpectrum, isPlaying])

  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current
    const updateTime = () => {
      setCurrentTime(audio.currentTime)

      if (isPlaying && endTime > 0 && audio.currentTime >= endTime) {
        audio.pause()
        setIsPlaying(false)
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    return () => audio.removeEventListener("timeupdate", updateTime)
  }, [endTime, isPlaying])

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume()
      }
      audioRef.current.currentTime = Math.max(currentTime, startTime)
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seekTo = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(startTime, Math.min(time, endTime))
    setCurrentTime(audioRef.current.currentTime)
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
      a.download = `audio-${Date.now()}.${exportFormat}`
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
          seekTo(Math.max(currentTime - 5, 0))
          break
        case "ArrowRight":
          e.preventDefault()
          seekTo(Math.min(currentTime + 5, duration))
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
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, isMuted, currentTime, file, showHelp, duration])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Help Dialog */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
              <button onClick={() => setShowHelp(false)} className="btn-icon">
                ×
              </button>
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
                    { key: "?", action: "Help" },
                  ],
                },
              ].map((section, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-3 text-primary">{section.title}</h3>
                  <div className="space-y-2">
                    {section.shortcuts.map((s, j) => (
                      <div key={j} className="flex justify-between items-center">
                        <kbd
                          className="px-3 py-1.5 rounded-lg text-sm font-mono bg-secondary border border-border"
                          style={{ color: "hsl(0 0% 95%)" }}
                        >
                          {s.key}
                        </kbd>
                        <span className="text-sm" style={{ color: "hsl(0 0% 65%)" }}>
                          {s.action}
                        </span>
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
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: "hsl(0 0% 20%)",
          backgroundColor: "hsl(0 0% 12%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(280 85% 56%))",
              }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Modus Audio</h1>
              {file && (
                <p className="text-xs hidden sm:block" style={{ color: "hsl(0 0% 65%)" }}>
                  {file.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHelp(true)} className="btn-icon" title="Help">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={toggleTheme} className="btn-icon" title="Theme">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Home Tab */}
          {activeTab === "home" && !file && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="card p-8 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(280 85% 56%))",
                  }}
                >
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Professional Audio Editing</h2>
                <p className="text-muted-foreground mb-8">Cut, edit, and enhance your audio with precision</p>

                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button
                    className="btn-primary w-full"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Upload className="w-5 h-5" />
                    Select Audio File
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: "✂️", title: "Precise Cutting", desc: "Frame-accurate audio trimming" },
                  { icon: "📊", title: "Live Spectrum", desc: "Real-time frequency analysis" },
                  { icon: "⚡", title: "Fast Export", desc: "Multiple formats supported" },
                ].map((feature, i) => (
                  <div key={i} className="card p-6 text-center">
                    <div className="text-4xl mb-3">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor Tab */}
          {activeTab === "editor" && file && (
            <div className="space-y-6">
              {/* Waveform */}
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Waveform</h3>
                <div
                  onClick={handleWaveformClick}
                  className="w-full h-24 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    borderColor: "hsl(0 0% 25%)",
                    backgroundColor: "hsl(0 0% 8%)",
                  }}
                >
                  <div className="flex items-end gap-1 h-full w-full px-2 py-4">
                    {waveformData.map((v, i) => (
                      <div
                        key={i}
                        className="flex-1"
                        style={{
                          height: `${Math.max(10, v * 100)}%`,
                          background: "linear-gradient(180deg, hsl(217 91% 60%), hsl(280 85% 56%))",
                          borderRadius: "2px",
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Spectrum */}
                {showSpectrum && (
                  <div className="mt-4">
                    <div className="flex items-end gap-1 h-16 rounded-lg border p-3" style={{ borderColor: "hsl(0 0% 25%)" }}>
                      {frequencyData.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          style={{
                            height: `${Math.max(5, (v / 255) * 100)}%`,
                            background: `hsl(${Math.min(280, 200 + i * 2)} 85% 56%)`,
                            borderRadius: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm font-mono">{formatTime(currentTime)}</div>
                  <div className="flex-1 mx-4 h-1 bg-secondary rounded-full cursor-pointer" onClick={(e) => seekTo((e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * duration)}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(currentTime / duration) * 100}%`,
                        background: "linear-gradient(90deg, hsl(217 91% 60%), hsl(280 85% 56%))",
                      }}
                    />
                  </div>
                  <div className="text-sm font-mono">{formatTime(duration)}</div>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <button className="btn-icon" onClick={() => seekTo(Math.max(0, currentTime - 5))} title="Rewind 5s">
                    ⏪
                  </button>
                  <button
                    className="btn-primary"
                    onClick={togglePlayPause}
                    style={{ minWidth: "56px", minHeight: "56px" }}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button className="btn-icon" onClick={() => seekTo(Math.min(duration, currentTime + 5))} title="Forward 5s">
                    ⏩
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button className="btn-icon" onClick={() => setIsMuted(!isMuted)} title="Volume">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    className="flex-1 mx-4 h-1 rounded-full"
                    style={{
                      accentColor: "hsl(217 91% 60%)",
                    }}
                  />
                  <button className="btn-icon" onClick={addBookmark} title="Add bookmark">
                    <BookmarkPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Time Selection */}
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Time Selection</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Start Time</label>
                    <input
                      type="text"
                      value={formatTime(startTime)}
                      onChange={(e) => {
                        const parts = e.target.value.split(":")
                        const time = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0)
                        setStartTime(Math.max(0, Math.min(time, endTime)))
                      }}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">End Time</label>
                    <input
                      type="text"
                      value={formatTime(endTime)}
                      onChange={(e) => {
                        const parts = e.target.value.split(":")
                        const time = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0)
                        setEndTime(Math.max(startTime, Math.min(time, duration)))
                      }}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Bookmarks */}
              {bookmarks.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold mb-4">Bookmarks</h3>
                  <div className="space-y-2">
                    {bookmarks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <button onClick={() => seekTo(b.time)} className="flex-1 text-left hover:text-primary transition-colors">
                          {b.label}
                        </button>
                        <button onClick={() => removeBookmark(b.id)} className="btn-icon">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === "export" && file && (
            <div className="max-w-2xl mx-auto">
              <div className="card p-8">
                <h3 className="text-2xl font-bold mb-6">Export Audio</h3>

                <div className="mb-6">
                  <label className="text-sm font-medium block mb-2">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as "wav" | "mp3")}
                    className="input-field w-full"
                  >
                    <option value="wav">WAV (Uncompressed)</option>
                    <option value="mp3">MP3 (Compressed)</option>
                  </select>
                </div>

                <div className="mb-6 p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm mb-2">
                    <strong>Selection:</strong> {formatTime(startTime)} to {formatTime(endTime)}
                  </p>
                  <p className="text-sm">
                    <strong>Duration:</strong> {formatTime(endTime - startTime)}
                  </p>
                </div>

                <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={exportAudio}>
                  <Download className="w-5 h-5" />
                  Export Audio
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t flex items-center justify-around h-20 max-w-full"
        style={{
          borderColor: "hsl(0 0% 20%)",
          backgroundColor: "hsl(0 0% 12%)",
        }}
      >
        {[
          { tab: "home", label: "Home", icon: <Home className="w-6 h-6" /> },
          { tab: "editor", label: "Editor", icon: <Sliders className="w-6 h-6" /> },
          { tab: "export", label: "Export", icon: <Download className="w-6 h-6" /> },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab as any)}
            className="flex flex-col items-center gap-1 p-4 transition-colors"
            style={{
              color: activeTab === item.tab ? "hsl(217 91% 60%)" : "hsl(0 0% 65%)",
            }}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
