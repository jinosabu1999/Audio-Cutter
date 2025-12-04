import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/ui/theme-context"
import { ToastProvider } from "@/components/ui/toast-provider"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata = {
  title: "Modus Audio - Professional Audio Editor",
  description:
    "Cut, edit, and transform your audio with studio-grade precision. Free browser-based audio editor with real-time effects.",
  keywords: ["audio editor", "audio cutter", "sound editor", "music editor", "audio effects"],
    generator: 'v0.app'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
