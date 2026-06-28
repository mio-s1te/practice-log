'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea, Select } from '@/components/ui/Input'
import type { Achievement } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { Star, PlusCircle } from 'lucide-react'

type GenerationAchievement = Achievement & {
  displayName: string
  isAnonymous: boolean
}

interface Props {
  achievements: Achievement[]
  generationAchievements: GenerationAchievement[]
  userId: string
  generation: string | null
}

const ACHIEVEMENT_EXAMPLES = [
  '初投稿できた',
  '初クリックが出た',
  'LINE登録が入った',
  '初報酬が出た',
  '無料プレゼントが完成した',
  'LPが完成した',
]

const PUBLIC_OPTIONS = [
  { value: 'OK', label: '外部掲載OK' },
  { value: '匿名ならOK', label: '匿名ならOK' },
  { value: 'NG', label: '掲載NG' },
]

const REACTION_EMOJIS = ['❤️', '🎉', '👏', '✨', '🔥'] as const
type ReactionEmoji = typeof REACTION_EMOJIS[number]

// リアクション状態: { achievementId → { emoji → { count, reacted } } }
type ReactionState = Record<string, Record<string, { count: number; reacted: boolean }>>

export function AchievementsClient({
  achievements: initialAchievements,
  generationAchievements,
  userId,
  generation,
}: Props) {
  const supabase = createClient()
  const [achievements, setAchievements] = useState(initialAchievements)
  const [activeTab, setActiveTab] = useState<'mine' | 'generation'>('mine')
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [publicOk, setPublicOk] = useState<'OK' | '匿名ならOK' | 'NG'>('OK')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // リアクション状態
  const [reactions, setReactions] = useState<ReactionState>({})
  const [reactingKey, setReactingKey] = useState<string | null>(null)

  const handleReaction = async (achievementId: string, emoji: ReactionEmoji) => {
    const key = `${achievementId}-${emoji}`
    if (reactingKey === key) return
    setReactingKey(key)

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
    }).catch(() => {})

    setReactingKey(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')

    // ① Supabase に成果報告を INSERT
    const { data, error: insertError } = await supabase
      .from('achievements')
      .insert({
        user_id: userId,
        achievement_text: text.trim(),
        public_ok: publicOk,
        screenshot_url: screenshotUrl.trim() || null,
      })
      .select()
      .single()

    if (insertError) {
      setError('送信に失敗しました')
      setLoading(false)
      return
    }

    // ② タイムライン登録 + Discord 投稿（失敗してもUIは更新）
    fetch('/api/achievements/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId: data.id,
        achievementText: text.trim(),
        publicOk,
        screenshotUrl: screenshotUrl.trim() || null,
      }),
    }).then(res => {
      if (!res.ok) res.text().then(t => console.error('[achievements/post] error:', t))
    }).catch(err => {
      console.error('[achievements/post] fetch error:', err)
    })

    setAchievements([data, ...achievements])
    setText('')
    setPublicOk('OK')
    setScreenshotUrl('')
    setShowForm(false)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">成果報告</h1>
          <p className="text-sm text-stone-500 mt-0.5">実践の成果を記録しましょう</p>
        </div>
        {activeTab === 'mine' && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <PlusCircle className="h-4 w-4" />
            記録する
          </Button>
        )}
      </div>

      {/* タブ切り替え */}
      {generation && (
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
              activeTab === 'mine'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            ⭐ 自分の成果
          </button>
          <button
            onClick={() => setActiveTab('generation')}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
              activeTab === 'generation'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            🌿 同期の成果
            {generationAchievements.length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {generationAchievements.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* === 自分の成果タブ === */}
      {activeTab === 'mine' && (
        <>
          {/* 成果例 */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-2">成果の例</p>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENT_EXAMPLES.map((ex) => (
                <span key={ex} className="text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full">
                  ⭐ {ex}
                </span>
              ))}
            </div>
          </div>

          {/* 投稿フォーム */}
          {showForm && (
            <Card className="border-amber-200">
              <h2 className="text-sm font-bold text-stone-800 mb-4">新しい成果を記録</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  label="成果内容"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="例：初投稿できた！3本連続投稿達成しました"
                  rows={3}
                  required
                />
                <Select
                  label="外部掲載"
                  options={PUBLIC_OPTIONS}
                  value={publicOk}
                  onChange={(e) => setPublicOk(e.target.value as typeof publicOk)}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-stone-700">
                    スクショURL（任意）
                  </label>
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" loading={loading}>
                    記録する
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 自分の成果一覧 */}
          {achievements.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-stone-500 text-sm">まだ成果報告がありません</p>
              <p className="text-stone-400 text-xs mt-1">小さな成果でもどんどん記録しましょう！</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {achievements.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">⭐</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-stone-500">{formatDate(a.date, 'yyyy年M月d日')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          a.public_ok === 'OK' ? 'bg-green-50 text-green-700' :
                          a.public_ok === '匿名ならOK' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-stone-50 text-stone-500'
                        }`}>
                          {a.public_ok}
                        </span>
                      </div>
                      <p className="text-sm text-stone-800">{a.achievement_text}</p>
                      {a.screenshot_url && (
                        <a
                          href={a.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-700 hover:underline mt-1.5 block"
                        >
                          📎 スクショを見る
                        </a>
                      )}

                      {/* 自分の成果へのリアクションバー */}
                      <div className="mt-2.5">
                        {/* リアクション件数表示 */}
                        {Object.entries(reactions[a.id] ?? {}).some(([, v]) => v.count > 0) && (
                          <div className="flex gap-1 flex-wrap mb-1.5">
                            {REACTION_EMOJIS.filter(e => (reactions[a.id]?.[e]?.count ?? 0) > 0).map(e => (
                              <span
                                key={e}
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  reactions[a.id]?.[e]?.reacted
                                    ? 'bg-amber-100 border-amber-300 font-bold'
                                    : 'bg-stone-50 border-stone-200'
                                }`}
                              >
                                {e} {reactions[a.id]?.[e]?.count}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* リアクションボタン */}
                        <div className="flex gap-1 flex-wrap">
                          {REACTION_EMOJIS.map(e => {
                            const reacted = reactions[a.id]?.[e]?.reacted ?? false
                            return (
                              <button
                                key={e}
                                disabled={reactingKey === `${a.id}-${e}`}
                                onClick={() => handleReaction(a.id, e)}
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
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* === 同期の成果タブ === */}
      {activeTab === 'generation' && (
        <>
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
            <p className="text-xs text-stone-500">
              🌿 <span className="font-bold">{generation}</span> の同期メンバーの成果報告です（掲載NGは表示されません）
            </p>
          </div>

          {generationAchievements.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">🌿</div>
              <p className="text-stone-500 text-sm">同期の成果報告はまだありません</p>
              <p className="text-stone-400 text-xs mt-1">みんなで成果を報告して盛り上げましょう！</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {generationAchievements.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">⭐</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-stone-600">{a.displayName}</span>
                        <span className="text-xs text-stone-400">{formatDate(a.date, 'yyyy年M月d日')}</span>
                      </div>
                      <p className="text-sm text-stone-800">{a.achievement_text}</p>
                      {a.screenshot_url && !a.isAnonymous && (
                        <a
                          href={a.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-700 hover:underline mt-1.5 block"
                        >
                          📎 スクショを見る
                        </a>
                      )}

                      {/* 同期の成果へのリアクションバー */}
                      <div className="mt-2.5">
                        {/* リアクション件数表示 */}
                        {Object.entries(reactions[a.id] ?? {}).some(([, v]) => v.count > 0) && (
                          <div className="flex gap-1 flex-wrap mb-1.5">
                            {REACTION_EMOJIS.filter(e => (reactions[a.id]?.[e]?.count ?? 0) > 0).map(e => (
                              <span
                                key={e}
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  reactions[a.id]?.[e]?.reacted
                                    ? 'bg-amber-100 border-amber-300 font-bold'
                                    : 'bg-stone-50 border-stone-200'
                                }`}
                              >
                                {e} {reactions[a.id]?.[e]?.count}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* リアクションボタン */}
                        <div className="flex gap-1 flex-wrap">
                          {REACTION_EMOJIS.map(e => {
                            const reacted = reactions[a.id]?.[e]?.reacted ?? false
                            return (
                              <button
                                key={e}
                                disabled={reactingKey === `${a.id}-${e}`}
                                onClick={() => handleReaction(a.id, e)}
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
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
