import { useState } from 'react'
import { Coffee, Pause, Play, RotateCcw, Save, SkipForward, Sliders } from 'lucide-react'
import { useTimer, type Phase } from '@/context/TimerContext'
import { useSubjects } from '@/lib/data'
import { askNotifPermission, notifPermission } from '@/lib/notify'
import { clock, cn } from '@/lib/utils'

const PHASES: { id: Phase; label: string }[] = [
  { id: 'work', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
]

export default function TimerPage() {
  const t = useTimer()
  const { subjects } = useSubjects()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(t.durations)
  const [perm, setPerm] = useState(notifPermission())

  const R = 120, C = 2 * Math.PI * R
  const frac = Math.min(1, t.elapsed / t.length)
  const isBreak = t.phase !== 'work'
  const round = (t.cycle % 4) + (t.phase === 'work' ? 1 : 0)

  function saveDurations() {
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n) || lo))
    t.setDurations({ work: clamp(draft.work, 1, 120), short: clamp(draft.short, 1, 60), long: clamp(draft.long, 1, 60) })
    setEditing(false)
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <section className="card flex flex-col items-center">
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 p-1 dark:border-white/10" role="tablist">
          {PHASES.map((p) => (
            <button key={p.id} role="tab" aria-selected={t.phase === p.id} onClick={() => t.selectPhase(p.id)}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold sm:px-4', t.phase === p.id ? (p.id === 'work' ? 'bg-tide-600 text-white' : 'bg-ember-500 text-ink') : 'muted')}>{p.label}</button>
          ))}
        </div>

        <div className="relative">
          <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" strokeWidth="14" className="stroke-slate-200 dark:stroke-white/10" />
            <circle cx="140" cy="140" r={R} fill="none" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
              className={cn('transition-[stroke-dashoffset] duration-500', isBreak ? 'stroke-ember-500' : 'stroke-tide-500')} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="muted flex items-center gap-1.5 text-sm font-semibold">{isBreak && <Coffee className="h-4 w-4" />}{PHASES.find((p) => p.id === t.phase)?.label}</span>
            <span className="text-6xl font-extrabold tabular-nums">{clock(t.remaining)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2" aria-label={`Round ${round} of 4`}>
          {[1, 2, 3, 4].map((n) => <span key={n} className={cn('h-2.5 w-2.5 rounded-full', n <= (t.cycle % 4) ? 'bg-tide-500' : n === round && t.phase === 'work' ? 'bg-tide-500/40' : 'bg-slate-300 dark:bg-white/15')} />)}
        </div>

        {t.phase === 'work' && (
          <label className="mt-5 flex w-full max-w-xs flex-col gap-1 text-sm font-semibold">
            Subject
            <select className="input" value={t.subjectId ?? ''} onChange={(e) => t.setSubjectId(e.target.value || null)} disabled={t.running || t.elapsed > 0}>
              <option value="">No subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn-primary !px-8" onClick={t.toggle}>
            {t.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{t.running ? 'Pause' : t.elapsed > 0 ? 'Resume' : 'Start'}
          </button>
          <button className="btn-outline" onClick={t.reset}><RotateCcw className="h-4 w-4" />Reset</button>
          <button className="btn-outline" onClick={t.skip}><SkipForward className="h-4 w-4" />Skip</button>
          {t.phase === 'work' && <button className="btn-outline" onClick={() => void t.finishEarly()}><Save className="h-4 w-4" />End &amp; save</button>}
        </div>
        <p className="muted mt-4 max-w-sm text-center text-xs">Completed focus rounds are saved automatically. Ending early saves the time you studied (at least 1 minute) without the round bonus.</p>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold"><Sliders className="h-4 w-4" />Timer settings</h2>
          <button className="btn-ghost" onClick={() => { setDraft(t.durations); setEditing(!editing) }}>{editing ? 'Close' : 'Edit'}</button>
        </div>
        {editing ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {(['work', 'short', 'long'] as Phase[]).map((p) => (
                <label key={p} className="text-sm font-semibold">{p === 'work' ? 'Focus' : p === 'short' ? 'Short break' : 'Long break'} (min)
                  <input type="number" min={1} max={120} className="input mt-1" value={draft[p]} onChange={(e) => setDraft({ ...draft, [p]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <button className="btn-primary" onClick={saveDurations}>Save</button>
          </div>
        ) : (
          <p className="muted mt-2 text-sm">Focus {t.durations.work} min · Short break {t.durations.short} min · Long break {t.durations.long} min (after every 4 rounds)</p>
        )}
        {perm === 'default' && (
          <button className="btn-outline mt-4" onClick={async () => setPerm(await askNotifPermission())}>Turn on browser notifications</button>
        )}
      </section>
    </div>
  )
}
