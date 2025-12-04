// Advanced selection management utilities

export interface Region {
  id: string
  start: number
  end: number
  color?: string
  label?: string
}

export interface LoopMarker {
  id: string
  position: number
  label: string
}

export class SelectionManager {
  private regions: Region[] = []
  private loopMarkers: LoopMarker[] = []
  private selectionHistory: { start: number; end: number }[] = []
  private historyIndex = -1
  private snapEnabled = false
  private snapInterval = 0.1 // seconds

  // Multi-region selection
  addRegion(start: number, end: number, label?: string): Region {
    const region: Region = {
      id: `region_${Date.now()}_${Math.random()}`,
      start: Math.min(start, end),
      end: Math.max(start, end),
      color: this.getRandomColor(),
      label,
    }
    this.regions.push(region)
    return region
  }

  removeRegion(id: string): void {
    this.regions = this.regions.filter((r) => r.id !== id)
  }

  getRegions(): Region[] {
    return [...this.regions]
  }

  clearRegions(): void {
    this.regions = []
  }

  // Loop markers
  addLoopMarker(position: number, label: string): LoopMarker {
    const marker: LoopMarker = {
      id: `marker_${Date.now()}_${Math.random()}`,
      position,
      label,
    }
    this.loopMarkers.push(marker)
    this.loopMarkers.sort((a, b) => a.position - b.position)
    return marker
  }

  removeLoopMarker(id: string): void {
    this.loopMarkers = this.loopMarkers.filter((m) => m.id !== id)
  }

  getLoopMarkers(): LoopMarker[] {
    return [...this.loopMarkers]
  }

  clearLoopMarkers(): void {
    this.loopMarkers = []
  }

  // Selection history
  saveSelection(start: number, end: number): void {
    // Remove any selections after current position
    this.selectionHistory = this.selectionHistory.slice(0, this.historyIndex + 1)

    this.selectionHistory.push({ start, end })
    this.historyIndex++

    // Limit history to 50 items
    if (this.selectionHistory.length > 50) {
      this.selectionHistory.shift()
      this.historyIndex--
    }
  }

  undoSelection(): { start: number; end: number } | null {
    if (this.historyIndex > 0) {
      this.historyIndex--
      return this.selectionHistory[this.historyIndex]
    }
    return null
  }

  redoSelection(): { start: number; end: number } | null {
    if (this.historyIndex < this.selectionHistory.length - 1) {
      this.historyIndex++
      return this.selectionHistory[this.historyIndex]
    }
    return null
  }

  canUndo(): boolean {
    return this.historyIndex > 0
  }

  canRedo(): boolean {
    return this.historyIndex < this.selectionHistory.length - 1
  }

  // Snap to grid
  enableSnap(interval: number): void {
    this.snapEnabled = true
    this.snapInterval = interval
  }

  disableSnap(): void {
    this.snapEnabled = false
  }

  isSnapEnabled(): boolean {
    return this.snapEnabled
  }

  setSnapInterval(interval: number): void {
    this.snapInterval = interval
  }

  getSnapInterval(): number {
    return this.snapInterval
  }

  snapTime(time: number): number {
    if (!this.snapEnabled) return time
    return Math.round(time / this.snapInterval) * this.snapInterval
  }

  // Find nearest snap point
  findNearestSnapPoint(time: number): number {
    const snappedTime = this.snapTime(time)

    // Also check loop markers
    let nearest = snappedTime
    let minDistance = Math.abs(time - snappedTime)

    for (const marker of this.loopMarkers) {
      const distance = Math.abs(time - marker.position)
      if (distance < minDistance && distance < this.snapInterval) {
        nearest = marker.position
        minDistance = distance
      }
    }

    return nearest
  }

  // Utility
  private getRandomColor(): string {
    const colors = [
      "#ef4444", // red
      "#f59e0b", // amber
      "#10b981", // emerald
      "#3b82f6", // blue
      "#8b5cf6", // violet
      "#ec4899", // pink
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
}

// Beat detection utilities
export interface BeatInfo {
  bpm: number
  beats: number[] // timestamps of detected beats
  confidence: number
}

export async function detectBeats(buffer: AudioBuffer): Promise<BeatInfo> {
  const channelData = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate

  // Simple energy-based beat detection
  const windowSize = Math.floor(sampleRate * 0.05) // 50ms windows
  const energies: number[] = []

  for (let i = 0; i < channelData.length; i += windowSize) {
    let energy = 0
    for (let j = 0; j < windowSize && i + j < channelData.length; j++) {
      energy += channelData[i + j] * channelData[i + j]
    }
    energies.push(energy)
  }

  // Find peaks (potential beats)
  const threshold = (energies.reduce((a, b) => a + b, 0) / energies.length) * 1.5
  const beats: number[] = []

  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      const time = (i * windowSize) / sampleRate
      beats.push(time)
    }
  }

  // Estimate BPM
  if (beats.length < 2) {
    return { bpm: 0, beats: [], confidence: 0 }
  }

  const intervals = []
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i] - beats[i - 1])
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const bpm = 60 / avgInterval

  // Calculate confidence based on interval consistency
  const variance =
    intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2)
    }, 0) / intervals.length

  const confidence = Math.max(0, 1 - variance * 10)

  return { bpm, beats, confidence }
}

// Selection presets
export interface SelectionPreset {
  id: string
  name: string
  description: string
  calculate: (duration: number) => { start: number; end: number }
}

export const SELECTION_PRESETS: SelectionPreset[] = [
  {
    id: "first_10s",
    name: "First 10 Seconds",
    description: "Select the first 10 seconds",
    calculate: (duration) => ({ start: 0, end: Math.min(10, duration) }),
  },
  {
    id: "last_10s",
    name: "Last 10 Seconds",
    description: "Select the last 10 seconds",
    calculate: (duration) => ({ start: Math.max(0, duration - 10), end: duration }),
  },
  {
    id: "first_quarter",
    name: "First Quarter",
    description: "Select the first 25% of audio",
    calculate: (duration) => ({ start: 0, end: duration * 0.25 }),
  },
  {
    id: "middle_half",
    name: "Middle Half",
    description: "Select the middle 50% of audio",
    calculate: (duration) => ({ start: duration * 0.25, end: duration * 0.75 }),
  },
  {
    id: "last_quarter",
    name: "Last Quarter",
    description: "Select the last 25% of audio",
    calculate: (duration) => ({ start: duration * 0.75, end: duration }),
  },
]
