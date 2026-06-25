import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // セッションCookieを確認（Supabase SSRのCookie名）
  const cookieStore = request.cookies
  const allCookies = cookieStore.getAll()
  
  // Supabaseのアクセストークンを探す
  const accessTokenCookie = allCookies.find(
    (c) => c.name.includes('auth-token') || c.name.includes('access-token')
  )
  const hasSession = !!accessTokenCookie?.value

  // 未認証ユーザーをログインへリダイレクト
  if (
    !hasSession &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/set-password')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーがログインページにアクセスしたらダッシュボードへ
  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
