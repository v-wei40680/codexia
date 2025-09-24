import type { User } from '@supabase/supabase-js'
import supabase, { isSupabaseConfigured } from '@/lib/supabase'

export type ProfileRecord = {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  bio: string | null
  website: string | null
  github_url: string | null
  x_url: string | null
  updated_at?: string | null
}

function githubUrlFromMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null
  const direct = metadata.html_url
  if (typeof direct === 'string' && direct.startsWith('http')) return direct
  const handleEntry = [metadata.user_name, metadata.preferred_username, metadata.nickname].find(
    (value) => typeof value === 'string' && value.length > 0,
  )
  if (typeof handleEntry === 'string' && handleEntry.length > 0) {
    return `https://github.com/${handleEntry}`
  }
  return null
}

export function profileDefaultsFromMetadata(user: User) {
  const metadata = (user.user_metadata as Record<string, unknown> | null) ?? null
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name : null
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null
  const githubUrl = githubUrlFromMetadata(metadata)
  return { full_name: fullName, avatar_url: avatarUrl, github_url: githubUrl }
}

export function mapProfileRow(row: unknown): ProfileRecord | null {
  if (!row || typeof row !== 'object') return null
  const record = row as Record<string, unknown>
  const idRaw = record.id
  if (typeof idRaw !== 'string') return null
  return {
    id: idRaw,
    full_name: typeof record.full_name === 'string' ? record.full_name : null,
    avatar_url: typeof record.avatar_url === 'string' ? record.avatar_url : null,
    bio: (record.bio ?? null) as string | null,
    website: (record.website ?? null) as string | null,
    github_url: (record.github_url ?? null) as string | null,
    x_url: (record.x_url ?? null) as string | null,
    updated_at: (record.updated_at ?? null) as string | null,
  }
}

/**
 * Ensure the current user has a profile row. Returns the created or existing profile.
 */
export async function ensureProfileRecord(user: User): Promise<ProfileRecord | null> {
  if (!user || !isSupabaseConfigured || !supabase) return null

  const defaults = profileDefaultsFromMetadata(user)

  const payload = {
    id: user.id,
    full_name: defaults.full_name,
    avatar_url: defaults.avatar_url,
    github_url: defaults.github_url,
  }

  const selectColumns = 'id, full_name, avatar_url, bio, website, github_url, x_url, updated_at'

  const insertResult = await supabase
    .from('profiles')
    .insert(payload)
    .select(selectColumns)
    .maybeSingle()

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      const existing = await supabase
        .from('profiles')
        .select(selectColumns)
        .eq('id', user.id)
        .maybeSingle()
      if (existing.error) throw existing.error
      return mapProfileRow(existing.data)
    }
    throw insertResult.error
  }

  return mapProfileRow(insertResult.data)
}
