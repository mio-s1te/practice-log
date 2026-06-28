import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrAssignEmoji } from '@/lib/emoji'

// POST /api/timeline/event
// チェックイン後に呼び出してタイムラインイベントを作成＋Discord通知
export async function POST(req: NextRequest) {
  const { checkinId, eventType, moodList, hasQuestion } = await req.json()
  // eventType: 'checkin' | 'question' | 'encourage'
  // moodList: string[] （複数選択された気分）
  // hasQuestion: boolean （質問入力があった場合 true）

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, discord_name, generation, role')
    .eq('id', user.id)
    .single()

  if (!profile?.generation) {
    return NextResponse.json({ ok: true, skipped: 'no generation' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[timeline/event] SUPABASE_SERVICE_ROLE_KEY が未設定')
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 })
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 絵文字割り当て
  const emoji = await getOrAssignEmoji(adminClient, user.id, profile.generation)

  const isEncourage = Array.isArray(moodList)
    ? moodList.includes('励ましがほしい')
    : eventType === 'encourage'

  // ─── タイムラインイベント登録 ───────────────────────────────
  // ① 常に「checkin」イベントを登録（日報を提出しました）
  const { data: checkinEvent, error: checkinEventError } = await adminClient
    .from('timeline_events')
    .insert({
      user_id: user.id,
      generation: profile.generation,
      event_type: 'checkin',
      checkin_id: checkinId ?? null,
    })
    .select()
    .single()

  if (checkinEventError) {
    console.error('[timeline/event] checkin insert error:', checkinEventError)
    return NextResponse.json({ error: 'timeline insert failed', detail: checkinEventError.message }, { status: 500 })
  }

  // ② 「質問あり」の場合は question イベントも追加登録
  const isQuestion = hasQuestion === true || eventType === 'question'

  if (isQuestion) {
    const { error: qError } = await adminClient
      .from('timeline_events')
      .insert({
        user_id: user.id,
        generation: profile.generation,
        event_type: 'question',
        checkin_id: checkinId ?? null,
      })

    if (qError) {
      console.error('[timeline/event] question insert error:', qError)
      // question登録失敗はcheckin自体は成功として続行
    }
  }

  // ③ 「励ましがほしい」の場合は encourage イベントも追加登録
  let encourageEventId: string | null = null
  if (isEncourage) {
    const { data: encEvent, error: encError } = await adminClient
      .from('timeline_events')
      .insert({
        user_id: user.id,
        generation: profile.generation,
        event_type: 'encourage',
        checkin_id: checkinId ?? null,
      })
      .select()
      .single()

    if (encError) {
      console.error('[timeline/event] encourage insert error:', encError)
      // encourage登録失敗はcheckin自体は成功として続行
    } else {
      encourageEventId = encEvent?.id ?? null
    }
  }

  // ─── チェックイン内容取得（Discord投稿用） ──────────────────
  const { data: checkin } = await adminClient
    .from('checkins')
    .select('done_text, stuck_text, next_text, has_question, question_text, discord_share')
    .eq('id', checkinId)
    .single()

  // ─── 期生別 Webhook URL 取得 ─────────────────────────────────
  // generation文字列はtrim()して比較（スペース混入対策）
  const { data: allGenSettings } = await adminClient
    .from('generation_settings')
    .select('generation, discord_webhook_url')

  const myGen = profile.generation.trim()
  const genSettings = (allGenSettings ?? []).find(
    (g: any) => g.generation?.trim() === myGen && g.discord_webhook_url
  )
  const generationWebhookUrl = genSettings?.discord_webhook_url ?? null

  // ─── ① 期生ルームへの日報投稿 ───────────────────────────────
  if (generationWebhookUrl && checkin && checkin.discord_share !== '共有NG') {
    const isAnonymous = checkin.discord_share === '匿名ならOK'

    const displayName = isAnonymous
      ? `${emoji}（匿名）`
      : profile.discord_name
        ? `${emoji} @${profile.discord_name}`
        : `${emoji} ${profile.name}`

    const moodLabels = Array.isArray(moodList) && moodList.length > 0
      ? moodList.join(' / ')
      : null

    const lines: string[] = [
      `📋 **${profile.generation}** の日報が届きました`,
      `👤 ${displayName}`,
    ]

    if (moodLabels) lines.push(`気分：${moodLabels}`)
    lines.push('')

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
    }).catch(() => {})
  }

  // ─── ② 励まし通知（Discord） ────────────────────────────────
  if (isEncourage) {
    const encourageWebhookUrl = generationWebhookUrl ?? process.env.DISCORD_WEBHOOK_URL
    if (encourageWebhookUrl) {
      const message = [
        `💛 ${emoji} **${profile.generation}** のメンバーが励ましを求めています`,
        `スタンプ送ってあげてください → ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://mioprocess.netlify.app'}/dashboard`,
      ].join('\n')

      // 日報投稿と同じwebhookの場合は別途送る（日報とは別メッセージ）
      await fetch(encourageWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    ok: true,
    checkinEventId: checkinEvent.id,
    encourageEventId,
    emoji,
  })
}
