"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem("modusAudioTheme") as Theme | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    const initialTheme = savedTheme || (prefersDark ? "dark" : "dark")
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement
    if (newTheme === "dark") {
      html.classList.add("dark")
      html.style.colorScheme = "dark"
    } else {
      html.classList.remove("dark")
      html.style.colorScheme = "light"
    }
    localStorage.setItem("modusAudioTheme", newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-all duration-300 group"
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
    >
      <div className="relative w-6 h-6">
        <Sun className={`absolute h-6 w-6 transition-all duration-300 ${theme === "light" ? "opacity-100 rotate-0" : "opacity-0 rotate-90"}`} />
        <Moon className={`absolute h-6 w-6 transition-all duration-300 ${theme === "dark" ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"}`} />
      </div>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
    </button>
  )
}
