import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/settings/line-notification
// → 卒業後のメンバーが通知ON/OFFを切り替える
export async function POST(req: NextRequest) {
  const { enabled } = await req.json()

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
    .select('status, end_date, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'プロフィール取得失敗' }, { status: 400 })

  // メンバー以外は不可
  if (profile.role !== 'member') {
    return NextResponse.json({ error: 'メンバーのみ変更できます' }, { status: 403 })
  }

  // 2ヶ月（end_date）を過ぎていない場合は停止不可
  const today = new Date().toISOString().split('T')[0]
  const isGraduated = profile.status === 'graduated' ||
    (profile.end_date && profile.end_date < today)

  if (!isGraduated && enabled === false) {
    return NextResponse.json(
      { error: '受講期間中は通知を停止できません' },
      { status: 403 }
    )
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  await adminClient
    .from('profiles')
    .update({ line_notification_ok: enabled })
    .eq('id', user.id)

  return NextResponse.json({ ok: true, line_notification_ok: enabled })
}
