import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null
  const type = searchParams.get('type') ?? ''

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 招待リンク（invite）またはパスワードリカバリの場合はパスワード設定ページへ
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/set-password`)
      }

      // typeがなくてもパスワード未設定（招待ユーザー）の場合はset-passwordへ
      if (data.session) {
        const user = data.session.user
        // invited_at があってパスワードが未設定のユーザーはset-passwordへ
        const isInvited = user.invited_at && !user.last_sign_in_at
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
