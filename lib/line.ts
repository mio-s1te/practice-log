// LINE Messaging API ユーティリティ

const LINE_API_BASE = 'https://api.line.me/v2/bot'

/**
 * 特定ユーザーにLINEプッシュメッセージを送信
 */
export async function sendLineMessage(lineUserId: string, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.error('[LINE] LINE_CHANNEL_ACCESS_TOKEN が設定されていません')
    return false
  }

  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[LINE] 送信失敗 to=${lineUserId}: ${res.status} ${body}`)
    return false
  }

  return true
}

/**
 * 複数ユーザーにまとめてLINEマルチキャスト送信（最大500人）
 */
export async function multicastLineMessage(lineUserIds: string[], text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token || lineUserIds.length === 0) return false

  const res = await fetch(`${LINE_API_BASE}/message/multicast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserIds,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[LINE] マルチキャスト失敗: ${res.status} ${body}`)
    return false
  }

  return true
}
