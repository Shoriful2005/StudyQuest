import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Award, BarChart3, CheckSquare, Flame, LayoutDashboard, LogOut, Moon, Settings, Sun, Timer } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { useTimer } from '@/context/TimerContext'
import { effectiveStreak, levelFromXp } from '@/lib/game'
import { clock, cn } from '@/lib/utils'
import Avatar from './Avatar'

// NOTE: there is intentionally no admin link anywhere in this navigation.
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/timer', label: 'Focus', icon: Timer },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/achievements', label: 'Badges', icon: Award },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useUI()
  const timer = useTimer()
  if (!profile) return null
  const streak = effectiveStreak(profile)

  return (
    <div className="min-h-screen md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-deep-850 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-extrabold"><Flame className="h-6 w-6 text-ember-500" /> StudyQuest</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-tide-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10')}>
              <Icon className="h-5 w-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2 dark:border-white/10">
          <Avatar name={profile.display_name} url={profile.avatar_url} size={36} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{profile.display_name}</p>
          <button className="btn-ghost !p-2" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-paper/85 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-deep-900/85">
        <div className="flex items-center gap-2 font-extrabold md:hidden"><Flame className="h-5 w-5 text-ember-500" /> StudyQuest</div>
        <div className="hidden md:block" />
        <div className="flex items-center gap-2">
          {timer.running && (
            <Link to="/timer" className="flex items-center gap-1.5 rounded-full bg-tide-600 px-3 py-1.5 text-xs font-bold tabular-nums text-white">
              <Timer className="h-3.5 w-3.5" />{clock(timer.remaining)}
            </Link>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-ember-400/20 px-3 py-1.5 text-xs font-bold" title="Day streak">
            <Flame className={cn('h-4 w-4', streak > 0 ? 'text-ember-500' : 'text-slate-400')} fill={streak > 0 ? 'currentColor' : 'none'} />{streak}
          </span>
          <span className="rounded-full bg-tide-500/15 px-3 py-1.5 text-xs font-bold text-tide-700 dark:text-tide-400">Lv {levelFromXp(profile.xp)}</span>
          <button className="btn-ghost !p-2" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl p-4 pb-28 md:p-8 md:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 px-1 py-1.5 backdrop-blur dark:border-white/10 dark:bg-deep-850/95 md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold', isActive ? 'text-tide-600 dark:text-tide-400' : 'muted')}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
