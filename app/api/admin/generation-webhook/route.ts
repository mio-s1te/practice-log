import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/admin/generation-webhook
 * 期生別 Discord Webhook URL を保存する（管理者のみ）
 *
 * Body: {
 *   generation: string
 *   webhookUrl: string
 *   urlType?: 'discord_webhook_url' | 'encourage_webhook_url' | 'achievement_webhook_url'
 *             省略時は 'discord_webhook_url'（後方互換）
 * }
 */

const ALLOWED_URL_TYPES = [
  'discord_webhook_url',
  'encourage_webhook_url',
  'achievement_webhook_url',
] as const
type UrlType = typeof ALLOWED_URL_TYPES[number]

export async function POST(req: NextRequest) {
  const { generation, webhookUrl, urlType: rawUrlType } = await req.json()

  if (!generation) {
    return NextResponse.json({ error: '期生名が必要です' }, { status: 400 })
  }

  // urlType のバリデーション（省略時は後方互換で discord_webhook_url）
  const urlType: UrlType = ALLOWED_URL_TYPES.includes(rawUrlType as UrlType)
    ? (rawUrlType as UrlType)
    : 'discord_webhook_url'

  // URL形式チェック（空文字は削除扱いで許可）
  if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return NextResponse.json(
      { error: 'Discord の Webhook URL は https://discord.com/api/webhooks/ から始まる必要があります' },
      { status: 400 }
    )
  }

  // 認証確認
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // 管理者のみ
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '管理者のみ操作できます' }, { status: 403 })
  }

  // Service Role Key で upsert
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { error } = await adminClient
    .from('generation_settings')
    .upsert(
      {
        generation,
        [urlType]: webhookUrl || null,  // 空文字はNULLに
      },
      { onConflict: 'generation' }
    )

  if (error) {
    console.error('generation_settings upsert error:', error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, urlType })
}
