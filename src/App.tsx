import { Navigate, Route, Routes } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { TimerProvider } from '@/context/TimerContext'
import { useStreakGuardian } from '@/lib/useStreakGuardian'
import AppShell from '@/components/AppShell'
import UIHost from '@/components/UIHost'
import AuthPage from '@/pages/AuthPage'
import Dashboard from '@/pages/Dashboard'
import TimerPage from '@/pages/TimerPage'
import TasksPage from '@/pages/TasksPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import AchievementsPage from '@/pages/AchievementsPage'
import SettingsPage from '@/pages/SettingsPage'
import AdminPage from '@/pages/admin/AdminPage'

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <Flame className="h-10 w-10 animate-flicker text-ember-500" fill="currentColor" />
      {children ?? <p className="muted text-sm">Loading…</p>}
    </div>
  )
}

function Guardian() { useStreakGuardian(); return null }

function StudentApp() {
  const { user, profile, loading, signOut } = useAuth()
  if (loading) return <Splash />
  if (!user) return <AuthPage />
  if (!profile) {
    return (
      <Splash>
        <p className="max-w-sm text-sm">We could not load your profile. Make sure you ran <code>supabase/schema.sql</code> in the Supabase SQL Editor, then sign in again.</p>
        <button className="btn-outline" onClick={() => void signOut()}>Sign out</button>
      </Splash>
    )
  }
  return (
    <TimerProvider>
      <Guardian />
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </TimerProvider>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Secret route. Intentionally not linked from the navbar, footer or anywhere else. */}
        <Route path="/studyquest-admin" element={<AdminPage />} />
        <Route path="/*" element={<StudentApp />} />
      </Routes>
      <UIHost />
    </>
  )
}
