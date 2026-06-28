import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrAssignEmoji } from '@/lib/emoji'

// POST /api/achievements/post
// 成果報告後に呼び出す：タイムライン achievement イベント登録 + Discord 投稿
export async function POST(req: NextRequest) {
  const { achievementId, achievementText, publicOk, screenshotUrl } = await req.json()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[achievements/post] SUPABASE_SERVICE_ROLE_KEY が未設定')
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // プロフィール取得
  const { data: profile } = await adminClient
    .from('profiles')
    .select('name, discord_name, generation, role')
    .eq('id', user.id)
    .single()

  const results: Record<string, unknown> = {}

  // ─── ① タイムラインに achievement イベントを登録 ─────────────
  if (achievementId && profile?.generation) {
    const emoji = await getOrAssignEmoji(adminClient, user.id, profile.generation)
    results.emoji = emoji

    const { data: tlEvent, error: tlError } = await adminClient
      .from('timeline_events')
      .insert({
        user_id: user.id,
        generation: profile.generation,
        event_type: 'achievement',
        achievement_id: achievementId,
      })
      .select()
      .single()

    if (tlError) {
      console.error('[achievements/post] timeline insert error:', tlError.message)
      results.timelineError = tlError.message
    } else {
      results.timelineEventId = tlEvent?.id
      console.log(`[achievements/post] timeline event created: ${tlEvent?.id}`)
    }
  } else {
    results.timelineSkipped = achievementId ? 'no generation' : 'no achievementId'
  }

  // ─── ② Discord に成果報告を投稿 ──────────────────────────────
  // NG でない場合のみ投稿
  if (publicOk !== 'NG' && profile?.generation) {
    const emoji = results.emoji as string ?? '🐾'

    // 期生別 Webhook URL を取得
    const { data: allGenSettings } = await adminClient
      .from('generation_settings')
      .select('generation, discord_webhook_url')

    const myGen = profile.generation.trim()
    const genSettings = (allGenSettings ?? []).find(
      (g: any) => g.generation?.trim() === myGen && g.discord_webhook_url
    )
    const webhookUrl = genSettings?.discord_webhook_url ?? process.env.DISCORD_WEBHOOK_URL

    if (webhookUrl) {
      const isAnonymous = publicOk === '匿名ならOK'
      const displayName = isAnonymous
        ? `${emoji}（匿名）`
        : profile.discord_name
          ? `${emoji} @${profile.discord_name}`
          : `${emoji} ${profile.name}`

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'

      const lines: string[] = [
        `⭐ **${profile.generation}** の成果報告が届きました！`,
        `👤 ${displayName}`,
        ``,
        `> ${achievementText}`,
      ]

      if (screenshotUrl && !isAnonymous) {
        lines.push(``)
        lines.push(`📎 [スクショを見る](${screenshotUrl})`)
      }

      lines.push(``)
      lines.push(`-# 🌿 [みんなの成果を見る](${appUrl}/achievements)`)

      const discordRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lines.join('\n') }),
      }).catch((e) => {
        console.error('[achievements/post] Discord fetch error:', e)
        return null
      })

      results.discordStatus = discordRes?.status ?? 'fetch_error'
      console.log(`[achievements/post] Discord posted: ${results.discordStatus}`)
    } else {
      results.discordSkipped = 'no webhook url'
    }
  } else {
    results.discordSkipped = publicOk === 'NG' ? 'public_ok=NG' : 'no generation'
  }

  return NextResponse.json({ ok: true, ...results })
}
