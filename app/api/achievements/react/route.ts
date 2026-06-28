import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ALLOWED_EMOJIS = ['❤️', '🎉', '👏', '✨', '🔥']

// GET /api/achievements/react?achievementId=xxx
// → emoji別リアクション数と自分がリアクションしたかどうかを返す
export async function GET(req: NextRequest) {
  const achievementId = req.nextUrl.searchParams.get('achievementId')
  if (!achievementId) {
    return NextResponse.json({ error: 'achievementId is required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: reactions } = await adminClient
    .from('achievement_reactions')
    .select('emoji, user_id')
    .eq('achievement_id', achievementId)

  // emoji別集計
  const counts: Record<string, { count: number; reacted: boolean }> = {}
  for (const emoji of ALLOWED_EMOJIS) {
    counts[emoji] = { count: 0, reacted: false }
  }
  ;(reactions ?? []).forEach((r: any) => {
    if (!counts[r.emoji]) counts[r.emoji] = { count: 0, reacted: false }
    counts[r.emoji].count += 1
    if (r.user_id === user.id) counts[r.emoji].reacted = true
  })

  return NextResponse.json({ counts })
}

// POST /api/achievements/react
// body: { achievementId, emoji }
// → 既にリアクション済みなら削除（トグル）、未リアクションなら追加
export async function POST(req: NextRequest) {
  const { achievementId, emoji } = await req.json()

  if (!achievementId || !emoji) {
    return NextResponse.json({ error: 'achievementId と emoji は必須です' }, { status: 400 })
  }

  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: '無効な emoji です' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 既存リアクションを確認
  const { data: existing } = await adminClient
    .from('achievement_reactions')
    .select('id')
    .eq('achievement_id', achievementId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    // 既にリアクション済み → 削除（トグルoff）
    await adminClient
      .from('achievement_reactions')
      .delete()
      .eq('id', existing.id)

    return NextResponse.json({ action: 'removed', emoji })
  } else {
    // 未リアクション → 追加
    const { error } = await adminClient
      .from('achievement_reactions')
      .insert({
        achievement_id: achievementId,
        user_id: user.id,
        emoji,
      })

    if (error) {
      console.error('[achievements/react] insert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ action: 'added', emoji })
  }
}
