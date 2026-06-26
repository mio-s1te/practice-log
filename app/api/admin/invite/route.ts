import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { email, name, role, generation } = await req.json()
  if (!email || !name) {
    return NextResponse.json({ error: 'email と name は必須です' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // ユーザーを招待（メール送信）
  // redirectTo を明示しないと Supabase のデフォルト URL に飛んでしまうため必須
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role: role ?? 'staff' },
    redirectTo: `${appUrl}/auth/callback?type=invite`,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // profilesテーブルにも反映
  if (data.user) {
    await adminClient.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      role: role ?? 'member',
      ...(generation !== undefined && generation !== '' ? { generation } : {}),
    })
  }

  return NextResponse.json({ success: true })
}
