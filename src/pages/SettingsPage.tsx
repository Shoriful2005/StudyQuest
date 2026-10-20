import { useState } from 'react'
import { Bell, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'
import { askNotifPermission, browserNotify, notifPermission } from '@/lib/notify'
import { playReminder, setSoundEnabled, soundEnabled } from '@/lib/sounds'
import { REMINDER_LINES } from '@/lib/game'

export default function SettingsPage() {
  const { profile, refresh, signOut } = useAuth()
  const { toast } = useUI()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [goal, setGoal] = useState(profile?.daily_goal_minutes ?? 60)
  const [perm, setPerm] = useState(notifPermission())
  const [sound, setSound] = useState(soundEnabled())
  const [reminders, setReminders] = useState(localStorage.getItem('sq:reminders') !== 'off')
  if (!profile) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() || profile!.display_name, daily_goal_minutes: Math.min(720, Math.max(5, Math.round(goal) || 60)) }).eq('id', profile!.id)
    if (error) return toast(error.message, 'error')
    await refresh(); toast('Settings saved', 'success')
  }
  async function enableNotifs() {
    const p = await askNotifPermission(); setPerm(p)
    if (p === 'granted') browserNotify('Notifications are on', 'We will remind you before your streak is at risk.', 'welcome')
    else toast('Notifications are blocked. Allow them in your browser site settings.', 'error')
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold">Profile</h2>
        <label className="block text-sm font-semibold">Display name<input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
        <label className="block text-sm font-semibold">Daily goal (minutes)<input className="input mt-1" type="number" min={5} max={720} value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></label>
        <p className="muted text-xs">Signed in as {profile.email}</p>
        <button className="btn-primary">Save changes</button>
      </form>

      <section className="card space-y-4">
        <h2 className="font-bold">Reminders &amp; sounds</h2>
        <label className="flex items-center justify-between gap-4 text-sm font-semibold">Streak reminders
          <input type="checkbox" className="h-5 w-5 accent-tide-600" checked={reminders} onChange={(e) => { setReminders(e.target.checked); localStorage.setItem('sq:reminders', e.target.checked ? 'on' : 'off') }} /></label>
        <label className="flex items-center justify-between gap-4 text-sm font-semibold">Sound effects
          <input type="checkbox" className="h-5 w-5 accent-tide-600" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundEnabled(e.target.checked) }} /></label>
        <div className="flex flex-wrap items-center gap-3">
          {perm === 'granted' ? <span className="flex items-center gap-2 text-sm text-tide-600 dark:text-tide-400"><Bell className="h-4 w-4" />Browser notifications are on</span>
            : perm === 'unsupported' ? <span className="muted text-sm">This browser does not support notifications.</span>
            : <button type="button" className="btn-outline" onClick={() => void enableNotifs()}><Bell className="h-4 w-4" />Turn on browser notifications</button>}
          <button type="button" className="btn-ghost" onClick={() => { playReminder(); toast(`🔥 ${REMINDER_LINES[0](5)}`); browserNotify('StudyQuest streak reminder', REMINDER_LINES[0](5), 'test') }}>Send a test reminder</button>
        </div>
        <p className="muted text-xs">Browser notifications appear while StudyQuest is open in a tab. We nudge you at 5 pm, 8 pm and 10 pm if your streak is at risk.</p>
      </section>

      <button className="btn-outline w-full md:hidden" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sign out</button>
    </div>
  )
}
