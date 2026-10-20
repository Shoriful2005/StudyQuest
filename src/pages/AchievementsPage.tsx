import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BADGES } from '@/lib/game'
import { cn } from '@/lib/utils'

export default function AchievementsPage() {
  const { profile, badges } = useAuth()
  if (!profile) return null
  const got = BADGES.filter((b) => badges.includes(b.id)).length

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="text-3xl font-extrabold">{got}<span className="muted text-xl font-semibold"> / {BADGES.length}</span></p>
        <p className="muted text-sm">badges unlocked</p>
      </section>
      <ul className="grid gap-4 sm:grid-cols-2">
        {BADGES.map((b, i) => {
          const earned = badges.includes(b.id)
          const cur = Math.min(b.target, b.stat(profile))
          const pct = (cur / b.target) * 100
          return (
            <motion.li key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn('card flex items-center gap-4', earned ? 'border-ember-500/40 bg-ember-400/10 dark:bg-ember-400/10' : 'opacity-80')}>
              <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full', earned ? 'bg-ember-400 text-ink' : 'bg-slate-200 text-slate-500 dark:bg-white/10')}>
                {earned ? <b.icon className="h-7 w-7" /> : <Lock className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{b.title}</p>
                <p className="muted text-sm">{b.desc}</p>
                {!earned && (
                  <div className="mt-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-tide-500" style={{ width: `${pct}%` }} /></div>
                    <p className="muted mt-1 text-xs">{Math.floor(cur * 10) / 10} / {b.target} {b.unit}</p>
                  </div>
                )}
              </div>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
