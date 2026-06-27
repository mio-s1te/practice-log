import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrAssignEmoji } from '@/lib/emoji'

// POST /api/timeline/event
// チェックイン後に呼び出してタイムラインイベントを作成＋Discord通知
export async function POST(req: NextRequest) {
  const { checkinId, eventType, moodList } = await req.json()
  // eventType: 'checkin' | 'question' | 'encourage'
  // moodList: string[] （複数選択された気分）

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // プロフィール取得（名前・discord_name・generation・discord_share も必要）
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, discord_name, generation, role')
    .eq('id', user.id)
    .single()

  if (!profile?.generation) {
    return NextResponse.json({ ok: true, skipped: 'no generation' })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 絵文字割り当て
  const emoji = await getOrAssignEmoji(adminClient, user.id, profile.generation)

  // タイムラインイベント作成
  const { data: event, error: eventError } = await adminClient
    .from('timeline_events')
    .insert({
      user_id: user.id,
      generation: profile.generation,
      event_type: eventType,
      checkin_id: checkinId ?? null,
    })
    .select()
    .single()

  if (eventError) {
    console.error('[timeline/event] insert error:', eventError)
    return NextResponse.json({ error: 'timeline insert failed', detail: eventError.message }, { status: 500 })
  }

  // チェックイン内容を取得（Discord投稿に使う）
  const { data: checkin } = await adminClient
    .from('checkins')
    .select('done_text, stuck_text, next_text, has_question, question_text, discord_share')
    .eq('id', checkinId)
    .single()

  // 期生別 Webhook URL を取得
  const { data: genSettings } = await adminClient
    .from('generation_settings')
    .select('discord_webhook_url')
    .eq('generation', profile.generation)
    .single()

  const generationWebhookUrl = genSettings?.discord_webhook_url ?? null

  // ① 期生ルームへの日報投稿（新規チェックインのみ）
  // discord_share が '共有NG' でなければ投稿
  if (generationWebhookUrl && checkin && checkin.discord_share !== '共有NG') {
    const isAnonymous = checkin.discord_share === '匿名ならOK'

    // 表示名
    const displayName = isAnonymous
      ? `${emoji}（匿名）`
      : profile.discord_name
        ? `${emoji} @${profile.discord_name}`
        : `${emoji} ${profile.name}`

    // 気分ラベル
    const moodLabels = Array.isArray(moodList) && moodList.length > 0
      ? moodList.join(' / ')
      : null

    // メッセージ組み立て
    const lines: string[] = [
      `📋 **${profile.generation}** の日報が届きました`,
      `👤 ${displayName}`,
    ]

    if (moodLabels) {
      lines.push(`気分：${moodLabels}`)
    }

    lines.push('') // 空行

    if (checkin.done_text) {
      lines.push(`✅ **今日やったこと**`)
      lines.push(`> ${checkin.done_text.replace(/\n/g, '\n> ')}`)
    }

    if (checkin.stuck_text) {
      lines.push(``)
      lines.push(`🤔 **つまずき・もやもや**`)
      lines.push(`> ${checkin.stuck_text.replace(/\n/g, '\n> ')}`)
    }

    if (checkin.next_text) {
      lines.push(``)
      lines.push(`📌 **明日やること**`)
      lines.push(`> ${checkin.next_text.replace(/\n/g, '\n> ')}`)
    }

    if (checkin.has_question && checkin.question_text) {
      lines.push(``)
      lines.push(`❓ **質問**`)
      lines.push(`> ${checkin.question_text.replace(/\n/g, '\n> ')}`)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'
    lines.push(``)
    lines.push(`-# 📊 [アプリで見る](${appUrl}/dashboard)`)

    await fetch(generationWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: lines.join('\n') }),
    }).catch(() => {}) // Discord失敗してもチェックインは成功扱い
  }

  // ② 励まし通知（全体 or 期生ルームへ）
  const isEncourage = Array.isArray(moodList)
    ? moodList.includes('励ましがほしい')
    : eventType === 'encourage'

  if (isEncourage) {
    // 期生ルームのwebhookがあればそちらに送る、なければ全体webhookへ
    const encourageWebhookUrl = generationWebhookUrl ?? process.env.DISCORD_WEBHOOK_URL

    if (encourageWebhookUrl) {
      const message = [
        `💛 ${emoji} **${profile.generation}** のメンバーが励ましを求めています`,
        `スタンプ送ってあげてください → ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'}/dashboard`,
      ].join('\n')

      // 期生ルームとは別の投稿が必要な場合のみ（日報投稿と別）
      if (!generationWebhookUrl || generationWebhookUrl !== (process.env.DISCORD_WEBHOOK_URL ?? '')) {
        await fetch(encourageWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true, eventId: event.id, emoji })
}
