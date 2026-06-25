import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/auth/line-callback
// → LINE LoginのコールバックURLでLINE user IDを取得してDBに保存
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // ベースURLを決定（line-connect と同じロジック）
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL_PRODUCTION ||
    (() => {
      const host = req.headers.get('host') ?? 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    })()

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?line_error=cancelled`)
  }

  // stateからユーザーIDを復元
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    // 10分以内のstateのみ有効
    if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new Error('expired')
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?line_error=invalid_state`)
  }

  // LINE Loginのtokenエンドポイントでアクセストークン取得
  // redirect_uri は line-connect で使ったものと完全一致させる
  const redirectUri = `${appUrl}/api/auth/line-callback`

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('LINE token error:', body)
    return NextResponse.redirect(`${appUrl}/dashboard?line_error=token_failed`)
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  // LINE Profileエンドポイントでユーザーのline_user_idを取得
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!profileRes.ok) {
    return NextResponse.redirect(`${appUrl}/dashboard?line_error=profile_failed`)
  }

  const lineProfile = await profileRes.json()
  const lineUserId: string = lineProfile.userId

  // DBに保存（Service Role Keyで書き込み）
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { error: dbError } = await adminClient
    .from('profiles')
    .update({ line_user_id: lineUserId })
    .eq('id', userId)

  if (dbError) {
    console.error('DB update error:', dbError)
    return NextResponse.redirect(`${appUrl}/dashboard?line_error=db_failed`)
  }

  return NextResponse.redirect(`${appUrl}/dashboard?line_connected=1`)
}
