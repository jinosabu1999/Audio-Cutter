"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useTheme } from "./theme-context"

// Material 3 inspired color palette generation
interface DynamicColors {
  primary: string
  primaryDark: string
  secondary: string
  secondaryDark: string
  tertiary: string
  tertiaryDark: string
  surface: string
  surfaceDark: string
}

interface DynamicThemeContextType {
  colors: DynamicColors
  setBaseColor: (color: string) => void
  themeMode: "default" | "dynamic"
  setThemeMode: (mode: "default" | "dynamic") => void
}

const defaultColors: DynamicColors = {
  primary: "rgb(139, 92, 246)", // violet-500
  primaryDark: "rgb(167, 139, 250)", // violet-400
  secondary: "rgb(99, 102, 241)", // indigo-500
  secondaryDark: "rgb(129, 140, 248)", // indigo-400
  tertiary: "rgb(236, 72, 153)", // pink-500
  tertiaryDark: "rgb(244, 114, 182)", // pink-400
  surface: "rgb(255, 255, 255)", // white
  surfaceDark: "rgb(15, 23, 42)", // slate-900
}

const DynamicThemeContext = createContext<DynamicThemeContextType>({
  colors: defaultColors,
  setBaseColor: () => {},
  themeMode: "default",
  setThemeMode: () => {},
})

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const [colors, setColors] = useState<DynamicColors>(defaultColors)
  const [themeMode, setThemeMode] = useState<"default" | "dynamic">("default")

  // Generate a color palette from a base color
  const setBaseColor = (baseColor: string) => {
    try {
      // Simple color manipulation for demo purposes
      // In a real app, you'd use a color algorithm library
      const r = Number.parseInt(baseColor.slice(1, 3), 16)
      const g = Number.parseInt(baseColor.slice(3, 5), 16)
      const b = Number.parseInt(baseColor.slice(5, 7), 16)

      // Generate primary colors
      const primary = `rgb(${r}, ${g}, ${b})`
      const primaryDark = `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 30, 255)})`

      // Generate secondary colors (complementary)
      const secondaryR = 255 - r
      const secondaryG = 255 - g
      const secondaryB = 255 - b
      const secondary = `rgb(${secondaryR}, ${secondaryG}, ${secondaryB})`
      const secondaryDark = `rgb(${Math.min(secondaryR + 30, 255)}, ${Math.min(secondaryG + 30, 255)}, ${Math.min(
        secondaryB + 30,
        255,
      )})`

      // Generate tertiary colors (triadic)
      const tertiaryR = g
      const tertiaryG = b
      const tertiaryB = r
      const tertiary = `rgb(${tertiaryR}, ${tertiaryG}, ${tertiaryB})`
      const tertiaryDark = `rgb(${Math.min(tertiaryR + 30, 255)}, ${Math.min(tertiaryG + 30, 255)}, ${Math.min(
        tertiaryB + 30,
        255,
      )})`

      setColors({
        primary,
        primaryDark,
        secondary,
        secondaryDark,
        tertiary,
        tertiaryDark,
        surface: defaultColors.surface,
        surfaceDark: defaultColors.surfaceDark,
      })
    } catch (error) {
      console.error("Error generating color palette:", error)
      setColors(defaultColors)
    }
  }

  // Apply dynamic colors to CSS variables
  useEffect(() => {
    if (themeMode === "dynamic") {
      const root = document.documentElement

      if (theme === "light") {
        root.style.setProperty("--dynamic-primary", colors.primary)
        root.style.setProperty("--dynamic-secondary", colors.secondary)
        root.style.setProperty("--dynamic-tertiary", colors.tertiary)
        root.style.setProperty("--dynamic-surface", colors.surface)
      } else {
        root.style.setProperty("--dynamic-primary", colors.primaryDark)
        root.style.setProperty("--dynamic-secondary", colors.secondaryDark)
        root.style.setProperty("--dynamic-tertiary", colors.tertiaryDark)
        root.style.setProperty("--dynamic-surface", colors.surfaceDark)
      }
    } else {
      // Reset to default theme
      document.documentElement.style.removeProperty("--dynamic-primary")
      document.documentElement.style.removeProperty("--dynamic-secondary")
      document.documentElement.style.removeProperty("--dynamic-tertiary")
      document.documentElement.style.removeProperty("--dynamic-surface")
    }
  }, [colors, theme, themeMode])

  return (
    <DynamicThemeContext.Provider value={{ colors, setBaseColor, themeMode, setThemeMode }}>
      {children}
    </DynamicThemeContext.Provider>
  )
}

export function useDynamicTheme() {
  return useContext(DynamicThemeContext)
}

// Color picker component
export function ColorPicker() {
  const { setBaseColor, themeMode, setThemeMode } = useDynamicTheme()

  const predefinedColors = [
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#F59E0B", // amber
    "#10B981", // emerald
    "#3B82F6", // blue
    "#EF4444", // red
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dynamic Theme</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={themeMode === "dynamic"}
            onChange={() => setThemeMode(themeMode === "dynamic" ? "default" : "dynamic")}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mt-1">
        {predefinedColors.map((color) => (
          <button
            key={color}
            className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400"
            style={{ backgroundColor: color }}
            onClick={() => {
              setBaseColor(color)
              setThemeMode("dynamic")
            }}
            aria-label={`Set theme color to ${color}`}
          />
        ))}

        <label className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer bg-white dark:bg-slate-800 transition-transform hover:scale-110">
          <input
            type="color"
            className="opacity-0 absolute w-6 h-6 cursor-pointer"
            onChange={(e) => {
              setBaseColor(e.target.value)
              setThemeMode("dynamic")
            }}
            aria-label="Choose custom theme color"
          />
          <span className="text-xs">+</span>
        </label>
      </div>
    </div>
  )
}
