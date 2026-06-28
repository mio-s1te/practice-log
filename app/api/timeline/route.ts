import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/timeline  → 自分の同期のタイムラインを取得
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
    .select('generation')
    .eq('id', user.id)
    .single()

  if (!profile?.generation) {
    return NextResponse.json({ events: [], emojiMap: {} })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[timeline] SUPABASE_SERVICE_ROLE_KEY が未設定です')
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 過去7日のタイムラインイベント取得
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const { data: events, error: eventsError } = await adminClient
    .from('timeline_events')
    .select(`
      id, event_type, created_at, user_id, checkin_id, achievement_id,
      encourage_stamps(id, stamp, user_id)
    `)
    .eq('generation', profile.generation)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (eventsError) {
    console.error('[timeline] events fetch error:', eventsError.message)
  }

  console.log(`[timeline] generation=${profile.generation}, events=${events?.length ?? 0}`)

  // achievement_id を収集して achievement 詳細を一括取得
  const achievementIds = (events ?? [])
    .filter((e: any) => e.achievement_id)
    .map((e: any) => e.achievement_id as string)

  const achievementsMap: Record<string, { achievement_text: string; public_ok: string }> = {}

  if (achievementIds.length > 0) {
    const { data: achRows, error: achError } = await adminClient
      .from('achievements')
      .select('id, achievement_text, public_ok')
      .in('id', achievementIds)

    if (achError) {
      console.error('[timeline] achievements fetch error:', achError.message)
    }

    ;(achRows ?? []).forEach((a: any) => {
      achievementsMap[a.id] = {
        achievement_text: a.achievement_text,
        public_ok: a.public_ok,
      }
    })
  }

  // events に achievement 詳細を付与
  const enrichedEvents = (events ?? []).map((ev: any) => ({
    ...ev,
    achievement: ev.achievement_id ? (achievementsMap[ev.achievement_id] ?? null) : null,
  }))

  // 絵文字マップを取得（この世代の全メンバー）
  const { data: emojiRows, error: emojiError } = await adminClient
    .from('emoji_assignments')
    .select('user_id, emoji')
    .eq('generation', profile.generation)

  if (emojiError) {
    console.error('[timeline] emoji fetch error:', emojiError.message)
  }

  const emojiMap: Record<string, string> = {}
  ;(emojiRows ?? []).forEach((r: any) => { emojiMap[r.user_id] = r.emoji })

  return NextResponse.json({
    events: enrichedEvents,
    emojiMap,
    myUserId: user.id,
  })
}
