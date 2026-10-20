import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Award, BarChart3, Clock, LogOut, Search, ShieldCheck, Trash2, Users, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { BADGES, levelFromXp } from '@/lib/game'
import type { Profile } from '@/lib/types'
import { cn, fmtDuration, hoursOf } from '@/lib/utils'

/**
 * Hidden admin area, reachable only by typing /studyquest-admin. No link to it exists anywhere in the app.
 * Real protection is server-side: every query and RPC below is checked by Row Level Security / is_admin().
 */
export default function AdminPage() {
  const { user, loading, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) { setIsAdmin(null); return }
    let alive = true
    void supabase.from('admin_roles').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setIsAdmin(!!data) })
    return () => { alive = false }
  }, [user])

  if (loading || (user && isAdmin === null)) return <Shell><p className="muted">Loading…</p></Shell>
  if (!user) return <Shell><AdminLogin /></Shell>
  if (!isAdmin) {
    return (
      <Shell>
        <div className="card max-w-sm text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-3 text-lg font-bold">Access denied</h1>
          <p className="muted mt-1 text-sm">This account does not have admin access.</p>
          <button className="btn-outline mt-4 w-full" onClick={() => void signOut()}>Sign out</button>
        </div>
      </Shell>
    )
  }
  return <Dashboard onSignOut={() => void signOut()} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-6">{children}</div>
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr('Invalid email or password.')
    setBusy(false)
  }
  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
      <div className="flex items-center gap-2 text-lg font-extrabold"><ShieldCheck className="h-6 w-6 text-tide-500" />Admin sign in</div>
      <input className="input" type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
    </form>
  )
}

