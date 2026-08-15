import { readItem, writeItem } from '@cg/lib/storage'

export type Cue = 'deal' | 'play' | 'win'

// Separate from the game's cg.g key, so clearing a game does not reset the preference.
const KEY = 'cg.sound'

const MASTER_GAIN = 0.25
const LOWPASS_HZ = 2000

// Older WebKit only exposes the prefixed constructor.
interface AudioWindow {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

let context: AudioContext | null = null
let master: GainNode | null = null
// The constructor a cached context was built from. Not just "do we have a context" —
// re-checked against the current window.AudioContext on every call, so a construction
// failure (no constructor available, or one that throws) is never cached as permanent.
// The environment can change between calls (a user gesture unblocking audio, a test
// swapping in a different fake), and a permanently-stuck "unavailable" flag would wedge
// getContext() into always returning null for the rest of the session.
let contextCtor: (typeof AudioContext) | undefined

// Read through on every call rather than cached: a cache would need a reset seam for the
// tests, and a localStorage read costs nothing at the rate cues fire.
export const isEnabled = (): boolean => readItem(KEY) === 'on'

export const setEnabled = (on: boolean): void => {
  writeItem(KEY, on ? 'on' : 'off')
}

/*
 * Created lazily on the first cue after the user enables sound, never at module load.
 * Browsers block an AudioContext constructed before a user gesture, so an eager one would
 * both fail and leak a suspended context.
 */
const getContext = (): AudioContext | null => {
  const audioWindow = typeof window === 'undefined'
    ? undefined
    : window as unknown as AudioWindow

  const Ctor = audioWindow?.AudioContext ?? audioWindow?.webkitAudioContext

  if (context !== null && Ctor === contextCtor) {
    return context
  }

  if (!Ctor) {
    return null
  }

  try {
    const created = new Ctor()
    const gain = created.createGain()

    // Cues sit under the UI rather than over it.
    gain.gain.value = MASTER_GAIN
    gain.connect(created.destination)

    context = created
    master = gain
    contextCtor = Ctor

    return context
  } catch {
    context = null
    master = null

    return null
  }
}

const noiseBuffer = (ctx: AudioContext, seconds: number): AudioBuffer => {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < frames; index++) {
    data[index] = Math.random() * 2 - 1
  }

  return buffer
}

// A card landing on felt is essentially filtered noise with a fast decay, which is why
// this reads as convincing rather than synthetic.
const burst = (ctx: AudioContext, out: GainNode, at: number, seconds: number): void => {
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const envelope = ctx.createGain()

  source.buffer = noiseBuffer(ctx, seconds)
  filter.type = 'lowpass'
  filter.frequency.value = LOWPASS_HZ

  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.linearRampToValueAtTime(1, at + 0.005)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(out)

  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    envelope.disconnect()
  }

  source.start(at)
  source.stop(at + seconds)
}

const tone = (
  ctx: AudioContext,
  out: GainNode,
  at: number,
  hz: number,
  seconds: number
): void => {
  const oscillator = ctx.createOscillator()
  const envelope = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = hz

  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.linearRampToValueAtTime(1, at + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

  oscillator.connect(envelope)
  envelope.connect(out)

  oscillator.onended = () => {
    oscillator.disconnect()
    envelope.disconnect()
  }

  oscillator.start(at)
  oscillator.stop(at + seconds)
}

/*
 * Fails silently at every entry point — no AudioContext, a construction that throws, a
 * blocked context, an unexpected node error. Sound is never allowed to break the game.
 */
export const play = (cue: Cue): void => {
  if (!isEnabled()) {
    return
  }

  const ctx = getContext()

  if (ctx === null || master === null) {
    return
  }

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined)
    }

    const now = ctx.currentTime

    switch (cue) {
      case 'deal':
        // A riffle: four short bursts, 45ms apart.
        for (let index = 0; index < 4; index++) {
          burst(ctx, master, now + index * 0.045, 0.06)
        }
        break
      case 'play':
        burst(ctx, master, now, 0.09)
        break
      case 'win':
        tone(ctx, master, now, 660, 0.13)
        tone(ctx, master, now + 0.13, 880, 0.13)
        break
    }
  } catch {
    // A cue that cannot sound is not a reason to stop the game.
  }
}
