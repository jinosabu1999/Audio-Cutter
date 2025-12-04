// Professional audio effects processing

export interface EqualizerBand {
  frequency: number
  gain: number // in dB
  q: number // quality factor
}

export interface CompressorSettings {
  threshold: number // dB
  ratio: number
  attack: number // seconds
  release: number // seconds
  knee: number // dB
}

export interface ReverbSettings {
  decay: number // seconds
  wetDryMix: number // 0-1
  preDelay: number // seconds
}

export interface DelaySettings {
  delayTime: number // seconds
  feedback: number // 0-1
  wetDryMix: number // 0-1
}

// Apply parametric EQ
export async function applyEqualizer(buffer: AudioBuffer, bands: EqualizerBand[]): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  // Create filter chain
  let currentNode: AudioNode = source

  for (const band of bands) {
    const filter = offlineContext.createBiquadFilter()
    filter.type = "peaking"
    filter.frequency.value = band.frequency
    filter.Q.value = band.q
    filter.gain.value = band.gain

    currentNode.connect(filter)
    currentNode = filter
  }

  currentNode.connect(offlineContext.destination)
  source.start(0)

  return await offlineContext.startRendering()
}

// Apply compression
export async function applyCompressor(buffer: AudioBuffer, settings: CompressorSettings): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  const compressor = offlineContext.createDynamicsCompressor()
  compressor.threshold.value = settings.threshold
  compressor.ratio.value = settings.ratio
  compressor.attack.value = settings.attack
  compressor.release.value = settings.release
  compressor.knee.value = settings.knee

  source.connect(compressor)
  compressor.connect(offlineContext.destination)
  source.start(0)

  return await offlineContext.startRendering()
}

// Apply reverb using convolution
export async function applyReverb(buffer: AudioBuffer, settings: ReverbSettings): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length + Math.floor(settings.decay * buffer.sampleRate),
    buffer.sampleRate,
  )

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  // Create impulse response for reverb
  const impulseLength = Math.floor(settings.decay * offlineContext.sampleRate)
  const impulse = audioContext.createBuffer(2, impulseLength, offlineContext.sampleRate)

  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < impulseLength; i++) {
      // Exponential decay with random noise
      const decay = Math.exp((-3 * i) / impulseLength)
      data[i] = (Math.random() * 2 - 1) * decay
    }
  }

  const convolver = offlineContext.createConvolver()
  convolver.buffer = impulse

  const dryGain = offlineContext.createGain()
  const wetGain = offlineContext.createGain()

  dryGain.gain.value = 1 - settings.wetDryMix
  wetGain.gain.value = settings.wetDryMix

  source.connect(dryGain)
  source.connect(convolver)
  convolver.connect(wetGain)

  dryGain.connect(offlineContext.destination)
  wetGain.connect(offlineContext.destination)

  source.start(0)

  return await offlineContext.startRendering()
}

// Apply delay effect
export async function applyDelay(buffer: AudioBuffer, settings: DelaySettings): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const maxDelay = 2.0 // Maximum 2 seconds delay
  const extraLength = Math.floor(maxDelay * 3 * buffer.sampleRate)

  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length + extraLength,
    buffer.sampleRate,
  )

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  const delay = offlineContext.createDelay(maxDelay)
  delay.delayTime.value = settings.delayTime

  const feedback = offlineContext.createGain()
  feedback.gain.value = settings.feedback

  const dryGain = offlineContext.createGain()
  const wetGain = offlineContext.createGain()

  dryGain.gain.value = 1 - settings.wetDryMix
  wetGain.gain.value = settings.wetDryMix

  // Create feedback loop
  source.connect(dryGain)
  source.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(wetGain)

  dryGain.connect(offlineContext.destination)
  wetGain.connect(offlineContext.destination)

  source.start(0)

  return await offlineContext.startRendering()
}

// Apply distortion/saturation
export function applyDistortion(buffer: AudioBuffer, amount: number): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const distorted = audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const drive = 1 + amount * 50

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const distortedData = distorted.getChannelData(channel)

    for (let i = 0; i < buffer.length; i++) {
      const x = originalData[i] * drive

      // Soft clipping with tanh
      distortedData[i] = Math.tanh(x) / Math.tanh(drive)
    }
  }

  return distorted
}

// Apply chorus effect
export async function applyChorus(
  buffer: AudioBuffer,
  rate = 1.5,
  depth = 0.002,
  wetDryMix = 0.5,
): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  const delay = offlineContext.createDelay(0.1)
  const lfo = offlineContext.createOscillator()
  const lfoGain = offlineContext.createGain()

  lfo.frequency.value = rate
  lfoGain.gain.value = depth
  delay.delayTime.value = 0.02

  const dryGain = offlineContext.createGain()
  const wetGain = offlineContext.createGain()

  dryGain.gain.value = 1 - wetDryMix
  wetGain.gain.value = wetDryMix

  lfo.connect(lfoGain)
  lfoGain.connect(delay.delayTime)

  source.connect(dryGain)
  source.connect(delay)
  delay.connect(wetGain)

  dryGain.connect(offlineContext.destination)
  wetGain.connect(offlineContext.destination)

  lfo.start(0)
  source.start(0)

  return await offlineContext.startRendering()
}

// Apply flanger effect
export async function applyFlanger(
  buffer: AudioBuffer,
  rate = 0.5,
  depth = 0.005,
  feedback = 0.5,
  wetDryMix = 0.5,
): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  const delay = offlineContext.createDelay(0.1)
  const lfo = offlineContext.createOscillator()
  const lfoGain = offlineContext.createGain()
  const feedbackGain = offlineContext.createGain()

  lfo.frequency.value = rate
  lfoGain.gain.value = depth
  delay.delayTime.value = 0.005
  feedbackGain.gain.value = feedback

  const dryGain = offlineContext.createGain()
  const wetGain = offlineContext.createGain()

  dryGain.gain.value = 1 - wetDryMix
  wetGain.gain.value = wetDryMix

  lfo.connect(lfoGain)
  lfoGain.connect(delay.delayTime)

  source.connect(dryGain)
  source.connect(delay)
  delay.connect(feedbackGain)
  feedbackGain.connect(delay)
  delay.connect(wetGain)

  dryGain.connect(offlineContext.destination)
  wetGain.connect(offlineContext.destination)

  lfo.start(0)
  source.start(0)

  return await offlineContext.startRendering()
}

// Apply high-pass filter (de-esser, low-cut)
export async function applyHighPassFilter(buffer: AudioBuffer, frequency: number): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  const filter = offlineContext.createBiquadFilter()
  filter.type = "highpass"
  filter.frequency.value = frequency
  filter.Q.value = 1

  source.connect(filter)
  filter.connect(offlineContext.destination)
  source.start(0)

  return await offlineContext.startRendering()
}

// Apply low-pass filter
export async function applyLowPassFilter(buffer: AudioBuffer, frequency: number): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer

  const filter = offlineContext.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = frequency
  filter.Q.value = 1

  source.connect(filter)
  filter.connect(offlineContext.destination)
  source.start(0)

  return await offlineContext.startRendering()
}

// Limiter (prevent clipping)
export function applyLimiter(buffer: AudioBuffer, threshold = 0.95): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const limited = audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel)
    const limitedData = limited.getChannelData(channel)

    for (let i = 0; i < buffer.length; i++) {
      const value = originalData[i]

      // Soft limiting
      if (Math.abs(value) > threshold) {
        limitedData[i] = threshold * Math.sign(value)
      } else {
        limitedData[i] = value
      }
    }
  }

  return limited
}
