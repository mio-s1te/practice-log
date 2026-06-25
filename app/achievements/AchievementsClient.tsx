'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea, Select } from '@/components/ui/Input'
import type { Achievement } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { Star, PlusCircle } from 'lucide-react'

interface Props {
  achievements: Achievement[]
  userId: string
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

export function AchievementsClient({ achievements: initialAchievements, userId }: Props) {
  const supabase = createClient()
  const [achievements, setAchievements] = useState(initialAchievements)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [publicOk, setPublicOk] = useState<'OK' | '匿名ならOK' | 'NG'>('OK')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('achievements')
      .insert({
        user_id: userId,
        achievement_text: text.trim(),
        public_ok: publicOk,
        screenshot_url: screenshotUrl.trim() || null,
      })
      .select()
      .single()

    if (error) {
      setError('送信に失敗しました')
      setLoading(false)
      return
    }

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
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <PlusCircle className="h-4 w-4" />
          記録する
        </Button>
      </div>

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

      {/* フォーム */}
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

      {/* 成果一覧 */}
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
