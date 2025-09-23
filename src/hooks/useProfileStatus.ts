import { useEffect, useState } from 'react'
import supabase, { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// Returns whether the current (authenticated) user has a completed profile.
// If Supabase is not configured or there is no user, the check is not applicable
// and the hook reports hasProfile=true so the UI remains fully enabled.
export function useProfileStatus() {
  const { user } = useAuth()
  const requiresProfileCheck = Boolean(isSupabaseConfigured && supabase && user)
  const [loading, setLoading] = useState(false)
  const [hasProfile, setHasProfile] = useState(true)

  const userId = user?.id

  useEffect(() => {
    if (!requiresProfileCheck) {
      setHasProfile(true)
      setLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase!
          .from('profiles')
          .select('id, bio, website, github_url, x_url')
          .eq('id', userId!)
          .maybeSingle()
        if (error) throw error
        const ok = Boolean(
          data && (data.bio || data.website || data.github_url || data.x_url)
        )
        if (!cancelled) setHasProfile(ok)
      } catch {
        // On error, treat as no profile so we can drive onboarding.
        if (!cancelled) setHasProfile(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [requiresProfileCheck, userId])

  return { hasProfile, loading, requiresProfileCheck }
}

