import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrAssignEmoji } from '@/lib/emoji'

// POST /api/admin/question-reply  → スタッフが質問に回答
export async function POST(req: NextRequest) {
  const { checkinId, replyText } = await req.json()
  if (!checkinId || !replyText?.trim()) {
    return NextResponse.json({ error: 'checkinId と replyText は必須です' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, generation')
    .eq('id', user.id)
    .single()

  if (!caller || !['staff', 'admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'スタッフ以上の権限が必要です' }, { status: 403 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 回答を保存
  const { data: reply, error } = await adminClient
    .from('question_replies')
    .insert({ checkin_id: checkinId, staff_id: user.id, reply_text: replyText.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ステータスを「個別回答済み」に更新
  await adminClient
    .from('question_statuses')
    .upsert(
      { checkin_id: checkinId, status: '個別回答済み', staff_id: user.id },
      { onConflict: 'checkin_id' }
    )

  // 質問者のgenerationを取得してタイムラインイベントを追加
  const { data: checkin } = await adminClient
    .from('checkins')
    .select('user_id, profiles!inner(generation)')
    .eq('id', checkinId)
    .single()

  if (checkin) {
    const memberGen = (checkin.profiles as any)?.generation
    if (memberGen) {
      await adminClient.from('timeline_events').insert({
        user_id: user.id,
        generation: memberGen,
        event_type: 'staff_reply',
        checkin_id: checkinId,
      })
    }
  }

  return NextResponse.json({ ok: true, reply })
}
