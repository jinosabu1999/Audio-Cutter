"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { FastForward, Rewind } from "lucide-react"

interface SpeedControlProps {
  onChange: (speed: number) => void
  defaultValue?: number
}

export function SpeedControl({ onChange, defaultValue = 1 }: SpeedControlProps) {
  const [speed, setSpeed] = useState(defaultValue)

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0]
    setSpeed(newSpeed)
    onChange(newSpeed)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Playback Speed</Label>
        <span className="text-sm font-medium text-primary">{speed.toFixed(1)}x</span>
      </div>
      <div className="flex items-center gap-2">
        <Rewind className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <Slider
          defaultValue={[defaultValue]}
          min={0.5}
          max={2}
          step={0.1}
          onValueChange={handleSpeedChange}
          className="flex-1"
        />
        <FastForward className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </div>
    </div>
  )
}
