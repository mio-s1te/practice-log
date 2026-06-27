import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { userId, email, name, role } = await req.json()
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

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 既存ユーザーを一旦削除してから再招待
  // （Supabaseは招待済みユーザーへの再招待ができないため）
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: '既存ユーザーの削除に失敗しました: ' + deleteError.message }, { status: 500 })
  }

  // 再招待
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'
  const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role: role ?? 'member' },
    redirectTo: `${appUrl}/auth/callback`,
  })
  if (inviteError) {
    return NextResponse.json({ error: '招待メールの送信に失敗しました: ' + inviteError.message }, { status: 500 })
  }

  // profilesテーブルのIDを新しいユーザーIDに更新
  if (data.user) {
    await adminClient.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      role: role ?? 'member',
    })
    // 古いIDのプロフィールを削除（残っていれば）
    if (data.user.id !== userId) {
      await adminClient.from('profiles').delete().eq('id', userId)
    }
  }

  return NextResponse.json({ success: true })
}
