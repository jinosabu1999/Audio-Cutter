// Advanced export management utilities

export interface AudioMetadata {
  title?: string
  artist?: string
  album?: string
  year?: string
  genre?: string
  comment?: string
  trackNumber?: string
  albumArt?: Blob
}

export interface ExportOptions {
  format: "wav" | "mp3" | "ogg" | "flac" | "aac"
  quality: "low" | "medium" | "high" | "ultra"
  sampleRate?: number
  bitDepth?: 16 | 24 | 32
  channels?: 1 | 2
  metadata?: AudioMetadata
  dithering?: boolean
}

export interface ExportPreset {
  id: string
  name: string
  description: string
  options: ExportOptions
}

export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "podcast",
    name: "Podcast",
    description: "Optimized for podcast distribution (MP3, 128kbps, mono)",
    options: {
      format: "mp3",
      quality: "medium",
      sampleRate: 44100,
      channels: 1,
      dithering: false,
    },
  },
  {
    id: "streaming",
    name: "Streaming",
    description: "High quality for streaming platforms (MP3, 320kbps)",
    options: {
      format: "mp3",
      quality: "ultra",
      sampleRate: 48000,
      channels: 2,
      dithering: false,
    },
  },
  {
    id: "archival",
    name: "Archival",
    description: "Lossless archival quality (WAV, 24-bit)",
    options: {
      format: "wav",
      quality: "ultra",
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      dithering: false,
    },
  },
  {
    id: "mobile",
    name: "Mobile",
    description: "Smaller file size for mobile (MP3, 96kbps)",
    options: {
      format: "mp3",
      quality: "low",
      sampleRate: 44100,
      channels: 2,
      dithering: false,
    },
  },
  {
    id: "mastering",
    name: "Mastering",
    description: "Studio mastering quality (WAV, 32-bit float)",
    options: {
      format: "wav",
      quality: "ultra",
      sampleRate: 96000,
      bitDepth: 32,
      channels: 2,
      dithering: false,
    },
  },
]

export class ExportManager {
  private customPresets: ExportPreset[] = []

  constructor() {
    this.loadCustomPresets()
  }

  getAllPresets(): ExportPreset[] {
    return [...DEFAULT_EXPORT_PRESETS, ...this.customPresets]
  }

  addCustomPreset(preset: Omit<ExportPreset, "id">): ExportPreset {
    const newPreset: ExportPreset = {
      ...preset,
      id: `custom_${Date.now()}`,
    }
    this.customPresets.push(newPreset)
    this.saveCustomPresets()
    return newPreset
  }

  removeCustomPreset(id: string): void {
    this.customPresets = this.customPresets.filter((p) => p.id !== id)
    this.saveCustomPresets()
  }

  private loadCustomPresets(): void {
    try {
      const saved = localStorage.getItem("audioforge_custom_presets")
      if (saved) {
        this.customPresets = JSON.parse(saved)
      }
    } catch (e) {
      console.error("Error loading custom presets:", e)
    }
  }

  private saveCustomPresets(): void {
    try {
      localStorage.setItem("audioforge_custom_presets", JSON.stringify(this.customPresets))
    } catch (e) {
      console.error("Error saving custom presets:", e)
    }
  }

  // Get quality settings
  getQualitySettings(quality: string): { bitrate?: number; quality?: number } {
    switch (quality) {
      case "low":
        return { bitrate: 96, quality: 5 }
      case "medium":
        return { bitrate: 192, quality: 3 }
      case "high":
        return { bitrate: 256, quality: 2 }
      case "ultra":
        return { bitrate: 320, quality: 0 }
      default:
        return { bitrate: 192, quality: 3 }
    }
  }
}

