'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const STAMPS = ['💪', '😭', '👏', '🌟', '❤️'] as const
type Stamp = typeof STAMPS[number]

type StampEntry = { id: string; stamp: string; user_id: string }

type TimelineEvent = {
  id: string
  checkin_id: string
  user_id: string
  generation: string
  encourage_stamps: StampEntry[]
}

type Item = {
  id: string
  date: string
  done_text: string | null
  stuck_text: string | null
  next_text: string | null
  user_id: string
  profiles: { name: string; generation: string | null; discord_name: string | null }
}

interface Props {
  items: Item[]
  eventMap: Record<string, TimelineEvent>
  emojiMap: Record<string, string>
  myUserId: string
}

export function EncourageClient({ items, eventMap: initialEventMap, emojiMap, myUserId }: Props) {
  const [eventMap, setEventMap] = useState(initialEventMap)
  // stampingId は checkinId を保持（timeline_event IDが未確定の場合もあるため）
  const [stampingId, setStampingId] = useState<string | null>(null)

  /**
   * handleStamp
   * - timeline_events レコードが存在する場合でもしない場合でも
   *   /api/admin/encourage-stamp を呼び出す。
   * - APIがオンデマンドで timeline_event を作成して返してくれるので
   *   レスポンスの event で eventMap を更新する。
   */
  const handleStamp = async (checkinId: string, stamp: Stamp) => {
    setStampingId(checkinId)
    try {
      const res = await fetch('/api/admin/encourage-stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId, stamp }),
      })
      if (res.ok) {
        const { event } = await res.json()
        if (event) {
          setEventMap(prev => ({ ...prev, [checkinId]: event }))
        }
      } else {
        const body = await res.json().catch(() => ({}))
        console.error('encourage-stamp error:', body)
      }
    } catch (e) {
      console.error('encourage-stamp fetch error:', e)
    }
    setStampingId(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-800">励まし希望一覧</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          💛 {items.length} 件（直近7日間）
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-3">💛</p>
          <p className="text-stone-500 text-sm">励まし希望はありません</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const event = eventMap[item.id]
            const stamps = event?.encourage_stamps ?? []
            const myStamp = stamps.find(s => s.user_id === myUserId)?.stamp

            // スタンプ集計
            const stampCounts: Record<string, number> = {}
            stamps.forEach(s => {
              stampCounts[s.stamp] = (stampCounts[s.stamp] ?? 0) + 1
            })

            const memberEmoji = emojiMap[item.user_id] ?? '🐾'
            const isStamping = stampingId === item.id

            return (
              <Card key={item.id} className="border-amber-100">
                {/* ヘッダー */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💛</span>
                  <span className="text-sm font-bold text-stone-800">{item.profiles?.name}</span>
                  {item.profiles?.generation && (
                    <Badge size="sm" variant="outline">{item.profiles.generation}</Badge>
                  )}
                  <span className="text-xs text-stone-400 ml-auto">{formatDate(item.date, 'M/d')}</span>
                </div>

                {/* チェックイン内容 */}
                {item.done_text && (
                  <div className="bg-stone-50 rounded-xl p-3 mb-2">
                    <p className="text-xs text-stone-500 mb-1">今日できたこと</p>
                    <p className="text-sm text-stone-800">{item.done_text}</p>
                  </div>
                )}
                {item.stuck_text && (
                  <div className="bg-amber-50 rounded-xl p-3 mb-2">
                    <p className="text-xs text-amber-700 mb-1">つまずき</p>
                    <p className="text-sm text-stone-800">{item.stuck_text}</p>
                  </div>
                )}
                {item.profiles?.discord_name && (
                  <p className="text-xs text-stone-400 mb-3">Discord: @{item.profiles.discord_name}</p>
                )}

                {/* スタンプエリア（timeline_eventの有無にかかわらず常に表示） */}
                <div className="pt-3 border-t border-stone-100">
                  {/* 既存スタンプ集計 */}
                  {Object.keys(stampCounts).length > 0 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {Object.entries(stampCounts).map(([s, cnt]) => (
                        <span
                          key={s}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
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
                  {/* スタンプボタン */}
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <span className="text-xs text-stone-500 mr-1">スタンプを送る：</span>
                    {STAMPS.map(s => (
                      <button
                        key={s}
                        disabled={isStamping}
                        onClick={() => handleStamp(item.id, s)}
                        className={`text-base px-2 py-1 rounded-xl border transition-all active:scale-95 ${
                          isStamping
                            ? 'opacity-50 cursor-not-allowed'
                            : myStamp === s
                              ? 'bg-amber-100 border-amber-300 scale-110'
                              : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1.5">
                    {memberEmoji}さんのタイムラインに表示されます
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
