'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

const STAMPS = ['💪', '😭', '👏', '🌟', '❤️'] as const
type Stamp = typeof STAMPS[number]

type StampEntry = { id: string; stamp: string; user_id: string }
type TimelineEvent = {
  id: string
  event_type: 'checkin' | 'question' | 'encourage' | 'staff_reply'
  created_at: string
  user_id: string
  checkin_id: string | null
  encourage_stamps: StampEntry[]
}

const EVENT_LABELS: Record<TimelineEvent['event_type'], string> = {
  checkin:      '日報を提出しました',
  question:     '質問しました',
  encourage:    '励ましを求めています',
  staff_reply:  'の質問にスタッフが回答しました',
}

const EVENT_BG: Record<TimelineEvent['event_type'], string> = {
  checkin:     'bg-stone-50 border-stone-100',
  question:    'bg-blue-50 border-blue-100',
  encourage:   'bg-orange-50 border-orange-200',
  staff_reply: 'bg-emerald-50 border-emerald-100',
}

export default function GenerationTimeline({ myUserId, generation }: { myUserId: string; generation: string | null }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [stampingId, setStampingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/timeline')
    if (!res.ok) return
    const json = await res.json()
    setEvents(json.events ?? [])
    setEmojiMap(json.emojiMap ?? {})
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // 30秒ごとに自動更新
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  const handleStamp = async (eventId: string, stamp: Stamp) => {
    setStampingId(eventId)
    const res = await fetch('/api/timeline/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timelineEventId: eventId, stamp }),
    })
    if (res.ok) await load()
    setStampingId(null)
  }

  const getEmoji = (userId: string) => emojiMap[userId] ?? '🐾'

  // generationが未設定の場合
  if (!generation) {
    return (
      <div className="bg-white border border-stone-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🌿</span>
          <h2 className="text-sm font-bold text-stone-700">同期タイムライン</h2>
        </div>
        <p className="text-xs text-stone-400 text-center py-3">
          期生が設定されると同期のタイムラインが表示されます
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white border border-stone-100 rounded-2xl p-4">
        <p className="text-xs text-stone-400 text-center py-4">読み込み中...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white border border-stone-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🌿</span>
          <h2 className="text-sm font-bold text-stone-700">同期タイムライン</h2>
        </div>
        <p className="text-xs text-stone-400 text-center py-4">
          まだ活動がありません
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🌿</span>
          <h2 className="text-sm font-bold text-stone-700">同期タイムライン</h2>
        </div>
        <span className="text-[10px] text-stone-400">匿名・同期生のみ表示</span>
      </div>

      <div className="space-y-2">
        {events.map(ev => {
          const emoji = getEmoji(ev.user_id)
          const isMe = ev.user_id === myUserId
          const isEncourage = ev.event_type === 'encourage'
          const timeAgo = formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ja })

          // スタンプ集計
          const stampCounts: Record<string, number> = {}
          const myStamp = ev.encourage_stamps.find(s => s.user_id === myUserId)?.stamp
          ev.encourage_stamps.forEach(s => {
            stampCounts[s.stamp] = (stampCounts[s.stamp] ?? 0) + 1
          })

          return (
            <div
              key={ev.id}
              className={`rounded-xl border px-3 py-2.5 ${EVENT_BG[ev.event_type]}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-700 leading-snug">
                    <span className="font-bold">{isMe ? 'あなた' : `${emoji}さん`}</span>
                    {ev.event_type === 'staff_reply'
                      ? `${EVENT_LABELS[ev.event_type]}`
                      : `が${EVENT_LABELS[ev.event_type]}`
                    }
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo}</p>
                </div>
              </div>

              {/* 励ましスタンプ */}
              {isEncourage && (
                <div className="mt-2.5">
                  {/* 既存スタンプ集計表示 */}
                  {Object.keys(stampCounts).length > 0 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {Object.entries(stampCounts).map(([s, cnt]) => (
                        <span
                          key={s}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                            myStamp === s
                              ? 'bg-amber-100 border-amber-300 font-bold'
                              : 'bg-white border-stone-200'
                          }`}
                        >
                          {s} {cnt}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* スタンプボタン（自分以外の励まし投稿にだけ表示） */}
                  {!isMe && (
                    <div className="flex gap-1.5 flex-wrap">
                      {STAMPS.map(s => (
                        <button
                          key={s}
                          disabled={stampingId === ev.id}
                          onClick={() => handleStamp(ev.id, s)}
                          className={`text-base px-2 py-1 rounded-xl border transition-all active:scale-95 ${
                            myStamp === s
                              ? 'bg-amber-100 border-amber-300 scale-110'
                              : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
