import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/my-questions
// → ログイン中のメンバー自身の質問チェックインと、それに紐づく回答・返信を返す
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 自分の質問ありチェックインを取得（最新30件）
  const { data: checkins, error } = await adminClient
    .from('checkins')
    .select('id, date, question_text, category')
    .eq('user_id', user.id)
    .eq('has_question', true)
    .order('date', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!checkins || checkins.length === 0) {
    return NextResponse.json({ questions: [] })
  }

  const checkinIds = checkins.map((c) => c.id)

  // 回答を取得（from_member・parent_reply_idは013マイグレーション後に追加されるカラム）
  const { data: replies } = await adminClient
    .from('question_replies')
    .select('id, checkin_id, reply_text, created_at')
    .in('checkin_id', checkinIds)
    .order('created_at', { ascending: true })

  // ステータスを取得
  const { data: statuses } = await adminClient
    .from('question_statuses')
    .select('checkin_id, status')
    .in('checkin_id', checkinIds)

  const statusMap: Record<string, string> = {}
  ;(statuses ?? []).forEach((s) => { statusMap[s.checkin_id] = s.status })

  // チェックインに回答をまとめる
  const questions = checkins.map((c) => ({
    id: c.id,
    date: c.date,
    category: c.category,
    question_text: c.question_text,
    status: statusMap[c.id] ?? '未対応',
    replies: (replies ?? []).filter((r) => r.checkin_id === c.id),
  }))

  return NextResponse.json({ questions })
}
