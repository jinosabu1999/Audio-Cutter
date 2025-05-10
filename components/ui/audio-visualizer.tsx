"use client"

import type React from "react"

import { useRef, useEffect } from "react"

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
  zoomLevel,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || data.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const updateCanvasSize = () => {
      const { width, height } = container.getBoundingClientRect()
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    // Draw function
    const draw = () => {
      if (!canvas || !ctx) return

      const { width, height } = container.getBoundingClientRect()

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Draw waveform
      const visibleDuration = duration / (zoomLevel || 1)
      const visibleStartTime = Math.max(0, currentTime - visibleDuration / 2)
      const visibleEndTime = Math.min(duration, visibleStartTime + visibleDuration)
      const visibleData = data.filter((_, index) => {
        const timeAtBar = (index / data.length) * duration
        return timeAtBar >= visibleStartTime && timeAtBar <= visibleEndTime
      })

      const barWidth = width / visibleData.length
      const barMargin = Math.max(1, barWidth * 0.2)
      const effectiveBarWidth = barWidth - barMargin

      visibleData.forEach((value, visibleIndex) => {
        const originalIndex = data.findIndex((_, index) => {
          const timeAtBar = (index / data.length) * duration
          return timeAtBar >= visibleStartTime + (visibleIndex / visibleData.length) * visibleDuration
        })

        const x = visibleIndex * barWidth
        const barHeight = value * (height * 0.8)

        // Calculate if this bar is in the selected range
        const timeAtBar = (originalIndex / data.length) * duration
        const isInRange = timeAtBar >= startTime && timeAtBar <= endTime

        // Calculate if this is the current position
        const isCurrentPosition = Math.abs(timeAtBar - currentTime) < duration / data.length / 2

        // Set color based on position
        if (isCurrentPosition) {
          // Pulsing effect for current position
          const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.2 + 0.8
          ctx.fillStyle = `rgba(139, 92, 246, ${pulseIntensity})`
        } else if (isInRange) {
          ctx.fillStyle = "rgba(139, 92, 246, 0.7)"
        } else {
          ctx.fillStyle = "rgba(99, 102, 241, 0.3)"
        }

        // Draw bar with rounded corners
        const barY = height - barHeight

        // Draw rounded rectangle
        ctx.beginPath()
        const radius = effectiveBarWidth / 2
        ctx.moveTo(x + radius, barY)
        ctx.lineTo(x + effectiveBarWidth - radius, barY)
        ctx.quadraticCurveTo(x + effectiveBarWidth, barY, x + effectiveBarWidth, barY + radius)
        ctx.lineTo(x + effectiveBarWidth, height - radius)
        ctx.quadraticCurveTo(x + effectiveBarWidth, height, x + effectiveBarWidth - radius, height)
        ctx.lineTo(x + radius, height)
        ctx.quadraticCurveTo(x, height, x, height - radius)
        ctx.lineTo(x, barY + radius)
        ctx.quadraticCurveTo(x, barY, x + radius, barY)
        ctx.closePath()
        ctx.fill()

        // Add glow effect for current position
        if (isCurrentPosition) {
          ctx.shadowColor = "rgba(139, 92, 246, 0.6)"
          ctx.shadowBlur = 10
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      // Draw playhead
      const playheadX = ((currentTime - visibleStartTime) / visibleDuration) * width
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.strokeStyle = "rgba(236, 72, 153, 0.8)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw range indicators
      const startX = Math.max(0, ((startTime - visibleStartTime) / visibleDuration) * width)
      const endX = Math.min(width, ((endTime - visibleStartTime) / visibleDuration) * width)

      // Start indicator
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, height)
      ctx.strokeStyle = "rgba(var(--dynamic-tertiary), 0.6)"
      ctx.lineWidth = 2
      ctx.stroke()

      // End indicator
      ctx.beginPath()
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, height)
      ctx.strokeStyle = "rgba(var(--dynamic-tertiary), 0.6)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Selected range overlay
      ctx.fillStyle = "rgba(var(--dynamic-primary), 0.1)"
      ctx.fillRect(startX, 0, endX - startX, height)

      // Draw time markers
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
      ctx.font = "10px sans-serif"

      // Draw marker for visible start time
      ctx.fillText(formatTime(visibleStartTime), 5, height - 5)

      // Draw marker for visible end time
      const endTimeText = formatTime(visibleEndTime)
      const endTimeWidth = ctx.measureText(endTimeText).width
      ctx.fillText(endTimeText, width - endTimeWidth - 5, height - 5)

      // Draw marker for current time
      const currentTimeText = formatTime(currentTime)
      const currentTimeWidth = ctx.measureText(currentTimeText).width
      ctx.fillText(currentTimeText, playheadX - currentTimeWidth / 2, 15)

      // Animate if playing
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    function formatTime(seconds: number): string {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      const milliseconds = Math.floor((seconds % 1) * 100)

      return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
    }

    draw()

    return () => {
      window.removeEventListener("resize", updateCanvasSize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [data, currentTime, duration, startTime, endTime, isPlaying, zoomLevel])

  // Update animation when isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const { width, height } = container.getBoundingClientRect()

        // Add ripple effect when playing
        const playheadX = (currentTime / duration) * width
        const rippleRadius = (Date.now() % 1000) / 250

        ctx.beginPath()
        ctx.arc(playheadX, height / 2, rippleRadius * 20, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(var(--dynamic-tertiary), " + (1 - rippleRadius) * 0.5 + ")"
        ctx.lineWidth = 2
        ctx.stroke()

        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, currentTime, duration])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickTime = (x / rect.width) * duration

    onTimeUpdate(clickTime)
  }

  return (
    <div ref={containerRef} className="w-full h-32 relative cursor-pointer">
      <canvas ref={canvasRef} onClick={handleClick} className="w-full h-full rounded-xl" />
    </div>
  )
}
