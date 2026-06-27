import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/admin/debug-timeline
// タイムライン・成果報告まわりの状態を一括診断（admin/staffのみ）
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, generation')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const result: Record<string, any> = {
    currentUser: { id: user.id, generation: profile.generation },
    envCheck: {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  }

  // adminClient でのアクセス確認
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // --- profiles テーブル確認 ---
  const { data: allProfiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, name, generation, role')
    .not('generation', 'is', null)

  result.profiles = {
    count: allProfiles?.length ?? 0,
    error: profilesError?.message ?? null,
    data: allProfiles?.map((p: any) => ({
      id: p.id.slice(0, 8),
      name: p.name,
      generation: p.generation,
      role: p.role,
    })) ?? [],
  }

  // --- timeline_events テーブル確認 ---
  const { data: timelineEvents, error: timelineError } = await adminClient
    .from('timeline_events')
    .select('id, user_id, generation, event_type, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  result.timelineEvents = {
    count: timelineEvents?.length ?? 0,
    error: timelineError?.message ?? null,
    data: timelineEvents?.map((e: any) => ({
      id: e.id.slice(0, 8),
      user_id: e.user_id?.slice(0, 8),
      generation: e.generation,
      event_type: e.event_type,
      created_at: e.created_at,
    })) ?? [],
  }

  // --- 現在のgenerationのイベント数 ---
  if (profile.generation) {
    const since = new Date()
    since.setDate(since.getDate() - 7)

    const { data: myGenEvents, error: myGenError } = await adminClient
      .from('timeline_events')
      .select('id, user_id, event_type, created_at')
      .eq('generation', profile.generation)
      .gte('created_at', since.toISOString())

    result.myGenerationEvents = {
      generation: profile.generation,
      last7days: myGenEvents?.length ?? 0,
      error: myGenError?.message ?? null,
      breakdown: myGenEvents?.reduce((acc: any, e: any) => {
        acc[e.event_type] = (acc[e.event_type] ?? 0) + 1
        return acc
      }, {}) ?? {},
    }
  }

  // --- achievements テーブル確認 ---
  const { data: achievements, error: achError } = await adminClient
    .from('achievements')
    .select('id, user_id, public_ok, date')
    .order('date', { ascending: false })
    .limit(20)

  result.achievements = {
    count: achievements?.length ?? 0,
    error: achError?.message ?? null,
    publicBreakdown: achievements?.reduce((acc: any, a: any) => {
      acc[a.public_ok] = (acc[a.public_ok] ?? 0) + 1
      return acc
    }, {}) ?? {},
  }

  // --- emoji_assignments 確認 ---
  const { data: emojis, error: emojiError } = await adminClient
    .from('emoji_assignments')
    .select('user_id, generation, emoji')

  result.emojiAssignments = {
    count: emojis?.length ?? 0,
    error: emojiError?.message ?? null,
    byGeneration: emojis?.reduce((acc: any, e: any) => {
      if (!acc[e.generation]) acc[e.generation] = 0
      acc[e.generation]++
      return acc
    }, {}) ?? {},
  }

  return NextResponse.json(result, { status: 200 })
}
