import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrAssignEmoji } from '@/lib/emoji'

const STAMPS = ['💪', '😭', '👏', '🌟', '❤️'] as const

// POST /api/timeline/event
// チェックイン後に呼び出してタイムラインイベントを作成＋Discord通知
export async function POST(req: NextRequest) {
  const { checkinId, eventType, moodList } = await req.json()
  // eventType: 'checkin' | 'question' | 'encourage'
  // moodList: string[] （複数選択された気分）

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
    .select('generation, role')
    .eq('id', user.id)
    .single()

  if (!profile?.generation) {
    return NextResponse.json({ ok: true, skipped: 'no generation' })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 絵文字割り当て
  const emoji = await getOrAssignEmoji(adminClient, user.id, profile.generation)

  // タイムラインイベント作成
  const { data: event } = await adminClient
    .from('timeline_events')
    .insert({
      user_id: user.id,
      generation: profile.generation,
      event_type: eventType,
      checkin_id: checkinId,
    })
    .select()
    .single()

  // Discord通知（励ましがほしい時のみ）
  const isEncourage = Array.isArray(moodList)
    ? moodList.includes('励ましがほしい')
    : eventType === 'encourage'

  if (isEncourage && process.env.DISCORD_WEBHOOK_URL) {
    const message = [
      `**${profile.generation}** の仲間が励ましを求めています 💛`,
      `> 同期の誰かが今日少し行き詰まっているようです。`,
      `> アプリから応援スタンプを送ってあげましょう！`,
      `> ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'}/dashboard`,
    ].join('\n')

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    }).catch(() => {}) // Discord失敗してもチェックインは成功扱い
  }

  return NextResponse.json({ ok: true, eventId: event?.id, emoji })
}
