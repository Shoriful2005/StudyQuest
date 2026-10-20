import { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Moon, Sun } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useUI } from '@/context/UIContext'
import { cn } from '@/lib/utils'

export default function AuthPage() {
  const { theme, toggleTheme } = useUI()
  const [tab, setTab] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      if (tab === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim() } } })
        if (error) throw error
        if (!data.session) setMsg({ ok: true, text: 'Account created! Check your email to confirm it, then sign in.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-deep-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-xl font-extrabold"><Flame className="h-7 w-7 text-ember-500" /> StudyQuest</div>
        <div>
          <motion.div className="mb-8 inline-flex h-40 w-40 items-center justify-center rounded-full bg-ember-500/15"
            animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <Flame className="h-24 w-24 animate-flicker text-ember-400" fill="currentColor" />
          </motion.div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">Study a little every day. Watch it add up.</h1>
          <p className="mt-4 max-w-md text-lg text-tide-100/80">Focus timers, daily streaks, XP and badges that make consistency feel like a game.</p>
        </div>
        <p className="text-sm text-white/40">Pomodoro · Streaks · Levels · Badges</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl font-extrabold lg:hidden"><Flame className="h-6 w-6 text-ember-500" />StudyQuest</span>
            <button className="btn-ghost ml-auto !p-2" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
          </div>
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-white/10">
            {(['in', 'up'] as const).map((k) => (
              <button key={k} onClick={() => { setTab(k); setMsg(null) }} className={cn('rounded-lg py-2 text-sm font-semibold', tab === k ? 'bg-white shadow-sm dark:bg-deep-850' : 'muted')}>
                {k === 'in' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            {tab === 'up' && <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />}
            <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input className="input" type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={tab === 'up' ? 'new-password' : 'current-password'} />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : tab === 'up' ? 'Create account' : 'Sign in'}</button>
          </form>
          {msg && <p role="alert" className={cn('mt-4 text-sm', msg.ok ? 'text-tide-600 dark:text-tide-400' : 'text-red-500')}>{msg.text}</p>}
        </div>
      </section>
    </div>
  )
}
