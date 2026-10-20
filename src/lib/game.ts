import confetti from 'canvas-confetti'
import { Award, Crown, Flame, GraduationCap, Medal, Sprout, Timer, Trophy, type LucideIcon } from 'lucide-react'
import type { Profile } from './types'
import { daysAgo, ymd } from './utils'

export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
export const xpAtLevel = (level: number) => 100 * (level - 1) ** 2

export function levelProgress(xp: number) {
  const level = levelFromXp(xp)
  const start = xpAtLevel(level)
  const end = xpAtLevel(level + 1)
  return { level, current: xp - start, needed: end - start, pct: ((xp - start) / (end - start)) * 100 }
}

/** The streak the student currently has. A streak the DB still stores but that has lapsed counts as 0. */
export function effectiveStreak(p: Pick<Profile, 'streak' | 'last_study_date'>) {
  if (!p.last_study_date) return 0
  return p.last_study_date === ymd() || p.last_study_date === daysAgo(1) ? p.streak : 0
}
export const studiedToday = (p: Pick<Profile, 'last_study_date'>) => p.last_study_date === ymd()

export type BadgeDef = {
  id: string; icon: LucideIcon; title: string; desc: string
  target: number; unit: string
  stat: (p: Profile) => number
}

// Keep ids and thresholds in sync with public.evaluate_badges() in supabase/schema.sql
export const BADGES: BadgeDef[] = [
  { id: 'first_session', icon: Sprout, title: 'First Step', desc: 'Log your first study session', target: 1, unit: 'sessions', stat: (p) => p.sessions_count },
  { id: 'sessions_10', icon: Timer, title: 'Focus Rookie', desc: 'Log 10 study sessions', target: 10, unit: 'sessions', stat: (p) => p.sessions_count },
  { id: 'sessions_50', icon: Medal, title: 'Pomodoro Master', desc: 'Log 50 study sessions', target: 50, unit: 'sessions', stat: (p) => p.sessions_count },
  { id: 'streak_3', icon: Flame, title: 'On Fire', desc: 'Reach a 3-day streak', target: 3, unit: 'days', stat: (p) => p.best_streak },
  { id: 'streak_7', icon: Crown, title: 'Consistency King', desc: 'Reach a 7-day streak', target: 7, unit: 'days', stat: (p) => p.best_streak },
  { id: 'streak_30', icon: Trophy, title: 'Unstoppable', desc: 'Reach a 30-day streak', target: 30, unit: 'days', stat: (p) => p.best_streak },
  { id: 'hours_10', icon: Award, title: 'Ten Hour Club', desc: 'Study for 10 hours in total', target: 10, unit: 'hours', stat: (p) => p.total_seconds / 3600 },
  { id: 'hours_50', icon: Trophy, title: 'Marathoner', desc: 'Study for 50 hours in total', target: 50, unit: 'hours', stat: (p) => p.total_seconds / 3600 },
  { id: 'level_5', icon: GraduationCap, title: 'Scholar', desc: 'Reach level 5', target: 5, unit: 'level', stat: (p) => levelFromXp(p.xp) },
  { id: 'level_10', icon: Crown, title: 'Grand Scholar', desc: 'Reach level 10', target: 10, unit: 'level', stat: (p) => levelFromXp(p.xp) },
]
export const badgeById = (id: string) => BADGES.find((b) => b.id === id)

export function celebrate(big = false) {
  const fire = (ratio: number, o: confetti.Options) =>
    confetti({ origin: { y: 0.7 }, particleCount: Math.floor((big ? 260 : 120) * ratio), ...o })
  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 })
  fire(0.2, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
}

export const REMINDER_LINES = [
  (n: number) => `Don't let your ${n}-day streak freeze! Study 15 mins now!`,
  (n: number) => `Your ${n}-day streak is on the line. 15 focused minutes will save it.`,
  (n: number) => `Quick one! A short session keeps your ${n}-day streak alive.`,
]
