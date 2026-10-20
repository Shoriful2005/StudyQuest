// Small chimes generated with the Web Audio API (no audio files needed).
let ctx: AudioContext | null = null

const enabled = () => localStorage.getItem('sq:sound') !== 'off'
export const soundEnabled = enabled
export const setSoundEnabled = (on: boolean) => localStorage.setItem('sq:sound', on ? 'on' : 'off')

function tones(notes: { f: number; at: number; dur: number; type?: OscillatorType; vol?: number }[]) {
  if (!enabled()) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    for (const n of notes) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = n.type ?? 'sine'
      o.frequency.value = n.f
      g.gain.setValueAtTime(0.0001, t0 + n.at)
      g.gain.exponentialRampToValueAtTime(n.vol ?? 0.22, t0 + n.at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur)
      o.connect(g).connect(ctx.destination)
      o.start(t0 + n.at)
      o.stop(t0 + n.at + n.dur + 0.05)
    }
  } catch { /* audio blocked until the user interacts with the page */ }
}

/** Happy rising arpeggio: session complete, badge, level up. */
export const playSuccess = () =>
  tones([523.25, 659.25, 783.99, 1046.5].map((f, i) => ({ f, at: i * 0.11, dur: 0.35 })))

/** Gentle two-note nudge: streak reminders and break over. */
export const playReminder = () =>
  tones([{ f: 880, at: 0, dur: 0.3 }, { f: 660, at: 0.25, dur: 0.45 }])

/** Soft falling tones: a streak was lost. */
export const playSad = () =>
  tones([{ f: 392, at: 0, dur: 0.4, type: 'triangle' }, { f: 330, at: 0.3, dur: 0.4, type: 'triangle' }, { f: 262, at: 0.6, dur: 0.7, type: 'triangle' }])
