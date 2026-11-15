import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Session } from './local/client'

export type Role = 'owner' | 'creator' | 'staff' | 'admin'
export type Profile = { id: string; role: Role; name: string; email: string; phone: string }

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function homeFor(role: Role | undefined) {
  switch (role) {
    case 'owner': return '/owner'
    case 'creator': return '/creator'
    case 'staff': return '/staff'
    case 'admin': return '/admin'
    default: return '/'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('id, role, name, email, phone').eq('id', s.user.id).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      await loadProfile(data.session)
      if (alive) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // defer so we don't call Supabase inside its own callback
      setTimeout(() => { loadProfile(s).finally(() => setLoading(false)) }, 0)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const value: AuthState = {
    loading,
    session,
    profile,
    refresh: () => loadProfile(session),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
