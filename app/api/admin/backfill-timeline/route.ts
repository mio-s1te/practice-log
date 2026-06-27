import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/admin/backfill-timeline
// 過去のチェックインデータに対して timeline_events を遡及作成する（管理者専用）
export async function POST(req: NextRequest) {
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { generation, days = 30 } = await req.json()

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です。Netlifyの環境変数を確認してください。' }, { status: 500 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 対象generationのメンバー取得
  const profilesQuery = adminClient.from('profiles').select('id, generation, name')
  if (generation) {
    profilesQuery.eq('generation', generation)
  } else {
    profilesQuery.not('generation', 'is', null)
  }
  const { data: members } = await profilesQuery

  if (!members || members.length === 0) {
    return NextResponse.json({ ok: true, created: 0, message: '対象メンバーなし' })
  }

  const since = new Date()
  since.setDate(since.getDate() - Number(days))

  let createdCount = 0
  const errors: string[] = []

  for (const member of members) {
    if (!member.generation) continue

    // このメンバーの過去のチェックイン取得
    const { data: checkins } = await adminClient
      .from('checkins')
      .select('id, date, has_question')
      .eq('user_id', member.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (!checkins || checkins.length === 0) continue

    // 既存のtimeline_eventsを取得（重複作成防止）
    const checkinIds = checkins.map((c: any) => c.id)
    const { data: existingEvents } = await adminClient
      .from('timeline_events')
      .select('checkin_id')
      .eq('user_id', member.id)
      .in('checkin_id', checkinIds)

    const existingCheckinIds = new Set((existingEvents ?? []).map((e: any) => e.checkin_id))

    // 未登録のチェックインに対してtimeline_eventを作成
    for (const checkin of checkins) {
      if (existingCheckinIds.has(checkin.id)) continue

      const eventType = checkin.has_question ? 'question' : 'checkin'
      const { error } = await adminClient
        .from('timeline_events')
        .insert({
          user_id: member.id,
          generation: member.generation,
          event_type: eventType,
          checkin_id: checkin.id,
        })

      if (error) {
        errors.push(`${member.name}（${checkin.date}）: ${error.message}`)
      } else {
        createdCount++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    created: createdCount,
    errors: errors.length > 0 ? errors : undefined,
    message: `${createdCount}件のタイムラインイベントを作成しました`,
  })
}
