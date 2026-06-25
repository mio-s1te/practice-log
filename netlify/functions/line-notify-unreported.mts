import type { Config } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// 毎朝7時JST（= UTC 22:00 前日）に実行
// 昨日報告がなかったアクティブメンバーにLINE通知を送る
export default async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!

  if (!supabaseUrl || !serviceRoleKey || !lineToken) {
    console.error('[line-notify] 環境変数が不足しています')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 昨日の日付（JST）
  const now = new Date()
  // UTC+9に変換
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const yesterday = new Date(jstNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  console.log(`[line-notify] 対象日: ${yesterdayStr}`)

  // アクティブなメンバーを全員取得（LINE連携済み・通知ON）
  const { data: members, error: memberError } = await supabase
    .from('profiles')
    .select('id, name, line_user_id, end_date, line_notification_ok')
    .eq('role', 'member')
    .eq('status', 'active')
    .eq('line_notification_ok', true)
    .not('line_user_id', 'is', null)

  if (memberError || !members) {
    console.error('[line-notify] メンバー取得失敗:', memberError)
    return
  }

  console.log(`[line-notify] LINE連携済みメンバー: ${members.length}人`)

  // 昨日チェックインしたユーザーのIDセット
  const { data: checkins } = await supabase
    .from('checkins')
    .select('user_id')
    .eq('date', yesterdayStr)

  const reportedIds = new Set((checkins ?? []).map((c: { user_id: string }) => c.user_id))

  // 未報告 かつ end_date を過ぎていない（卒業済みは除外）メンバー
  const today = jstNow.toISOString().split('T')[0]
  const unreported = members.filter((m) => {
    if (reportedIds.has(m.id)) return false
    if (m.end_date && m.end_date < today) return false  // 卒業済みは除外
    return true
  })

  console.log(`[line-notify] 未報告メンバー: ${unreported.length}人`)

  if (unreported.length === 0) return

  // 個別に送信（失敗しても他のメンバーに影響しないよう直列処理）
  let successCount = 0
  for (const member of unreported) {
    const message = [
      `おはようございます、${member.name}さん！🌅`,
      ``,
      `昨日（${yesterdayStr.slice(5).replace('-', '/')}）の実践ログがまだのようです。`,
      `体調や気持ちはいかがですか？`,
      ``,
      `無理せず、今日の記録だけでも残してもらえると嬉しいです 🐱`,
      `▶ https://mioprocess.netlify.app/checkin`,
    ].join('\n')

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: member.line_user_id,
        messages: [{ type: 'text', text: message }],
      }),
    })

    if (res.ok) {
      successCount++
    } else {
      const body = await res.text()
      console.error(`[line-notify] 送信失敗 ${member.name}: ${res.status} ${body}`)
    }

    // レート制限対策：100ms待機
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`[line-notify] 送信完了: ${successCount}/${unreported.length}人`)
}

// 毎日 22:00 UTC = 翌朝 7:00 JST
export const config: Config = {
  schedule: '0 22 * * *',
}
