/**
 * Format seconds to MM:SS.ms format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 100)

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
}

/**
 * Parse time input in format MM:SS.ms or SS.ms
 */
export function parseTimeInput(input: string): number | null {
  // Handle MM:SS.ms format
  const timeRegex = /^(\d+):(\d+)(?:\.(\d+))?$/
  const match = input.match(timeRegex)

  if (match) {
    const minutes = Number.parseInt(match[1], 10)
    const seconds = Number.parseInt(match[2], 10)
    const milliseconds = match[3] ? Number.parseInt(match[3].padEnd(2, "0"), 10) / 100 : 0

    return minutes * 60 + seconds + milliseconds
  }

  // Handle SS.ms format
  const secondsRegex = /^(\d+)(?:\.(\d+))?$/
  const secondsMatch = input.match(secondsRegex)

  if (secondsMatch) {
    const seconds = Number.parseInt(secondsMatch[1], 10)
    const milliseconds = secondsMatch[2] ? Number.parseInt(secondsMatch[2].padEnd(2, "0"), 10) / 100 : 0

    return seconds + milliseconds
  }

  return null
}
