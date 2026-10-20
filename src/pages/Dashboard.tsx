import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, Flame, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { BADGES, effectiveStreak, levelProgress, REMINDER_LINES, studiedToday } from '@/lib/game'
import { useSessions } from '@/lib/data'
import type { Task } from '@/lib/types'
import { cn, daysAgo, hoursOf, minutesOf } from '@/lib/utils'
import Avatar from '@/components/Avatar'

export default function Dashboard() {
  const { profile, badges } = useAuth()
  const { theme } = useUI()
  const { sessions } = useSessions(7)
  const [tasks, setTasks] = useState<Task[]>([])

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('done', false).order('created_at').limit(5)
    setTasks((data ?? []) as Task[])
  }
  useEffect(() => { void loadTasks() }, [])

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const key = daysAgo(6 - i)
    const d = new Date(key + 'T00:00')
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), minutes: minutesOf(sessions.filter((s) => s.day === key).reduce((a, s) => a + s.seconds, 0)) }
  }), [sessions])

  if (!profile) return null
  const lp = levelProgress(profile.xp)
  const streak = effectiveStreak(profile)
  const todayMin = week[6].minutes
  const goal = profile.daily_goal_minutes
  const goalPct = Math.min(100, Math.round((todayMin / goal) * 100))
  const atRisk = streak > 0 && !studiedToday(profile)
  const axis = theme === 'dark' ? '#94A3B8' : '#64748B'
  const R = 44, C = 2 * Math.PI * R
  const earned = BADGES.filter((b) => badges.includes(b.id)).slice(-4)

  async function complete(t: Task) {
    setTasks((x) => x.filter((y) => y.id !== t.id))
    await supabase.from('tasks').update({ done: true, completed_at: new Date().toISOString() }).eq('id', t.id)
  }

  return (
    <div className="space-y-5">
      {atRisk && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ember-500/40 bg-ember-400/15 p-4">
          <Flame className="h-7 w-7 animate-flicker text-ember-500" fill="currentColor" />
          <p className="min-w-0 flex-1 text-sm font-semibold">{REMINDER_LINES[0](streak)}</p>
          <Link to="/timer" className="btn-ember">Study now <ArrowRight className="h-4 w-4" /></Link>
        </motion.div>
      )}

      <section className="card flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={72} />
        <div className="min-w-0 flex-1">
          <p className="muted text-sm">Welcome back</p>
          <h1 className="truncate text-2xl font-extrabold">{profile.display_name}</h1>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-sm font-semibold"><span>Level {lp.level}</span><span className="muted">{lp.current} / {lp.needed} XP</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(lp.pct)} aria-valuemin={0} aria-valuemax={100}>
              <motion.div className="h-full rounded-full bg-gradient-to-r from-tide-500 to-ember-400" initial={{ width: 0 }} animate={{ width: `${lp.pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
            </div>
            <p className="muted mt-1.5 text-xs">{lp.needed - lp.current} XP to level {lp.level + 1} · Earn 2 XP per focused minute</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4">
          <Flame className={cn('h-10 w-10', streak > 0 ? 'animate-flicker text-ember-500' : 'text-slate-300 dark:text-slate-600')} fill={streak > 0 ? 'currentColor' : 'none'} />
          <div><p className="text-3xl font-extrabold">{streak}</p><p className="muted text-sm">Day streak</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Clock className="h-10 w-10 text-tide-500" />
          <div><p className="text-3xl font-extrabold">{hoursOf(profile.total_seconds)}</p><p className="muted text-sm">Total hours</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Zap className="h-10 w-10 text-ember-500" />
          <div><p className="text-3xl font-extrabold">{profile.xp}</p><p className="muted text-sm">Total XP</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 100 100" className="-rotate-90 shrink-0" role="img" aria-label={`${goalPct}% of daily goal`}>
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-white/10" />
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - goalPct / 100)} className="stroke-tide-500 transition-[stroke-dashoffset] duration-700" />
          </svg>
          <div><p className="text-2xl font-extrabold">{todayMin}<span className="muted text-base font-semibold">/{goal}m</span></p><p className="muted text-sm">Daily goal</p></div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card">
          <h2 className="mb-4 font-bold">This week (minutes)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(20,149,138,.12)' }} contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Bar dataKey="minutes" fill="#14958A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Up next</h2><Link to="/tasks" className="text-sm font-semibold text-tide-600 dark:text-tide-400">All tasks</Link></div>
          {tasks.length === 0 ? <p className="muted text-sm">No open tasks. Add your next goal in Tasks.</p> : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <button aria-label={`Complete ${t.title}`} onClick={() => void complete(t)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 hover:border-tide-500 dark:border-white/30"><Check className="h-4 w-4 opacity-0 hover:opacity-100" /></button>
                  <span className="truncate text-sm font-medium">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Latest badges</h2><Link to="/achievements" className="text-sm font-semibold text-tide-600 dark:text-tide-400">View all</Link></div>
        {earned.length === 0 ? <p className="muted text-sm">Finish a focus session to earn your first badge.</p> : (
          <ul className="flex flex-wrap gap-3">
            {earned.map((b) => (
              <li key={b.id} className="flex items-center gap-2 rounded-full bg-ember-400/15 py-1.5 pl-1.5 pr-4 text-sm font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-400 text-ink"><b.icon className="h-4 w-4" /></span>{b.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
