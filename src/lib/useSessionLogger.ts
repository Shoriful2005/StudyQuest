import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { badgeById, celebrate, effectiveStreak, levelFromXp } from './game'
import { browserNotify } from './notify'
import { playSuccess } from './sounds'
import { ymd } from './utils'

export type LogArgs = { seconds: number; completed: boolean; subjectId?: string | null; taskId?: string | null }

/** Saves a study session to Supabase. XP, streak and badges are computed by the database trigger. */
export function useSessionLogger() {
  const { user, profile, badges, refresh } = useAuth()
  const { toast, showPopup } = useUI()

  return useCallback(async (args: LogArgs) => {
    if (!user || !profile) return null
    const before = { level: levelFromXp(profile.xp), badges, streak: effectiveStreak(profile) }

    const { data, error } = await supabase.from('study_sessions').insert({
      user_id: user.id, subject_id: args.subjectId ?? null, task_id: args.taskId ?? null,
      seconds: Math.floor(args.seconds), completed: args.completed, day: ymd(),
    }).select().single()
    if (error || !data) {
      toast(error?.message ?? 'Could not save the session', 'error')
      return null
    }

    const after = await refresh()
    const xp = (data as { xp_earned: number }).xp_earned
    const ap = after.profile
    if (!ap) return { xp }

    const newBadges = after.badges.filter((b) => !before.badges.includes(b))
    const leveledUp = levelFromXp(ap.xp) > before.level
    const streakNow = effectiveStreak(ap)

    playSuccess()
    toast(`Session saved: +${xp} XP`, 'success')
    if (streakNow > before.streak) toast(`🔥 ${streakNow}-day streak! Keep it going.`, 'success')
    if (leveledUp) {
      celebrate(true)
      showPopup({ icon: 'star', tone: 'good', title: 'Level up!', body: `You reached level ${levelFromXp(ap.xp)}. Amazing focus!` })
    } else if (newBadges.length) celebrate()
    for (const id of newBadges) {
      const b = badgeById(id)
      showPopup({ icon: 'award', tone: 'good', title: 'Badge unlocked', body: b ? `${b.title}: ${b.desc}` : id, primary: { label: 'See achievements', to: '/achievements' } })
    }
    if (document.hidden) browserNotify('Session saved', `+${xp} XP${streakNow > before.streak ? ` · ${streakNow}-day streak` : ''}`, 'session')
    return { xp }
  }, [user, profile, badges, refresh, toast, showPopup])
}
