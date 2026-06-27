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

  // 自分自身への再送は禁止
  if (userId === user.id) {
    return NextResponse.json({ error: '自分自身への再送はできません' }, { status: 400 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'

  // Step1: question_statuses を先に削除（外部キー制約対策）
  await adminClient
    .from('question_statuses')
    .delete()
    .eq('staff_id', userId)

  // Step2: profiles を削除
  await adminClient
    .from('profiles')
    .delete()
    .eq('id', userId)

  // Step3: auth.users を削除
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: 'ユーザー削除に失敗しました: ' + deleteError.message }, { status: 500 })
  }

  // Step4: 新しく招待メールを送る
  const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role: role ?? 'staff' },
    redirectTo: `${appUrl}/auth/callback`,
  })
  if (inviteError) {
    return NextResponse.json({ error: '招待メールの送信に失敗しました: ' + inviteError.message }, { status: 500 })
  }

  // Step5: profiles を再作成
  if (data.user) {
    await adminClient.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      role: role ?? 'staff',
    })
  }

  return NextResponse.json({ success: true })
}
