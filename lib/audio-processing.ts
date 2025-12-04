// Advanced audio processing utilities

export interface AudioProcessingOptions {
  normalize?: boolean
  fadeIn?: number
  fadeOut?: number
  pitchShift?: number // semitones
  timeStretch?: number // ratio
  noiseReduction?: number // 0-1
  channelMode?: "stereo" | "mono" | "left" | "right"
}

// Normalize audio to target level
export function normalizeAudio(buffer: AudioBuffer, targetLevel = 0.95): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const normalized = audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  let maxValue = 0

  // Find the maximum value
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < buffer.length; i++) {
      maxValue = Math.max(maxValue, Math.abs(data[i]))
    }
  }

  // Apply normalization
  const normalizationFactor = maxValue > 0 ? targetLevel / maxValue : 1

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const normalizedData = normalized.getChannelData(channel)
    for (let i = 0; i < buffer.length; i++) {
      normalizedData[i] = originalData[i] * normalizationFactor
    }
  }

  return normalized
}

// Apply fade in and fade out
export function applyFades(buffer: AudioBuffer, fadeInDuration = 0, fadeOutDuration = 0): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const faded = audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const fadeInSamples = Math.floor(fadeInDuration * buffer.sampleRate)
  const fadeOutSamples = Math.floor(fadeOutDuration * buffer.sampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const fadedData = faded.getChannelData(channel)

    for (let i = 0; i < buffer.length; i++) {
      let factor = 1

      // Fade in
      if (i < fadeInSamples) {
        factor = i / fadeInSamples
      }
      // Fade out
      else if (i >= buffer.length - fadeOutSamples) {
        factor = (buffer.length - i) / fadeOutSamples
      }

      fadedData[i] = originalData[i] * factor
    }
  }

  return faded
}

// Simple noise gate/reduction
export function applyNoiseReduction(buffer: AudioBuffer, threshold = 0.01): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const processed = audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const processedData = processed.getChannelData(channel)

    for (let i = 0; i < buffer.length; i++) {
      const value = originalData[i]
      // Apply gate: if below threshold, reduce significantly
      if (Math.abs(value) < threshold) {
        processedData[i] = value * 0.1
      } else {
        processedData[i] = value
      }
    }
  }

  return processed
}

// Convert stereo to mono or extract channels
export function processChannels(buffer: AudioBuffer, mode: "stereo" | "mono" | "left" | "right"): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  if (mode === "stereo" || buffer.numberOfChannels === 1) {
    return buffer
  }

  if (mode === "mono") {
    // Mix all channels to mono
    const mono = audioContext.createBuffer(1, buffer.length, buffer.sampleRate)
    const monoData = mono.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      let sum = 0
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        sum += buffer.getChannelData(channel)[i]
      }
      monoData[i] = sum / buffer.numberOfChannels
    }

    return mono
  }

  if (mode === "left" && buffer.numberOfChannels >= 1) {
    const left = audioContext.createBuffer(1, buffer.length, buffer.sampleRate)
    const leftData = left.getChannelData(0)
    const originalLeft = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      leftData[i] = originalLeft[i]
    }

    return left
  }

  if (mode === "right" && buffer.numberOfChannels >= 2) {
    const right = audioContext.createBuffer(1, buffer.length, buffer.sampleRate)
    const rightData = right.getChannelData(0)
    const originalRight = buffer.getChannelData(1)

    for (let i = 0; i < buffer.length; i++) {
      rightData[i] = originalRight[i]
    }

    return right
  }

  return buffer
}

// Detect silence and get non-silent regions
export function detectSilence(
  buffer: AudioBuffer,
  threshold = 0.01,
  minDuration = 0.5,
): { start: number; end: number }[] {
  const sampleRate = buffer.sampleRate
  const minSamples = Math.floor(minDuration * sampleRate)
  const regions: { start: number; end: number }[] = []

  let isSilent = true
  let silenceStart = 0
  let soundStart = 0

  for (let i = 0; i < buffer.length; i++) {
    let maxSample = 0

    // Check all channels
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      maxSample = Math.max(maxSample, Math.abs(buffer.getChannelData(channel)[i]))
    }

    const currentlySilent = maxSample < threshold

    if (isSilent && !currentlySilent) {
      // Transition from silence to sound
      soundStart = i
      isSilent = false
    } else if (!isSilent && currentlySilent) {
      // Transition from sound to silence
      silenceStart = i
      isSilent = true

      // Check if the silence is long enough
      if (i - soundStart >= minSamples) {
        regions.push({
          start: soundStart / sampleRate,
          end: silenceStart / sampleRate,
        })
      }
    }
  }

  // Add the last region if it's sound
  if (!isSilent && buffer.length - soundStart >= minSamples) {
    regions.push({
      start: soundStart / sampleRate,
      end: buffer.length / sampleRate,
    })
  }

  return regions
}

// Calculate LUFS (loudness) - simplified version
export function calculateLoudness(buffer: AudioBuffer): number {
  let sumSquares = 0
  let sampleCount = 0

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += data[i] * data[i]
      sampleCount++
    }
  }

  const rms = Math.sqrt(sumSquares / sampleCount)
  const db = 20 * Math.log10(rms)

  // Convert to approximate LUFS (simplified)
  return db + 3
}

// Apply crossfade between two buffers
export function applyCrossfade(buffer1: AudioBuffer, buffer2: AudioBuffer, crossfadeDuration = 1.0): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const crossfadeSamples = Math.floor(crossfadeDuration * buffer1.sampleRate)

  const totalLength = buffer1.length + buffer2.length - crossfadeSamples
  const result = audioContext.createBuffer(
    Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels),
    totalLength,
    buffer1.sampleRate,
  )

  for (let channel = 0; channel < result.numberOfChannels; channel++) {
    const resultData = result.getChannelData(channel)
    const data1 =
      channel < buffer1.numberOfChannels ? buffer1.getChannelData(channel) : new Float32Array(buffer1.length)
    const data2 =
      channel < buffer2.numberOfChannels ? buffer2.getChannelData(channel) : new Float32Array(buffer2.length)

    // Copy first buffer
    for (let i = 0; i < buffer1.length - crossfadeSamples; i++) {
      resultData[i] = data1[i]
    }

    // Crossfade region
    for (let i = 0; i < crossfadeSamples; i++) {
      const fade1 = 1 - i / crossfadeSamples
      const fade2 = i / crossfadeSamples
      const idx1 = buffer1.length - crossfadeSamples + i
      const idx2 = i
      resultData[buffer1.length - crossfadeSamples + i] = data1[idx1] * fade1 + data2[idx2] * fade2
    }

    // Copy second buffer
    for (let i = crossfadeSamples; i < buffer2.length; i++) {
      resultData[buffer1.length - crossfadeSamples + i] = data2[i]
    }
  }

  return result
}

// Time stretching (simple implementation using resampling)
export function timeStretch(buffer: AudioBuffer, ratio: number): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const newLength = Math.floor(buffer.length * ratio)
  const stretched = audioContext.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const stretchedData = stretched.getChannelData(channel)

    for (let i = 0; i < newLength; i++) {
      const position = i / ratio
      const index = Math.floor(position)
      const fraction = position - index

      if (index + 1 < buffer.length) {
        // Linear interpolation
        stretchedData[i] = originalData[index] * (1 - fraction) + originalData[index + 1] * fraction
      } else if (index < buffer.length) {
        stretchedData[i] = originalData[index]
      }
    }
  }

  return stretched
}
