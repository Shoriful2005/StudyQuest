import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/lib/types'

export type Snapshot = { profile: Profile | null; badges: string[] }

type AuthCtx = {
  user: User | null
  profile: Profile | null
  badges: string[]
  loading: boolean
  refresh: () => Promise<Snapshot>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

async function fetchSnapshot(uid: string): Promise<Snapshot> {
  const [p, b] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('user_badges').select('badge_id').eq('user_id', uid),
  ])
  return {
    profile: (p.data as Profile | null) ?? null,
    badges: (b.data ?? []).map((r) => r.badge_id as string),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [badges, setBadges] = useState<string[]>([])
  const [booting, setBooting] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const uid = user?.id

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setBooting(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!uid) { setProfile(null); setBadges([]); return }
    let alive = true
    setLoadingProfile(true)
    void (async () => {
      let snap = await fetchSnapshot(uid)
      if (!snap.profile) { // the signup trigger can lag a moment
        await new Promise((r) => setTimeout(r, 700))
        snap = await fetchSnapshot(uid)
      }
      if (alive) { setProfile(snap.profile); setBadges(snap.badges); setLoadingProfile(false) }
    })()
    return () => { alive = false }
  }, [uid])

  const refresh = useCallback(async () => {
    if (!uid) return { profile: null, badges: [] }
    const snap = await fetchSnapshot(uid)
    setProfile(snap.profile)
    setBadges(snap.badges)
    return snap
  }, [uid])

  const signOut = useCallback(async () => { await supabase.auth.signOut() }, [])

  const value = useMemo(
    () => ({ user, profile, badges, loading: booting || loadingProfile, refresh, signOut }),
    [user, profile, badges, booting, loadingProfile, refresh, signOut],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
