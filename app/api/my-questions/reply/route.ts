import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/my-questions/reply
// → メンバーがスタッフの回答に返信する
export async function POST(req: NextRequest) {
  const { checkinId, replyText, parentReplyId } = await req.json()
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

  // 自分のチェックインであることを確認
  const { data: checkin } = await supabase
    .from('checkins')
    .select('id, user_id')
    .eq('id', checkinId)
    .eq('user_id', user.id)
    .single()

  if (!checkin) {
    return NextResponse.json({ error: '該当する質問が見つかりません' }, { status: 403 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: reply, error } = await adminClient
    .from('question_replies')
    .insert({
      checkin_id: checkinId,
      staff_id: user.id,   // スキーマ上 staff_id は必須なので自分のIDを入れる（from_memberフラグで区別）
      reply_text: replyText.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ステータスを「メンバー返信あり」に更新（未対応→対応中の場合のみ）
  await adminClient
    .from('question_statuses')
    .upsert(
      { checkin_id: checkinId, status: '対応中' },
      { onConflict: 'checkin_id', ignoreDuplicates: true }
    )

  return NextResponse.json({ ok: true, reply })
}
