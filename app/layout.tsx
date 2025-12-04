import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/ui/theme-context"
import { ToastProvider } from "@/components/ui/toast-provider"
import { Inter, Space_Mono } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono" })

export const metadata = {
  title: "WaveForge - Sculpt Your Sound",
  description:
    "Professional browser-based audio editor with real-time effects, advanced visualizations, and multi-format export. No uploads required.",
  keywords: [
    "audio editor",
    "waveform editor",
    "sound design",
    "audio effects",
    "music production",
    "audio processing",
  ],
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
