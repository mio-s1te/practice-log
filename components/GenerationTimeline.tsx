'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

const STAMPS = ['💪', '😭', '👏', '🌟', '❤️'] as const
type Stamp = typeof STAMPS[number]

const REACTION_EMOJIS = ['❤️', '🎉', '👏', '✨', '🔥'] as const
type ReactionEmoji = typeof REACTION_EMOJIS[number]

type StampEntry = { id: string; stamp: string; user_id: string }

type TimelineEvent = {
  id: string
  event_type: 'checkin' | 'question' | 'encourage' | 'staff_reply' | 'achievement'
  created_at: string
  user_id: string
  checkin_id: string | null
  achievement_id: string | null
  achievement: {
    achievement_text: string
    public_ok: string
  } | null
  encourage_stamps: StampEntry[]
}

// リアクション状態: { achievementId → { emoji → { count, reacted } } }
type ReactionState = Record<string, Record<string, { count: number; reacted: boolean }>>

const EVENT_LABELS: Record<TimelineEvent['event_type'], string> = {
  checkin:      '日報を提出しました',
  question:     '質問しました',
  encourage:    '励ましを求めています',
  staff_reply:  'の質問にスタッフが回答しました',
  achievement:  '成果を報告しました ⭐',
}

const EVENT_BG: Record<TimelineEvent['event_type'], string> = {
  checkin:     'bg-stone-50 border-stone-100',
  question:    'bg-blue-50 border-blue-100',
  encourage:   'bg-orange-50 border-orange-200',
  staff_reply: 'bg-emerald-50 border-emerald-100',
  achievement: 'bg-amber-50 border-amber-200',
}

export default function GenerationTimeline({ myUserId, generation }: { myUserId: string; generation: string | null }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [stampingId, setStampingId] = useState<string | null>(null)
  // リアクション状態: { achievementId → { emoji → { count, reacted } } }
  const [reactions, setReactions] = useState<ReactionState>({})
  const [reactingId, setReactingId] = useState<string | null>(null) // "achievementId-emoji"

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

  // achievement イベントのリアクション数を取得
  const loadReactions = useCallback(async (achievementId: string) => {
    const res = await fetch(`/api/achievements/react?achievementId=${achievementId}`)
    if (!res.ok) return
    const json = await res.json()
    setReactions(prev => ({ ...prev, [achievementId]: json.counts ?? {} }))
  }, [])

  // events が変わったら achievement イベントのリアクションを取得
  useEffect(() => {
    events.forEach(ev => {
      if (ev.event_type === 'achievement' && ev.achievement_id) {
        loadReactions(ev.achievement_id)
      }
    })
  }, [events, loadReactions])

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

  const handleReaction = async (achievementId: string, emoji: ReactionEmoji) => {
    const key = `${achievementId}-${emoji}`
    if (reactingId === key) return
    setReactingId(key)

    // 楽観的更新
    setReactions(prev => {
      const cur = prev[achievementId]?.[emoji] ?? { count: 0, reacted: false }
      return {
        ...prev,
        [achievementId]: {
          ...(prev[achievementId] ?? {}),
          [emoji]: {
            count: cur.reacted ? cur.count - 1 : cur.count + 1,
            reacted: !cur.reacted,
          },
        },
      }
    })

    await fetch('/api/achievements/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievementId, emoji }),
    }).catch(() => {
      // 失敗したら元に戻す
      loadReactions(achievementId)
    })

    setReactingId(null)
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
          const isAchievement = ev.event_type === 'achievement'
          const timeAgo = formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ja })

          // スタンプ集計（encourage用）
          const stampCounts: Record<string, number> = {}
          const myStamp = ev.encourage_stamps.find(s => s.user_id === myUserId)?.stamp
          ev.encourage_stamps.forEach(s => {
            stampCounts[s.stamp] = (stampCounts[s.stamp] ?? 0) + 1
          })

          // リアクション（achievement用）
          const achReactions = ev.achievement_id ? (reactions[ev.achievement_id] ?? {}) : {}

          return (
            <div
              key={ev.id}
              className={`rounded-xl border px-3 py-2.5 ${EVENT_BG[ev.event_type] ?? 'bg-stone-50 border-stone-100'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{isAchievement ? '⭐' : emoji}</span>
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

              {/* 成果内容（achievement の場合） */}
              {isAchievement && ev.achievement && (
                <div className="mt-2 pl-7">
                  {ev.achievement.public_ok === 'NG' ? (
                    <p className="text-xs text-stone-400 italic">（内容は非公開）</p>
                  ) : (
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {ev.achievement.achievement_text}
                    </p>
                  )}

                  {/* リアクションバー */}
                  {ev.achievement_id && (
                    <div className="mt-2">
                      {/* リアクション件数表示 */}
                      {Object.entries(achReactions).some(([, v]) => v.count > 0) && (
                        <div className="flex gap-1 flex-wrap mb-1.5">
                          {REACTION_EMOJIS.filter(e => (achReactions[e]?.count ?? 0) > 0).map(e => (
                            <span
                              key={e}
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                achReactions[e]?.reacted
                                  ? 'bg-amber-100 border-amber-300 font-bold'
                                  : 'bg-white border-stone-200'
                              }`}
                            >
                              {e} {achReactions[e].count}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* リアクションボタン（自分以外の投稿 or 自分でも押せる） */}
                      <div className="flex gap-1 flex-wrap">
                        {REACTION_EMOJIS.map(e => {
                          const reacted = achReactions[e]?.reacted ?? false
                          return (
                            <button
                              key={e}
                              disabled={reactingId === `${ev.achievement_id}-${e}`}
                              onClick={() => handleReaction(ev.achievement_id!, e)}
                              className={`text-sm px-2 py-1 rounded-xl border transition-all active:scale-95 ${
                                reacted
                                  ? 'bg-amber-100 border-amber-300 scale-110'
                                  : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                              }`}
                            >
                              {e}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
