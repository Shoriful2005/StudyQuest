export type Profile = {
  id: string
  email: string | null
  display_name: string
  avatar_url: string | null
  xp: number
  streak: number
  best_streak: number
  last_study_date: string | null
  total_seconds: number
  sessions_count: number
  daily_goal_minutes: number
  created_at: string
}
export type Subject = { id: string; user_id: string; name: string; color: string }
export type Task = {
  id: string; user_id: string; subject_id: string | null; title: string
  priority: 'low' | 'medium' | 'high'; done: boolean; due_date: string | null
  completed_at: string | null; created_at: string
}
export type Session = {
  id: string; user_id: string; subject_id: string | null; task_id: string | null
  seconds: number; completed: boolean; xp_earned: number; day: string; started_at: string
}
