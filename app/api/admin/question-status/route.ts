import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { checkinId, status } = await req.json()

  if (!checkinId || !status) {
    return NextResponse.json({ error: 'checkinId と status は必須です' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // 呼び出し元がstaff以上かチェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!caller || !['staff', 'admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'スタッフ以上の権限が必要です' }, { status: 403 })
  }

  // Service Role Key で question_statuses をupsert（スタッフもINSERTできるように）
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { error } = await adminClient
    .from('question_statuses')
    .upsert(
      { checkin_id: checkinId, status, staff_id: user.id },
      { onConflict: 'checkin_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
