import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/auth/line-connect
// → LINE LoginのOAuth認証URLにリダイレクト
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line-callback`

  // CSRF対策のstateにユーザーIDを含める
  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
    nonce: Math.random().toString(36).slice(2),
  })

  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  return NextResponse.redirect(lineAuthUrl)
}
