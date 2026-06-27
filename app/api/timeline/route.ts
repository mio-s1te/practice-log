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
      id, event_type, created_at, user_id, checkin_id,
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
    events: events ?? [],
    emojiMap,
    myUserId: user.id,
  })
}
