import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/auth/line-connect
// → LINE LoginのOAuth認証URLにリダイレクト
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // ベースURLを決定
  // 優先順位：
  //   1. NEXT_PUBLIC_APP_URL 環境変数
  //   2. URL_PRODUCTION (Netlify カスタムドメイン用)
  //   3. リクエストのホストから自動生成
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL_PRODUCTION ||
    (() => {
      const host = req.headers.get('host') ?? 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    })()

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID!
  const redirectUri = `${appUrl}/api/auth/line-callback`

  // 環境変数未設定チェック
  if (!channelId) {
    return NextResponse.json({ error: 'LINE_LOGIN_CHANNEL_ID が設定されていません' }, { status: 500 })
  }

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
