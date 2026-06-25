import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/admin/encourage-stamp
 *
 * スタッフ/管理者が励ましスタンプを押すAPI。
 * timeline_events レコードが存在しない古いチェックインでも動作するよう、
 * 存在しない場合はオンデマンドで作成してからスタンプを登録する。
 *
 * Body: { checkinId: string, stamp: string }
 */

const VALID_STAMPS = ['💪', '😭', '👏', '🌟', '❤️']

export async function POST(req: NextRequest) {
  const { checkinId, stamp } = await req.json()

  if (!checkinId || !VALID_STAMPS.includes(stamp)) {
    return NextResponse.json({ error: '無効なリクエスト' }, { status: 400 })
  }

  // 認証確認（anon keyでユーザー取得）
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // スタッフ/管理者のみ
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile || !['admin', 'staff'].includes(myProfile.role)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  // Service Role Key で操作（RLS をバイパス）
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // ① checkin 情報を取得（user_id, generation が必要）
  const { data: checkin, error: checkinErr } = await adminClient
    .from('checkins')
    .select('id, user_id, profiles(generation)')
    .eq('id', checkinId)
    .single()

  if (checkinErr || !checkin) {
    return NextResponse.json({ error: 'チェックインが見つかりません' }, { status: 404 })
  }

  const checkinUserId = checkin.user_id
  const generation = (checkin.profiles as any)?.generation ?? null

  // ② timeline_events レコードを upsert（存在すればそのまま使う）
  let timelineEventId: string

  const { data: existingEvent } = await adminClient
    .from('timeline_events')
    .select('id')
    .eq('checkin_id', checkinId)
    .eq('event_type', 'encourage')
    .single()

  if (existingEvent) {
    timelineEventId = existingEvent.id
  } else {
    // オンデマンド作成
    const { data: newEvent, error: insertErr } = await adminClient
      .from('timeline_events')
      .insert({
        user_id: checkinUserId,
        checkin_id: checkinId,
        event_type: 'encourage',
        generation: generation,
      })
      .select('id')
      .single()

    if (insertErr || !newEvent) {
      console.error('timeline_events insert error:', insertErr)
      return NextResponse.json({ error: 'タイムラインイベントの作成に失敗しました' }, { status: 500 })
    }
    timelineEventId = newEvent.id
  }

  // ③ 既存スタンプを確認（同一ユーザーのスタンプ）
  const { data: existing } = await adminClient
    .from('encourage_stamps')
    .select('id, stamp')
    .eq('timeline_event_id', timelineEventId)
    .eq('user_id', user.id)
    .single()

  let action: string

  if (existing) {
    if (existing.stamp === stamp) {
      // 同じスタンプ → 取り消し
      await adminClient.from('encourage_stamps').delete().eq('id', existing.id)
      action = 'removed'
    } else {
      // 違うスタンプ → 差し替え
      await adminClient.from('encourage_stamps').update({ stamp }).eq('id', existing.id)
      action = 'changed'
    }
  } else {
    // 新規スタンプ
    await adminClient.from('encourage_stamps').insert({
      timeline_event_id: timelineEventId,
      user_id: user.id,
      stamp,
    })
    action = 'added'
  }

  // ④ 最新のタイムラインイベント情報を返す（クライアント側のstateを更新するため）
  const { data: updatedEvent } = await adminClient
    .from('timeline_events')
    .select('id, checkin_id, user_id, generation, encourage_stamps(id, stamp, user_id)')
    .eq('id', timelineEventId)
    .single()

  return NextResponse.json({ action, stamp, event: updatedEvent })
}
