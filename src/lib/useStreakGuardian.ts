import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { effectiveStreak, REMINDER_LINES, studiedToday } from './game'
import { browserNotify } from './notify'
import { playReminder, playSad } from './sounds'
import { ymd } from './utils'

const SLOTS = [17, 20, 22] // hours of the day when we nudge a student who has not studied yet
const seen = (k: string) => localStorage.getItem(k) !== null
const mark = (k: string) => localStorage.setItem(k, '1')

/**
 * Duolingo-style streak protection.
 *  - At risk: the student has a streak but has not studied today. One popup per day on open,
 *    then a toast + browser notification at 17:00, 20:00 and 22:00 while the app is open.
 *  - Lost: the streak lapsed. Show a one-time sympathetic popup.
 */
export function useStreakGuardian() {
  const { profile } = useAuth()
  const { showPopup, toast } = useUI()

  useEffect(() => {
    if (!profile) return
    const remindersOn = localStorage.getItem('sq:reminders') !== 'off'

    const check = () => {
      const today = ymd()
      const streak = effectiveStreak(profile)

      if (profile.streak > 0 && streak === 0 && profile.last_study_date) {
        const key = `sq:lost:${profile.id}:${profile.last_study_date}`
        if (!seen(key)) {
          mark(key)
          playSad()
          showPopup({
            icon: 'flame-off', tone: 'sad', title: 'Your streak ended',
            body: `Your ${profile.streak}-day streak is over, but every great run starts again. Study today to begin a new one!`,
            primary: { label: 'Start a session', to: '/timer' },
          })
          if (remindersOn) browserNotify('Streak ended', `Your ${profile.streak}-day streak is over. Start a new one today!`, 'lost')
        }
        return
      }

      if (streak > 0 && !studiedToday(profile) && remindersOn) {
        const hour = new Date().getHours()
        const slot = [...SLOTS].reverse().find((s) => hour >= s)
        const line = REMINDER_LINES[new Date().getDate() % REMINDER_LINES.length](streak)
        const openKey = `sq:risk-open:${profile.id}:${today}`
        const slotKey = `sq:risk:${profile.id}:${today}:${slot ?? 'none'}`

        if (!seen(openKey)) {
          mark(openKey)
          if (slot) mark(slotKey)
          playReminder()
          showPopup({ icon: 'flame', tone: 'warn', title: `${streak}-day streak at risk!`, body: line, primary: { label: 'Study 15 mins now', to: '/timer' } })
        } else if (slot && !seen(slotKey)) {
          mark(slotKey)
          playReminder()
          toast(`🔥 ${line}`)
          browserNotify('StudyQuest streak reminder', line, 'risk')
        }
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.streak, profile?.last_study_date])
}
