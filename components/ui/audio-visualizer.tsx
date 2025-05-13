"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"

interface AudioVisualizerProps {
  data: number[]
  currentTime: number
  duration: number
  startTime: number
  endTime: number
  onTimeUpdate: (time: number) => void
  isPlaying: boolean
  zoomLevel?: number
}

export function AudioVisualizer({
  data,
  currentTime,
  duration,
  startTime,
  endTime,
  onTimeUpdate,
  isPlaying,
  zoomLevel = 1,
}: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState<"playhead" | "startMarker" | "endMarker" | null>(null)

  // Calculate visible range based on zoom level
  const visibleDuration = duration / zoomLevel
  const visibleStartTime = Math.max(0, currentTime - visibleDuration / 2)
  const visibleEndTime = Math.min(duration, visibleStartTime + visibleDuration)

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    const milliseconds = Math.floor((seconds % 1) * 100)
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
  }

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = visibleStartTime + percentage * (visibleEndTime - visibleStartTime)

    setHoveredTime(Math.max(0, Math.min(duration, time)))

    if (isDragging && dragTarget) {
      if (dragTarget === "playhead") {
        onTimeUpdate(Math.max(0, Math.min(duration, time)))
      } else if (dragTarget === "startMarker") {
        // Ensure start time doesn't exceed end time
        const newStartTime = Math.max(0, Math.min(endTime - 0.1, time))
        // We would need to update the parent component's state here
        // For now, we'll just call onTimeUpdate to show the concept
        onTimeUpdate(newStartTime)
      } else if (dragTarget === "endMarker") {
        // Ensure end time doesn't precede start time
        const newEndTime = Math.max(startTime + 0.1, Math.min(duration, time))
        // We would need to update the parent component's state here
        onTimeUpdate(newEndTime)
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent, target: "playhead" | "startMarker" | "endMarker" | "waveform") => {
    setIsDragging(true)
    setDragTarget(target === "waveform" ? "playhead" : target)

    if (target === "waveform") {
      handleMouseMove(e) // Update time immediately on click
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragTarget(null)
  }

  const handleMouseLeave = () => {
    setHoveredTime(null)
    if (isDragging) {
      setIsDragging(false)
      setDragTarget(null)
    }
  }

  // Add global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragTarget(null)
      }
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [isDragging])

  // Calculate positions for UI elements
  const getPositionPercentage = (time: number) => {
    return ((time - visibleStartTime) / (visibleEndTime - visibleStartTime)) * 100
  }

  const playheadPosition = getPositionPercentage(currentTime)
  const startMarkerPosition = getPositionPercentage(startTime)
  const endMarkerPosition = getPositionPercentage(endTime)
  const hoveredPosition = hoveredTime !== null ? getPositionPercentage(hoveredTime) : null

  // Generate bars for visualization
  const generateBars = () => {
    // Filter data to only show what's in the visible range
    const visibleData = data.filter((_, index) => {
      const timeAtBar = (index / data.length) * duration
      return timeAtBar >= visibleStartTime && timeAtBar <= visibleEndTime
    })

    // If no data, generate placeholder data
    const barsData = visibleData.length > 0 ? visibleData : Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)

    return barsData.map((value, index) => {
      const position = (index / barsData.length) * 100
      const timeAtBar = visibleStartTime + (position / 100) * (visibleEndTime - visibleStartTime)
      const isInRange = timeAtBar >= startTime && timeAtBar <= endTime
      const isCurrentPosition = Math.abs(timeAtBar - currentTime) < duration / data.length / 2

      let barClass = "bg-indigo-400/30 dark:bg-indigo-500/30"
      if (isCurrentPosition) {
        barClass = "bg-pink-500 dark:bg-pink-400"
      } else if (isInRange) {
        barClass = "bg-violet-500/70 dark:bg-violet-400/70"
      }

      return (
        <div
          key={index}
          className={`absolute bottom-1/2 rounded-t-sm ${barClass} transition-all duration-100`}
          style={{
            left: `${position}%`,
            height: `${value * 50}%`,
            width: `${100 / barsData.length / 2}%`,
            transform: `translateX(-50%)`,
          }}
        />
      )
    })
  }

  // Generate reflection bars (mirrored)
  const generateReflectionBars = () => {
    // Filter data to only show what's in the visible range
    const visibleData = data.filter((_, index) => {
      const timeAtBar = (index / data.length) * duration
      return timeAtBar >= visibleStartTime && timeAtBar <= visibleEndTime
    })

    // If no data, generate placeholder data
    const barsData = visibleData.length > 0 ? visibleData : Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)

    return barsData.map((value, index) => {
      const position = (index / barsData.length) * 100
      const timeAtBar = visibleStartTime + (position / 100) * (visibleEndTime - visibleStartTime)
      const isInRange = timeAtBar >= startTime && timeAtBar <= endTime
      const isCurrentPosition = Math.abs(timeAtBar - currentTime) < duration / data.length / 2

      let barClass = "bg-indigo-400/10 dark:bg-indigo-500/10"
      if (isCurrentPosition) {
        barClass = "bg-pink-500/30 dark:bg-pink-400/30"
      } else if (isInRange) {
        barClass = "bg-violet-500/20 dark:bg-violet-400/20"
      }

      return (
        <div
          key={index}
          className={`absolute top-1/2 rounded-b-sm ${barClass} transition-all duration-100`}
          style={{
            left: `${position}%`,
            height: `${value * 50}%`,
            width: `${100 / barsData.length / 2}%`,
            transform: `translateX(-50%)`,
          }}
        />
      )
    })
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-32 relative cursor-pointer bg-gradient-to-b from-slate-50/5 to-slate-100/10 dark:from-slate-900/20 dark:to-slate-800/30 rounded-xl overflow-hidden backdrop-blur-sm"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => handleMouseDown(e, "waveform")}
    >
      {/* Reflection surface */}
      <div className="absolute inset-x-0 top-1/2 h-1/2 bg-white/5 dark:bg-black/5" />

      {/* Selected range overlay */}
      <div
        className="absolute inset-y-0 bg-violet-500/10 dark:bg-violet-400/10 pointer-events-none"
        style={{
          left: `${startMarkerPosition}%`,
          width: `${endMarkerPosition - startMarkerPosition}%`,
        }}
      />

      {/* Waveform bars */}
      {generateBars()}

      {/* Reflection bars */}
      {generateReflectionBars()}

      {/* Start marker */}
      <div
        className="absolute inset-y-0 w-0.5 bg-violet-600 dark:bg-violet-400 cursor-col-resize group"
        style={{ left: `${startMarkerPosition}%` }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleMouseDown(e, "startMarker")
        }}
      >
        <div className="absolute bottom-3 w-4 h-4 bg-violet-600 dark:bg-violet-400 rounded-full -translate-x-1/2 border-2 border-white dark:border-slate-800 group-hover:scale-125 transition-transform" />
        <div className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 dark:bg-violet-400 text-white text-xs px-1 py-0.5 rounded -translate-x-1/2 whitespace-nowrap">
          {formatTime(startTime)}
        </div>
      </div>

      {/* End marker */}
      <div
        className="absolute inset-y-0 w-0.5 bg-violet-600 dark:bg-violet-400 cursor-col-resize group"
        style={{ left: `${endMarkerPosition}%` }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleMouseDown(e, "endMarker")
        }}
      >
        <div className="absolute bottom-3 w-4 h-4 bg-violet-600 dark:bg-violet-400 rounded-full -translate-x-1/2 border-2 border-white dark:border-slate-800 group-hover:scale-125 transition-transform" />
        <div className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 dark:bg-violet-400 text-white text-xs px-1 py-0.5 rounded -translate-x-1/2 whitespace-nowrap">
          {formatTime(endTime)}
        </div>
      </div>

      {/* Playhead */}
      <div
        className={`absolute inset-y-0 w-0.5 bg-pink-500 dark:bg-pink-400 cursor-col-resize group ${isPlaying ? "animate-pulse-subtle" : ""}`}
        style={{ left: `${playheadPosition}%` }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleMouseDown(e, "playhead")
        }}
      >
        <div className="absolute top-1/2 w-5 h-5 bg-pink-500 dark:bg-pink-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 border-white dark:border-slate-800 group-hover:scale-125 transition-transform" />
        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-pink-500 dark:bg-pink-400 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Hover indicator */}
      {hoveredTime !== null && hoveredPosition !== null && !isDragging && (
        <div
          className="absolute inset-y-0 w-0.5 bg-white/30 dark:bg-white/20 pointer-events-none"
          style={{ left: `${hoveredPosition}%` }}
        >
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-700/80 dark:bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm">
            {formatTime(hoveredTime)}
          </div>
        </div>
      )}

      {/* Time scale */}
      <div className="absolute bottom-0 inset-x-0 h-6 flex justify-between px-2 text-xs text-slate-500 dark:text-slate-400 pointer-events-none">
        <span>{formatTime(visibleStartTime)}</span>
        <span>{formatTime(visibleEndTime)}</span>
      </div>
    </div>
  )
}