type Stats = {
  total_users: number; new_users_7d: number; total_sessions: number; total_seconds: number
  active_today: number; active_7d: number; daily: { day: string; sessions: number; minutes: number }[]
}
type AdminSession = {
  id: string; seconds: number; completed: boolean; xp_earned: number; day: string; started_at: string
  profiles: { display_name: string; email: string | null } | null
  subjects: { name: string } | null
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const { theme } = useUI()
  const [tab, setTab] = useState<'overview' | 'users' | 'sessions'>('overview')
  const [flash, setFlash] = useState('')
  const say = useCallback((m: string) => { setFlash(m); setTimeout(() => setFlash(''), 4000) }, [])
  const axis = theme === 'dark' ? '#94A3B8' : '#64748B'

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-tide-500" />
        <h1 className="flex-1 text-xl font-extrabold">StudyQuest Admin</h1>
        <div className="flex rounded-xl border border-slate-300 p-1 text-sm font-semibold dark:border-white/15">
          {([['overview', BarChart3, 'Overview'], ['users', Users, 'Users'], ['sessions', Clock, 'Sessions']] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5', tab === k ? 'bg-tide-600 text-white' : 'muted')}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>
        <button className="btn-outline" onClick={onSignOut}><LogOut className="h-4 w-4" />Sign out</button>
      </header>
      {flash && <p role="status" className="mb-4 rounded-xl bg-tide-500/15 px-4 py-2 text-sm font-semibold text-tide-700 dark:text-tide-400">{flash}</p>}
      {tab === 'overview' && <Overview axis={axis} />}
      {tab === 'users' && <UsersTab say={say} />}
      {tab === 'sessions' && <SessionsTab say={say} />}
    </div>
  )
}

function Overview({ axis }: { axis: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void supabase.rpc('admin_stats').then(({ data, error: e }) => { if (e) setError(e.message); else setStats(data as Stats) })
  }, [])
  if (error) return <p className="text-red-500">{error}</p>
  if (!stats) return <p className="muted">Loading…</p>
  const cards: [string, string | number, string][] = [
    ['Total users', stats.total_users, `${stats.new_users_7d} new this week`],
    ['Active today', stats.active_today, `${stats.active_7d} in the last 7 days`],
    ['Total sessions', stats.total_sessions, 'all time'],
    ['Study hours', hoursOf(stats.total_seconds), 'all time'],
  ]
  const daily = stats.daily.map((d) => ({ label: new Date(d.day + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), minutes: d.minutes, sessions: d.sessions }))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([label, v, sub]) => <div key={label} className="card"><p className="text-3xl font-extrabold">{v}</p><p className="text-sm font-semibold">{label}</p><p className="muted text-xs">{sub}</p></div>)}
      </div>
      <section className="card">
        <h2 className="mb-4 font-bold">Platform study minutes, last 14 days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ left: -20, right: 4, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={axis} strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
              <Area type="monotone" dataKey="minutes" stroke="#14958A" fill="#14958A" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function UsersTab({ say }: { say: (m: string) => void }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<{ id: string; mode: 'xp' | 'badges' } | null>(null)
  const [amount, setAmount] = useState(50)
  const [owned, setOwned] = useState<string[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('xp', { ascending: false }).limit(500)
    setUsers((data ?? []) as Profile[])
  }, [])
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => users.filter((u) => `${u.display_name} ${u.email ?? ''}`.toLowerCase().includes(q.toLowerCase())), [users, q])

  async function loadBadges(id: string) {
    const { data } = await supabase.from('user_badges').select('badge_id').eq('user_id', id)
    setOwned((data ?? []).map((r) => r.badge_id as string))
  }
  async function grantXp(u: Profile) {
    const { error } = await supabase.rpc('admin_grant_xp', { target: u.id, amount })
    if (error) return say(error.message)
    say(`${amount >= 0 ? 'Granted' : 'Removed'} ${Math.abs(amount)} XP ${amount >= 0 ? 'to' : 'from'} ${u.display_name}`)
    setOpen(null); await load()
  }
  async function setBadge(u: Profile, badge: string, on: boolean) {
    const { error } = await supabase.rpc('admin_set_badge', { target: u.id, badge, grant_it: on })
    if (error) return say(error.message)
    await loadBadges(u.id)
  }

  return (
    <section className="card">
      <div className="relative mb-4 max-w-sm">
        <Search className="muted absolute left-3 top-2.5 h-4 w-4" />
        <input className="input !pl-9" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="muted text-xs uppercase"><tr><th className="py-2">Student</th><th>Level</th><th>XP</th><th>Streak</th><th>Hours</th><th>Sessions</th><th className="text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {filtered.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="py-3"><p className="font-semibold">{u.display_name}</p><p className="muted text-xs">{u.email}</p></td>
                  <td>{levelFromXp(u.xp)}</td><td className="tabular-nums">{u.xp}</td><td>{u.streak}</td><td>{hoursOf(u.total_seconds)}</td><td>{u.sessions_count}</td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    <button className="btn-outline !px-2.5 !py-1 text-xs" onClick={() => setOpen({ id: u.id, mode: 'xp' })}><Zap className="h-3.5 w-3.5" />XP</button>
                    <button className="btn-outline !px-2.5 !py-1 text-xs" onClick={() => { setOpen({ id: u.id, mode: 'badges' }); void loadBadges(u.id) }}><Award className="h-3.5 w-3.5" />Badges</button>
                  </td>
                </tr>
                {open?.id === u.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 p-4 dark:bg-white/5">
                      {open.mode === 'xp' ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-sm font-semibold">Bonus XP (use a negative number to remove)
                            <input type="number" className="input mt-1 !w-40" value={amount} onChange={(e) => setAmount(Math.round(Number(e.target.value)) || 0)} />
                          </label>
                          <button className="btn-primary self-end" onClick={() => void grantXp(u)}>Apply</button>
                          <button className="btn-ghost self-end" onClick={() => setOpen(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {BADGES.map((b) => {
                            const has = owned.includes(b.id)
                            return (
                              <button key={b.id} onClick={() => void setBadge(u, b.id, !has)} title={has ? 'Click to revoke' : 'Click to grant'}
                                className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold', has ? 'border-ember-500 bg-ember-400/20' : 'border-slate-300 opacity-60 dark:border-white/15')}>
                                <b.icon className="h-3.5 w-3.5" />{b.title}
                              </button>
                            )
                          })}
                          <button className="btn-ghost !py-1 text-xs" onClick={() => setOpen(null)}>Close</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="muted py-6 text-center text-sm">No students found.</p>}
    </section>
  )
}

function SessionsTab({ say }: { say: (m: string) => void }) {
  const [rows, setRows] = useState<AdminSession[]>([])
  const [q, setQ] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.from('study_sessions').select('id, seconds, completed, xp_earned, day, started_at, profiles(display_name, email), subjects(name)')
      .order('started_at', { ascending: false }).limit(200)
    setRows((data ?? []) as unknown as AdminSession[])
  }, [])
  useEffect(() => { void load() }, [load])

  async function remove(id: string) {
    if (!window.confirm('Delete this session? The XP it awarded is NOT removed. Adjust XP separately if needed.')) return
    const { error } = await supabase.from('study_sessions').delete().eq('id', id)
    if (error) return say(error.message)
    say('Session deleted'); await load()
  }
  const filtered = rows.filter((r) => `${r.profiles?.display_name ?? ''} ${r.profiles?.email ?? ''} ${r.subjects?.name ?? ''}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <section className="card">
      <div className="relative mb-4 max-w-sm">
        <Search className="muted absolute left-3 top-2.5 h-4 w-4" />
        <input className="input !pl-9" placeholder="Filter by student or subject" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="muted text-xs uppercase"><tr><th className="py-2">When</th><th>Student</th><th>Subject</th><th>Length</th><th>XP</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 text-xs">{new Date(r.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td><p className="font-semibold">{r.profiles?.display_name ?? 'Unknown'}</p><p className="muted text-xs">{r.profiles?.email}</p></td>
                <td>{r.subjects?.name ?? '–'}</td>
                <td>{fmtDuration(r.seconds)}{!r.completed && <span className="muted text-xs"> (early)</span>}</td>
                <td className="tabular-nums">+{r.xp_earned}</td>
                <td className="text-right"><button className="muted hover:text-red-500" aria-label="Delete session" onClick={() => void remove(r.id)}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="muted py-6 text-center text-sm">No sessions found.</p>}
    </section>
  )
}
