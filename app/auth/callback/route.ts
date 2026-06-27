import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const next = searchParams.get('next') ?? null
  const type = searchParams.get('type') ?? ''

  const supabase = await createClient()

  // ① codeがある場合（PKCE フロー）
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/set-password`)
      }
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
    console.error('exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // ② tokenがある場合（OTP / メールリンク フロー）
  if (token && type) {
    const { error, data } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'recovery' | 'invite' | 'signup' | 'magiclink' | 'email',
    })
    if (!error) {
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/set-password`)
      }
      if (data.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single()
        const role = profile?.role ?? 'member'
        return NextResponse.redirect(`${origin}${role === 'admin' || role === 'staff' ? '/admin' : '/dashboard'}`)
      }
    }
    console.error('verifyOtp error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // ③ どちらもない → /login に戻す
  return NextResponse.redirect(`${origin}/login`)
}
