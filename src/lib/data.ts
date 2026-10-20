import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { Session, Subject } from './types'
import { daysAgo } from './utils'

export function useSubjects() {
  const { user } = useAuth()
  const uid = user?.id
  const [subjects, setSubjects] = useState<Subject[]>([])
  const reload = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase.from('subjects').select('*').order('created_at')
    setSubjects((data ?? []) as Subject[])
  }, [uid])
  useEffect(() => { void reload() }, [reload])
  return { subjects, reload }
}

/** Study sessions from the last `days` days (including today). Reloads when a new session is logged. */
export function useSessions(days: number) {
  const { user, profile } = useAuth()
  const uid = user?.id
  const count = profile?.sessions_count
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!uid) return
    let alive = true
    setLoading(true)
    void supabase.from('study_sessions').select('*').gte('day', daysAgo(days - 1)).order('started_at', { ascending: false })
      .then(({ data }) => { if (alive) { setSessions((data ?? []) as Session[]); setLoading(false) } })
    return () => { alive = false }
  }, [uid, days, count])
  return { sessions, loading }
}
