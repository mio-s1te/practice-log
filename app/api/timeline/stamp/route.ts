import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/timeline/stamp  → スタンプを押す/外す（トグル）
export async function POST(req: NextRequest) {
  const { timelineEventId, stamp } = await req.json()

  const VALID_STAMPS = ['💪', '😭', '👏', '🌟', '❤️']
  if (!timelineEventId || !VALID_STAMPS.includes(stamp)) {
    return NextResponse.json({ error: '無効なリクエスト' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // 既存スタンプを確認
  const { data: existing } = await supabase
    .from('encourage_stamps')
    .select('id, stamp')
    .eq('timeline_event_id', timelineEventId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.stamp === stamp) {
      // 同じスタンプ → 取り消し
      await supabase.from('encourage_stamps').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed', stamp })
    } else {
      // 違うスタンプ → 差し替え
      await supabase.from('encourage_stamps').update({ stamp }).eq('id', existing.id)
      return NextResponse.json({ action: 'changed', stamp })
    }
  }

  // 新規スタンプ
  await supabase.from('encourage_stamps').insert({
    timeline_event_id: timelineEventId,
    user_id: user.id,
    stamp,
  })
  return NextResponse.json({ action: 'added', stamp })
}
