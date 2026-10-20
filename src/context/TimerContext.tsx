import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSessionLogger } from '@/lib/useSessionLogger'
import { useUI } from './UIContext'
import { browserNotify } from '@/lib/notify'
import { playReminder } from '@/lib/sounds'
import { clock } from '@/lib/utils'

export type Phase = 'work' | 'short' | 'long'
export type Durations = Record<Phase, number> // minutes

const DEFAULTS: Durations = { work: 25, short: 5, long: 15 }
const loadDurations = (): Durations => {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem('sq:durations') || '{}') as Partial<Durations>) } } catch { return DEFAULTS }
}

type TimerCtx = {
  phase: Phase
  running: boolean
  elapsed: number
  length: number
  remaining: number
  durations: Durations
  cycle: number
  subjectId: string | null
  setSubjectId: (id: string | null) => void
  setDurations: (d: Durations) => void
  selectPhase: (p: Phase) => void
  toggle: () => void
  reset: () => void
  skip: () => void
  finishEarly: () => Promise<void>
}

const Ctx = createContext<TimerCtx | null>(null)

/** App-level timer so a session keeps running while the student browses other pages. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const logSession = useSessionLogger()
  const { toast, showPopup } = useUI()

  const [phase, setPhase] = useState<Phase>('work')
  const [acc, setAcc] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [durations, setDurationsState] = useState<Durations>(loadDurations)
  const [cycle, setCycle] = useState(0)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const busy = useRef(false)

  const running = startedAt !== null
  const length = durations[phase] * 60
  const elapsed = acc + (startedAt ? (now - startedAt) / 1000 : 0)
  const remaining = Math.max(0, length - elapsed)

  // Timestamp-based ticking stays accurate even when the browser throttles background tabs.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    document.title = running ? `${clock(remaining)} · StudyQuest` : 'StudyQuest'
    return () => { document.title = 'StudyQuest' }
  }, [running, remaining])

  const stopAt = useCallback((next: Phase, autostart: boolean) => {
    setPhase(next); setAcc(0); setNow(Date.now()); setStartedAt(autostart ? Date.now() : null)
  }, [])

  // Phase completion
  useEffect(() => {
    if (!running || elapsed < length || busy.current) return
    busy.current = true
    void (async () => {
      if (phase === 'work') {
        await logSession({ seconds: length, completed: true, subjectId })
        const done = cycle + 1
        setCycle(done)
        const next: Phase = done % 4 === 0 ? 'long' : 'short'
        browserNotify('Focus round complete', `Nice work! Take a ${durations[next]}-minute break.`, 'timer')
        showPopup({ icon: 'coffee', tone: 'good', title: 'Round complete!', body: `Take a ${durations[next]}-minute ${next === 'long' ? 'long' : 'short'} break. You earned it.` })
        stopAt(next, true)
      } else {
        playReminder()
        browserNotify('Break is over', 'Ready for another focus round?', 'timer')
        toast('Break is over. Ready for another focus round?')
        stopAt('work', false)
      }
      busy.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const toggle = useCallback(() => {
    if (running) { setAcc(elapsed); setStartedAt(null) } else { setNow(Date.now()); setStartedAt(Date.now()) }
  }, [running, elapsed])

  const reset = useCallback(() => stopAt(phase, false), [phase, stopAt])
  const selectPhase = useCallback((p: Phase) => stopAt(p, false), [stopAt])
  const skip = useCallback(() => {
    if (phase === 'work') stopAt(cycle % 4 === 3 ? 'long' : 'short', false)
    else stopAt('work', false)
  }, [phase, cycle, stopAt])

  const finishEarly = useCallback(async () => {
    if (phase !== 'work' || elapsed < 60) { toast('Study for at least one minute to save a session.'); return }
    await logSession({ seconds: elapsed, completed: false, subjectId })
    stopAt('work', false)
  }, [phase, elapsed, logSession, subjectId, stopAt, toast])

  const setDurations = useCallback((d: Durations) => {
    localStorage.setItem('sq:durations', JSON.stringify(d))
    setDurationsState(d)
    setAcc(0); setStartedAt(null)
  }, [])

  const value = useMemo(
    () => ({ phase, running, elapsed, length, remaining, durations, cycle, subjectId, setSubjectId, setDurations, selectPhase, toggle, reset, skip, finishEarly }),
    [phase, running, elapsed, length, remaining, durations, cycle, subjectId, setDurations, selectPhase, toggle, reset, skip, finishEarly],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTimer() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTimer must be used inside TimerProvider')
  return c
}
