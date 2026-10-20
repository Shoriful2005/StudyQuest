import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useUI } from '@/context/UIContext'
import { useSessions, useSubjects } from '@/lib/data'
import { cn, daysAgo, fmtDuration, hoursOf, minutesOf } from '@/lib/utils'

export default function AnalyticsPage() {
  const { theme } = useUI()
  const [range, setRange] = useState<7 | 14 | 30>(14)
  const { sessions, loading } = useSessions(range)
  const { subjects } = useSubjects()
  const axis = theme === 'dark' ? '#94A3B8' : '#64748B'

  const perDay = useMemo(() => Array.from({ length: range }, (_, i) => {
    const key = daysAgo(range - 1 - i)
    const d = new Date(key + 'T00:00')
    const secs = sessions.filter((s) => s.day === key).reduce((a, s) => a + s.seconds, 0)
    return { key, label: d.toLocaleDateString('en-US', range > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }), hours: Math.round((secs / 3600) * 100) / 100, secs }
  }), [sessions, range])

  const perSubject = useMemo(() => {
    const map = new Map<string, { name: string; color: string; secs: number }>()
    for (const s of sessions) {
      const sub = subjects.find((x) => x.id === s.subject_id)
      const k = sub?.id ?? 'none'
      const cur = map.get(k) ?? { name: sub?.name ?? 'No subject', color: sub?.color ?? '#94A3B8', secs: 0 }
      cur.secs += s.seconds
      map.set(k, cur)
    }
    return [...map.values()].sort((a, b) => b.secs - a.secs)
  }, [sessions, subjects])

  const totalSecs = sessions.reduce((a, s) => a + s.seconds, 0)
  const best = perDay.reduce((a, b) => (b.secs > a.secs ? b : a), perDay[0])
  const studyDays = perDay.filter((d) => d.secs > 0).length

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-slate-200 p-1 text-sm font-semibold dark:border-white/10 sm:w-fit">
        {([7, 14, 30] as const).map((r) => <button key={r} onClick={() => setRange(r)} className={cn('flex-1 rounded-lg px-4 py-1.5', range === r ? 'bg-tide-600 text-white' : 'muted')}>{r} days</button>)}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Total time', `${hoursOf(totalSecs)} h`],
          ['Sessions', String(sessions.length)],
          ['Study days', `${studyDays}/${range}`],
          ['Best day', best && best.secs > 0 ? `${fmtDuration(best.secs)}` : '–'],
        ].map(([label, value]) => <div key={label} className="card"><p className="text-2xl font-extrabold">{value}</p><p className="muted text-sm">{label}</p></div>)}
      </div>

      <section className="card">
        <h2 className="mb-4 font-bold">Study hours per day</h2>
        {loading ? <p className="muted text-sm">Loading…</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDay} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={range > 14 ? 3 : 0} />
                <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(20,149,138,.12)' }} contentStyle={{ borderRadius: 12, border: 'none' }} formatter={(v) => [`${v} h`, 'Studied']} />
                <Bar dataKey="hours" fill="#14958A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-bold">By subject</h2>
          {perSubject.length === 0 ? <p className="muted text-sm">No sessions in this period yet.</p> : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={perSubject} dataKey="secs" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none">
                      {perSubject.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} formatter={(v) => fmtDuration(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 text-sm">
                {perSubject.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.color }} /><span className="flex-1 truncate font-medium">{s.name}</span>
                    <span className="muted tabular-nums">{fmtDuration(s.secs)} · {Math.round((s.secs / totalSecs) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 font-bold">Recent sessions</h2>
          {sessions.length === 0 ? <p className="muted text-sm">Nothing logged yet. Start a focus round!</p> : (
            <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto dark:divide-white/10">
              {sessions.slice(0, 40).map((s) => {
                const sub = subjects.find((x) => x.id === s.subject_id)
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sub?.color ?? '#94A3B8' }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{sub?.name ?? 'No subject'}{!s.completed && <span className="muted font-normal"> · ended early</span>}</p>
                      <p className="muted text-xs">{new Date(s.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div className="text-right"><p className="font-semibold tabular-nums">{minutesOf(s.seconds)} min</p><p className="text-xs text-tide-600 dark:text-tide-400">+{s.xp_earned} XP</p></div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