// Convert AudioBuffer to WAV with custom settings
export function audioBufferToWav(
  buffer: AudioBuffer,
  options: ExportOptions = { format: "wav", quality: "high" },
): ArrayBuffer {
  const numChannels = options.channels || buffer.numberOfChannels
  const sampleRate = options.sampleRate || buffer.sampleRate
  const bitDepth = options.bitDepth || 16
  const bytesPerSample = bitDepth / 8

  // Resample if needed
  let processedBuffer = buffer
  if (sampleRate !== buffer.sampleRate) {
    processedBuffer = resampleBuffer(buffer, sampleRate)
  }

  // Mix to mono if needed
  if (numChannels === 1 && buffer.numberOfChannels > 1) {
    processedBuffer = mixToMono(processedBuffer)
  }

  const length = processedBuffer.length * numChannels * bytesPerSample
  const wav = new DataView(new ArrayBuffer(44 + length))

  // RIFF chunk descriptor
  writeString(wav, 0, "RIFF")
  wav.setUint32(4, 36 + length, true)
  writeString(wav, 8, "WAVE")

  // FMT sub-chunk
  writeString(wav, 12, "fmt ")
  wav.setUint32(16, 16, true)
  wav.setUint16(20, bitDepth === 32 ? 3 : 1, true) // PCM or IEEE float
  wav.setUint16(22, numChannels, true)
  wav.setUint32(24, sampleRate, true)
  wav.setUint32(28, sampleRate * bytesPerSample * numChannels, true)
  wav.setUint16(32, bytesPerSample * numChannels, true)
  wav.setUint16(34, bitDepth, true)

  // Data sub-chunk
  writeString(wav, 36, "data")
  wav.setUint32(40, length, true)

  // Write samples
  const dataOffset = 44
  let offset = dataOffset

  for (let i = 0; i < processedBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = processedBuffer.getChannelData(channel)[i]

      if (bitDepth === 16) {
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        wav.setInt16(offset, int16, true)
        offset += 2
      } else if (bitDepth === 24) {
        const int24 = sample < 0 ? sample * 0x800000 : sample * 0x7fffff
        const bytes = [int24 & 0xff, (int24 >> 8) & 0xff, (int24 >> 16) & 0xff]
        bytes.forEach((byte) => wav.setUint8(offset++, byte))
      } else if (bitDepth === 32) {
        wav.setFloat32(offset, sample, true)
        offset += 4
      }
    }
  }

  return wav.buffer
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const ratio = targetSampleRate / buffer.sampleRate
  const newLength = Math.floor(buffer.length * ratio)
  const resampled = audioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const resampledData = resampled.getChannelData(channel)

    for (let i = 0; i < newLength; i++) {
      const position = i / ratio
      const index = Math.floor(position)
      const fraction = position - index

      if (index + 1 < buffer.length) {
        resampledData[i] = originalData[index] * (1 - fraction) + originalData[index + 1] * fraction
      } else if (index < buffer.length) {
        resampledData[i] = originalData[index]
      }
    }
  }

  return resampled
}

function mixToMono(buffer: AudioBuffer): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const mono = audioContext.createBuffer(1, buffer.length, buffer.sampleRate)
  const monoData = mono.getChannelData(0)

  for (let i = 0; i < buffer.length; i++) {
    let sum = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      sum += buffer.getChannelData(channel)[i]
    }
    monoData[i] = sum / buffer.numberOfChannels
  }

  return mono
}

// Extract audio from video file
export async function extractAudioFromVideo(videoFile: File): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    video.src = URL.createObjectURL(videoFile)

    video.addEventListener("loadedmetadata", async () => {
      try {
        const offlineContext = new OfflineAudioContext(
          2,
          Math.floor(video.duration * audioContext.sampleRate),
          audioContext.sampleRate,
        )

        const source = offlineContext.createMediaElementSource(video)
        source.connect(offlineContext.destination)

        video.play()
        const buffer = await offlineContext.startRendering()

        URL.revokeObjectURL(video.src)
        resolve(buffer)
      } catch (error) {
        reject(error)
      }
    })

    video.addEventListener("error", () => {
      URL.revokeObjectURL(video.src)
      reject(new Error("Failed to load video"))
    })
  })
}

// Batch processing
export interface BatchJob {
  id: string
  file: File
  status: "pending" | "processing" | "complete" | "error"
  progress: number
  error?: string
  result?: Blob
}

export class BatchProcessor {
  private jobs: BatchJob[] = []
  private onUpdate?: (jobs: BatchJob[]) => void

  addFiles(files: File[]): void {
    const newJobs = files.map((file) => ({
      id: `job_${Date.now()}_${Math.random()}`,
      file,
      status: "pending" as const,
      progress: 0,
    }))

    this.jobs.push(...newJobs)
    this.notifyUpdate()
  }

  async processAll(
    processor: (file: File, updateProgress: (progress: number) => void) => Promise<Blob>,
  ): Promise<void> {
    for (const job of this.jobs) {
      if (job.status !== "pending") continue

      job.status = "processing"
      this.notifyUpdate()

      try {
        job.result = await processor(job.file, (progress) => {
          job.progress = progress
          this.notifyUpdate()
        })
        job.status = "complete"
        job.progress = 100
      } catch (error) {
        job.status = "error"
        job.error = error instanceof Error ? error.message : "Unknown error"
      }

      this.notifyUpdate()
    }
  }

  getJobs(): BatchJob[] {
    return [...this.jobs]
  }

  clearJobs(): void {
    this.jobs = []
    this.notifyUpdate()
  }

  removeJob(id: string): void {
    this.jobs = this.jobs.filter((j) => j.id !== id)
    this.notifyUpdate()
  }

  onJobsUpdate(callback: (jobs: BatchJob[]) => void): void {
    this.onUpdate = callback
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getJobs())
    }
  }
}
