'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { CheckCircle, MessageSquare } from 'lucide-react'
import type { Profile, Checkin, CategoryType, MoodType, DiscordShareType } from '@/types/database'
import { CATEGORIES, MOODS, MOOD_EMOJI } from '@/types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Props {
  profile: Profile
  todayCheckin: Checkin | null
}

const DISCORD_OPTIONS: DiscordShareType[] = ['共有OK', '匿名ならOK', '共有NG']

export function CheckinClient({ profile, todayCheckin }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), 'M月d日（EEEE）', { locale: ja })
  const isEdit = !!todayCheckin

  // 気分：複数選択対応
  const parseMoods = (m: MoodType | string | null): MoodType[] => {
    if (!m) return ['順調']
    try {
      const parsed = JSON.parse(m as string)
      return Array.isArray(parsed) ? parsed : [m as MoodType]
    } catch {
      return [m as MoodType]
    }
  }

  const [category, setCategory] = useState<CategoryType>(todayCheckin?.category ?? 'その他')
  const [section, setSection] = useState(todayCheckin?.section ?? '')
  const [doneText, setDoneText] = useState(todayCheckin?.done_text ?? '')
  const [stuckText, setStuckText] = useState(todayCheckin?.stuck_text ?? '')
  const [hasQuestion, setHasQuestion] = useState(todayCheckin?.has_question ?? false)
  const [questionText, setQuestionText] = useState(todayCheckin?.question_text ?? '')
  const [questionPublicOk, setQuestionPublicOk] = useState<boolean | null>(null)
  const [nextText, setNextText] = useState(todayCheckin?.next_text ?? '')
  const [moods, setMoods] = useState<MoodType[]>(parseMoods(todayCheckin?.mood ?? '順調'))
  const [discordShare, setDiscordShare] = useState<DiscordShareType>(todayCheckin?.discord_share ?? '共有OK')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [savedCheckinId, setSavedCheckinId] = useState<string | null>(null)

  const toggleMood = (m: MoodType) => {
    setMoods(prev =>
      prev.includes(m)
        ? prev.length > 1 ? prev.filter(x => x !== m) : prev  // 最低1つは残す
        : [...prev, m]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // moodは複数選択をJSON文字列で保存（後方互換：1つの場合はそのまま）
    const moodValue = moods.length === 1 ? moods[0] : JSON.stringify(moods)

    const payload = {
      user_id: profile.id,
      date: today,
      category,
      section,
      done_text: doneText,
      stuck_text: stuckText,
      has_question: hasQuestion,
      question_text: hasQuestion ? questionText : '',
      question_public_ok: hasQuestion ? (questionPublicOk ?? false) : false,
      next_text: nextText,
      mood: moodValue as MoodType,
      discord_share: discordShare,
    }

    let checkinId = todayCheckin?.id ?? null

    if (isEdit) {
      const { error } = await supabase
        .from('checkins')
        .update(payload)
        .eq('id', todayCheckin!.id)
      if (error) { setError('送信に失敗しました。もう一度お試しください。'); setLoading(false); return }
    } else {
      const { data, error } = await supabase
        .from('checkins')
        .insert(payload)
        .select('id')
        .single()
      if (error) { setError('送信に失敗しました。もう一度お試しください。'); setLoading(false); return }
      checkinId = data?.id ?? null
    }

    setSavedCheckinId(checkinId)

    // タイムラインイベントを作成（新規チェックインのみ）
    // ※ generationが設定されているメンバーのみ対象
    if (!isEdit && checkinId && profile.generation) {
      const hasEncourage = moods.includes('励ましがほしい')
      const eventType = hasEncourage ? 'encourage' : hasQuestion ? 'question' : 'checkin'
      const res = await fetch('/api/timeline/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId, eventType, moodList: moods }),
      }).catch(() => null)
      // エラーが出てもチェックイン自体は成功とする
      if (res && !res.ok) {
        console.warn('[checkin] timeline event creation failed, status:', res.status)
      }
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">チェックイン完了！</h2>
          <p className="text-sm text-stone-600 mb-2">
            報告した日としてスタンプが記録されました。
          </p>
          <p className="text-sm text-stone-500 mb-6">今日も実践お疲れ様です 🌟</p>

          {(hasQuestion || moods.includes('質問したい')) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 text-left">
              <p className="text-sm font-bold text-blue-800 mb-1">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Discordにも投稿しましょう
              </p>
              <p className="text-xs text-blue-700">
                質問・相談は、必要があればDiscordの質問・相談部屋にも投稿してください。より早く対応できます。
              </p>
            </div>
          )}
          {moods.includes('励ましがほしい') && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-left">
              <p className="text-sm font-bold text-amber-800 mb-1">💛 同期に届けました</p>
              <p className="text-xs text-amber-700">
                同期のタイムラインに通知されました。応援スタンプが届くかも！
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              マイページへ
            </Button>
            <Button onClick={() => { setDone(false) }}>修正する</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-5">
        <p className="text-sm text-stone-500">{todayLabel}</p>
        <h1 className="text-xl font-bold text-stone-800 mt-0.5">
          {isEdit ? '今日の報告を修正' : '今日のチェックイン'}
        </h1>
        {isEdit && (
          <p className="text-xs text-stone-400 mt-1">今日すでに報告済みです。修正できます。</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 今日進めたもの */}
        <Card>
          <p className="text-sm font-bold text-stone-700 mb-3">
            📚 今日進めたもの <span className="text-red-400">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-2.5 rounded-xl text-sm text-left transition-all border ${
                  category === cat
                    ? 'bg-amber-700 text-white border-amber-700 font-medium'
                    : 'bg-stone-50 text-stone-700 border-stone-100 hover:border-amber-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>

        {/* 進んだ場所 */}
        {category !== '今日はできなかった' && (
          <Card>
            <Textarea
              label="📍 進んだ場所・進捗"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="例：第2章、Day3、投稿3本、LP修正など"
              rows={2}
              hint="具体的に書くと振り返りやすくなります"
            />
          </Card>
        )}

        {/* 今日できたこと */}
        <Card>
          <Textarea
            label="✅ 今日できたこと"
            value={doneText}
            onChange={(e) => setDoneText(e.target.value)}
            placeholder="小さなことでも書いてください。やったこと・気づいたことなど"
            rows={3}
          />
        </Card>

        {/* つまずいたこと */}
        <Card>
          <Textarea
            label="🤔 つまずいたこと"
            value={stuckText}
            onChange={(e) => setStuckText(e.target.value)}
            placeholder="困ったこと、止まっていること、わからないことなど"
            rows={2}
          />
        </Card>

        {/* 質問 */}
        <Card>
          <p className="text-sm font-bold text-stone-700 mb-3">❓ 質問したいことはありますか？</p>
          <div className="flex gap-3 mb-3">
            {[false, true].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setHasQuestion(val)}
                className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${
                  hasQuestion === val
                    ? val
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-stone-600 text-white border-stone-600 font-medium'
                    : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'
                }`}
              >
                {val ? 'あり ❓' : 'なし'}
              </button>
            ))}
          </div>
          {hasQuestion && (
            <div className="space-y-3">
              <Textarea
                label="質問内容"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="具体的な質問を書いてください。スクショがある場合はDiscordに貼ってください"
                rows={3}
                required
              />
              {/* 匿名公開の確認 */}
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-800 mb-2">
                  💡 この質問を匿名でFAQとして公開してもいいですか？
                </p>
                <p className="text-[10px] text-blue-600 mb-2">
                  同じ疑問を持つ他のメンバーの役に立てます（名前は表示されません）
                </p>
                <div className="flex gap-2">
                  {[
                    { val: true,  label: 'OK！公開して 👍' },
                    { val: false, label: 'このままでいい' },
                  ].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setQuestionPublicOk(val)}
                      className={`flex-1 py-2 rounded-xl text-xs border transition-all ${
                        questionPublicOk === val
                          ? 'bg-blue-600 text-white border-blue-600 font-medium'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-blue-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 明日やること */}
        <Card>
          <Textarea
            label="📅 明日やること"
            value={nextText}
            onChange={(e) => setNextText(e.target.value)}
            placeholder="明日の予定・続きなど"
            rows={2}
          />
        </Card>

        {/* 今の状態（複数選択） */}
        <Card>
          <p className="text-sm font-bold text-stone-700 mb-1">💭 今の状態</p>
          <p className="text-[10px] text-stone-400 mb-3">複数選択できます</p>
          <div className="space-y-2">
            {MOODS.map((m) => {
              const selected = moods.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMood(m)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm text-left flex items-center gap-2 border transition-all ${
                    selected
                      ? 'bg-amber-700 text-white border-amber-700 font-medium'
                      : 'bg-stone-50 text-stone-700 border-stone-100 hover:border-amber-200'
                  }`}
                >
                  <span>{MOOD_EMOJI[m]}</span>
                  <span className="flex-1">{m}</span>
                  {selected && <span className="text-white text-xs">✓</span>}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Discord共有 */}
        <Card>
          <p className="text-sm font-bold text-stone-700 mb-3">💬 Discordでの共有</p>
          <div className="grid grid-cols-3 gap-2">
            {DISCORD_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDiscordShare(opt)}
                className={`py-2.5 rounded-xl text-xs border transition-all ${
                  discordShare === opt
                    ? 'bg-amber-700 text-white border-amber-700 font-medium'
                    : 'bg-stone-50 text-stone-700 border-stone-100 hover:border-amber-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          <CheckCircle className="h-5 w-5" />
          {isEdit ? '報告を更新する' : '報告する'}
        </Button>

        <p className="text-xs text-center text-stone-400 pb-6">
          送信後も当日中は修正できます
        </p>
      </form>
    </div>
  )
}
