"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"

interface AudioVisualizerProps {
  data: number[]
  currentTime: number
  duration: number
  startTime: number
  endTime: number
  onTimeUpdate: (time: number, updateType?: "startTime" | "endTime") => void
  isPlaying: boolean
  zoomLevel?: number
  addToast?: (message: string, type: string) => void
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
  addToast,
}: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState<"playhead" | "startMarker" | "endMarker" | null>(null)
  const animationRef = useRef<number | null>(null)
  const [lastTapTime, setLastTapTime] = useState<number>(0)
  const [tapCount, setTapCount] = useState<number>(0)
  const [tapPosition, setTapPosition] = useState<number | null>(null)

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
        // Pass the updateType
        onTimeUpdate(newStartTime, "startTime")
      } else if (dragTarget === "endMarker") {
        // Ensure end time doesn't precede start time
        const newEndTime = Math.max(startTime + 0.1, Math.min(duration, time))
        // Pass the updateType
        onTimeUpdate(newEndTime, "endTime")
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const x = touch.clientX - rect.left
    const percentage = x / rect.width
    const touchTime = visibleStartTime + percentage * (visibleEndTime - visibleStartTime)

    // Handle double tap
    const now = Date.now()
    if (now - lastTapTime < 300 && Math.abs(x - (tapPosition || 0)) < 20) {
      // Double tap detected
      setTapCount(0)
      setLastTapTime(0)

      // Set start or end time based on position relative to current time
      if (touchTime < currentTime) {
        onTimeUpdate(touchTime, "startTime")
        addToast?.("Start time set", "info")
      } else {
        onTimeUpdate(touchTime, "endTime")
        addToast?.("End time set", "info")
      }

      e.preventDefault()
      return
    }

    // Record tap for potential double tap
    setLastTapTime(now)
    setTapPosition(x)
    setTapCount(tapCount + 1)

    // Determine what we're touching - playhead, start marker, or end marker
    const playheadPos = (getPositionPercentage(currentTime) * rect.width) / 100
    const startMarkerPos = (getPositionPercentage(startTime) * rect.width) / 100
    const endMarkerPos = (getPositionPercentage(endTime) * rect.width) / 100

    // Check if we're touching a marker (with some tolerance for touch)
    const touchTolerance = 40 // pixels - increased for better mobile touch

    // Check markers first (priority order)
    if (Math.abs(x - startMarkerPos) < touchTolerance) {
      setIsDragging(true)
      setDragTarget("startMarker")
      e.preventDefault() // Prevent scrolling while dragging
    } else if (Math.abs(x - endMarkerPos) < touchTolerance) {
      setIsDragging(true)
      setDragTarget("endMarker")
      e.preventDefault() // Prevent scrolling while dragging
    } else if (Math.abs(x - playheadPos) < touchTolerance) {
      setIsDragging(true)
      setDragTarget("playhead")
      e.preventDefault() // Prevent scrolling while dragging
    } else {
      // If not touching a marker, just update the playhead
      onTimeUpdate(Math.max(0, Math.min(duration, touchTime)))
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return

    // Prevent default to stop scrolling while dragging
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left))
    const percentage = x / rect.width
    const touchTime = visibleStartTime + percentage * (visibleEndTime - visibleStartTime)

    if (dragTarget === "playhead") {
      onTimeUpdate(Math.max(0, Math.min(duration, touchTime)))
    } else if (dragTarget === "startMarker") {
      // Ensure start time doesn't exceed end time
      const newStartTime = Math.max(0, Math.min(endTime - 0.1, touchTime))
      // Pass the updateType
      onTimeUpdate(newStartTime, "startTime")
    } else if (dragTarget === "endMarker") {
      // Ensure end time doesn't precede start time
      const newEndTime = Math.max(startTime + 0.1, Math.min(duration, touchTime))
      // Pass the updateType
      onTimeUpdate(newEndTime, "endTime")
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setDragTarget(null)
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

  useEffect(() => {
    // This effect ensures the visualizer updates when startTime or endTime changes from outside
    // For example, when the user edits the input fields
    // No need to do anything here, React will re-render with the new positions
  }, [startTime, endTime])

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

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Add this CSS class to the document if it doesn't exist
    if (!document.getElementById("pulse-subtle-animation")) {
      const style = document.createElement("style")
      style.id = "pulse-subtle-animation"
      style.innerHTML = `
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, currentTime, duration])

  return (
    <div
      ref={containerRef}
      className="w-full h-40 relative cursor-pointer bg-gradient-to-b from-slate-50/5 to-slate-100/10 dark:from-slate-900/20 dark:to-slate-800/30 rounded-xl overflow-hidden backdrop-blur-sm"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => handleMouseDown(e, "waveform")}
      onTouchStart={(e) => handleTouchStart(e)}
      onTouchMove={(e) => handleTouchMove(e)}
      onTouchEnd={() => handleTouchEnd()}
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

      <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-violet-600/80 dark:bg-violet-400/80 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm">
        {formatTime(endTime - startTime)}
      </div>

      {/* Waveform bars */}
      {generateBars()}

      {/* Reflection bars */}
      {generateReflectionBars()}

      {/* Start marker */}
      <div
        className="absolute inset-y-0 w-1 bg-violet-600 dark:bg-violet-400 cursor-col-resize group touch-manipulation"
        style={{ left: `${startMarkerPosition}%` }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleMouseDown(e, "startMarker")
        }}
      >
        <div className="absolute bottom-3 w-8 h-8 bg-violet-600 dark:bg-violet-400 rounded-full -translate-x-1/2 border-2 border-white dark:border-slate-800 group-hover:scale-125 transition-transform" />
        <div className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 dark:bg-violet-400 text-white text-xs px-1 py-0.5 rounded -translate-x-1/2 whitespace-nowrap">
          {formatTime(startTime)}
        </div>
      </div>

      {/* End marker */}
      <div
        className="absolute inset-y-0 w-1 bg-violet-600 dark:bg-violet-400 cursor-col-resize group touch-manipulation"
        style={{ left: `${endMarkerPosition}%` }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleMouseDown(e, "endMarker")
        }}
      >
        <div className="absolute bottom-3 w-8 h-8 bg-violet-600 dark:bg-violet-400 rounded-full -translate-x-1/2 border-2 border-white dark:border-slate-800 group-hover:scale-125 transition-transform" />
        <div className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 dark:bg-violet-400 text-white text-xs px-1 py-0.5 rounded -translate-x-1/2 whitespace-nowrap">
          {formatTime(endTime)}
        </div>
      </div>

      {/* Playhead */}
      <div
        className={`absolute inset-y-0 w-1 bg-pink-500 dark:bg-pink-400 cursor-col-resize group touch-manipulation ${isPlaying ? "animate-pulse-subtle" : ""}`}
        style={{ left: `${playheadPosition}%` }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleMouseDown(e, "playhead")
        }}
      >
        <div className="absolute top-1/2 w-8 h-8 bg-pink-500 dark:bg-pink-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 border-white dark:border-slate-800 group-hover:scale-125 transition-transform" />
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
      {isDragging && (
        <div className="absolute inset-0 bg-black/10 dark:bg-white/5 pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 dark:bg-white/20 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
            {dragTarget === "startMarker"
              ? `Start: ${formatTime(startTime)}`
              : dragTarget === "endMarker"
                ? `End: ${formatTime(endTime)}`
                : `Current: ${formatTime(currentTime)}`}
          </div>
        </div>
      )}
    </div>
  )
}
