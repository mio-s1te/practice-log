import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null
  // type は招待メールの redirectTo に ?type=invite として付与される
  const type = searchParams.get('type') ?? ''

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 招待リンク or パスワードリカバリ → パスワード設定ページへ
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/set-password`)
      }

      // type が付いていない場合も invited_at で招待ユーザーを判定
      if (data.session) {
        const user = data.session.user
        const isInvited = !!user.invited_at && !user.last_sign_in_at
        if (isInvited) {
          return NextResponse.redirect(`${origin}/set-password`)
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        const role = profile?.role ?? 'member'
        const dest = next ?? (role === 'admin' || role === 'staff' ? '/admin' : '/dashboard')
        return NextResponse.redirect(`${origin}${dest}`)
      }

      return NextResponse.redirect(`${origin}${next ?? '/dashboard'}`)
    }

    // code の交換に失敗 → エラーページへ
    console.error('exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // code がない（ハッシュトークン形式）→ /login に飛ばして client 側で処理させる
  // login ページの useEffect がハッシュを検出して /set-password にリダイレクトする
  return NextResponse.redirect(`${origin}/login`)
}
