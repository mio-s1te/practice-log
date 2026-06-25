import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendLineMessage } from '@/lib/line'

// POST /api/line/send
// → スタッフ/管理者が特定メンバーにLINEメッセージを手動送信
export async function POST(req: NextRequest) {
  const { memberId, message } = await req.json()
  if (!memberId || !message?.trim()) {
    return NextResponse.json({ error: 'memberId と message は必須です' }, { status: 400 })
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
    .from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['staff', 'admin'].includes(caller.role)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: member } = await adminClient
    .from('profiles')
    .select('name, line_user_id')
    .eq('id', memberId)
    .single()

  if (!member?.line_user_id) {
    return NextResponse.json({ error: 'このメンバーはLINE連携していません' }, { status: 400 })
  }

  const ok = await sendLineMessage(member.line_user_id, message.trim())
  if (!ok) return NextResponse.json({ error: 'LINE送信に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
