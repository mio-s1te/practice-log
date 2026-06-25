import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const url = request.nextUrl

  // -------------------------------------------------------
  // URLのfragment（#）はサーバーに届かないが、
  // Supabaseの招待リンクは / や /login にリダイレクトされた後
  // クライアント側でハッシュを処理する必要がある。
  // ここでは「セッションありでも /login は通す」ことで
  // login/page.tsx のハッシュ検出コードが動くようにする。
  // -------------------------------------------------------

  const cookieStore = request.cookies
  const allCookies = cookieStore.getAll()
  
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
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    return NextResponse.redirect(redirect)
  }

  // 認証済みユーザーがログインページにアクセスした場合
  // → ダッシュボードへ（ただし /login はハッシュ処理のために通す）
  // NOTE: /login はクライアントで #access_token を検出するため、
  //       サーバー側ではリダイレクトせず通過させる
  if (hasSession && pathname === '/login') {
    // ハッシュはサーバーに届かないのでここではリダイレクトしない
    // login/page.tsx のuseEffectでハッシュを検出してリダイレクトする
    return NextResponse.next({ request })
  }

  return NextResponse.next({ request })
}
