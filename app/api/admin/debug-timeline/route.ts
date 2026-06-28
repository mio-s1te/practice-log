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
    currentUser: { id: user.id.slice(0, 8), generation: profile.generation },
    envCheck: {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...',
    },
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // --- profiles テーブル ---
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

  // --- achievements テーブル（全件・詳細） ---
  const { data: achievements, error: achError } = await adminClient
    .from('achievements')
    .select('id, user_id, public_ok, date, achievement_text')
    .order('date', { ascending: false })
    .limit(50)

  // profiles の name マップ
  const nameMap: Record<string, string> = {}
  allProfiles?.forEach((p: any) => { nameMap[p.id] = p.name })

  result.achievements = {
    count: achievements?.length ?? 0,
    error: achError?.message ?? null,
    publicBreakdown: achievements?.reduce((acc: any, a: any) => {
      acc[a.public_ok] = (acc[a.public_ok] ?? 0) + 1
      return acc
    }, {}) ?? {},
    // 全件の詳細（誰が何を投稿したか・public_okは何か）
    detail: achievements?.map((a: any) => ({
      name: nameMap[a.user_id] ?? a.user_id.slice(0, 8),
      public_ok: a.public_ok,
      date: a.date,
      text: a.achievement_text?.slice(0, 20),
    })) ?? [],
  }

  // --- 同期生フィルタ後のachievements ---
  if (profile.generation) {
    const genMembers = allProfiles?.filter((p: any) => p.generation === profile.generation && p.id !== user.id) ?? []
    const genIds = genMembers.map((p: any) => p.id)

    result.generationAchievementsCheck = {
      generation: profile.generation,
      genMemberCount: genMembers.length,
      genMemberNames: genMembers.map((p: any) => p.name),
    }

    if (genIds.length > 0) {
      // NGを含む全件
      const { data: allGenAch, error: allGenAchErr } = await adminClient
        .from('achievements')
        .select('id, user_id, public_ok, date')
        .in('user_id', genIds)

      // NGを除いた件数
      const { data: visibleGenAch, error: visibleErr } = await adminClient
        .from('achievements')
        .select('id, user_id, public_ok, date, achievement_text')
        .in('user_id', genIds)
        .neq('public_ok', 'NG')

      result.generationAchievementsCheck = {
        ...result.generationAchievementsCheck,
        totalIncludingNG: allGenAch?.length ?? 0,
        totalExcludingNG: visibleGenAch?.length ?? 0,
        allGenAchErr: allGenAchErr?.message ?? null,
        visibleErr: visibleErr?.message ?? null,
        detail: allGenAch?.map((a: any) => ({
          name: nameMap[a.user_id] ?? a.user_id.slice(0, 8),
          public_ok: a.public_ok,
          date: a.date,
          visible: a.public_ok !== 'NG',
        })) ?? [],
      }
    }
  }

  // --- timeline_events テーブル ---
  const { data: timelineEvents, error: timelineError } = await adminClient
    .from('timeline_events')
    .select('id, user_id, generation, event_type, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  result.timelineEvents = {
    count: timelineEvents?.length ?? 0,
    error: timelineError?.message ?? null,
    data: timelineEvents?.map((e: any) => ({
      name: nameMap[e.user_id] ?? e.user_id?.slice(0, 8),
      generation: e.generation,
      event_type: e.event_type,
      created_at: e.created_at,
    })) ?? [],
  }

  if (profile.generation) {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const { data: myGenEvents } = await adminClient
      .from('timeline_events')
      .select('id, user_id, event_type, created_at')
      .eq('generation', profile.generation)
      .gte('created_at', since.toISOString())

    result.myGenerationEvents = {
      generation: profile.generation,
      last7days: myGenEvents?.length ?? 0,
      breakdown: myGenEvents?.reduce((acc: any, e: any) => {
        const name = nameMap[e.user_id] ?? e.user_id?.slice(0, 8)
        if (!acc[name]) acc[name] = {}
        acc[name][e.event_type] = (acc[name][e.event_type] ?? 0) + 1
        return acc
      }, {}) ?? {},
    }
  }

  return NextResponse.json(result, { status: 200 })
}
