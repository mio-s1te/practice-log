import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { userId, email } = await req.json()
  if (!userId || !email) {
    return NextResponse.json({ error: 'userId と email は必須です' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  // Service Role Key でメールアドレスを強制変更（確認メールなし）
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // auth.users のメールアドレスを更新
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true, // 確認メールなしで即時変更
  })
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // profiles テーブルのメールアドレスも更新
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ email })
    .eq('id', userId)
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
