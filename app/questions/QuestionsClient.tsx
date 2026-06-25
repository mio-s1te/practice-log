'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'

type Reply = {
  id: string
  checkin_id: string
  reply_text: string
  created_at: string
  from_member?: boolean   // 013マイグレーション後に追加されるカラム（デフォルトfalse=スタッフ回答）
  parent_reply_id?: string | null
  staff_id?: string | null
  member_id?: string | null
}

type Question = {
  id: string
  date: string
  category: string
  question_text: string | null
  status: string
  replies: Reply[]
}

const STATUS_COLORS: Record<string, string> = {
  '未対応':       'bg-stone-100 text-stone-600',
  '対応中':       'bg-blue-100 text-blue-700',
  'Discordで回答済み': 'bg-purple-100 text-purple-700',
  '個別回答済み': 'bg-green-100 text-green-700',
  'FAQ化済み':    'bg-amber-100 text-amber-700',
  '個別相談へ案内': 'bg-orange-100 text-orange-700',
}

export function QuestionsClient() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/my-questions')
    if (!res.ok) return
    const json = await res.json()
    setQuestions(json.questions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleReply = async (checkinId: string) => {
    if (!replyText.trim()) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/my-questions/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinId, replyText }),
    })
    if (res.ok) {
      setReplyText('')
      setReplyingId(null)
      await load()
    } else {
      const json = await res.json()
      setError(json.error ?? '送信に失敗しました')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-10 text-center">
        <p className="text-sm text-stone-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* ヘッダー */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-stone-800">
          <MessageSquare className="h-5 w-5 inline mr-2 text-blue-500" />
          質問と回答
        </h1>
        <p className="text-xs text-stone-500 mt-1">スタッフからの回答を確認・返信できます</p>
      </div>

      {questions.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-400 text-center py-8">
            まだ質問がありません。<br />
            チェックイン時に質問を入力すると、スタッフが回答します。
          </p>
        </Card>
      ) : (
        questions.map((q) => {
          const isExpanded = expandedIds.has(q.id)
          const staffReplies = q.replies.filter(r => !r.from_member)
          const hasReply = staffReplies.length > 0 || q.replies.length > 0

          return (
            <Card key={q.id} className="overflow-hidden">
              {/* 質問ヘッダー */}
              <button
                className="w-full text-left"
                onClick={() => toggleExpand(q.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-stone-400">
                        {format(new Date(q.date), 'M月d日（EEEE）', { locale: ja })}
                      </span>
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {q.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status] ?? 'bg-stone-100 text-stone-600'}`}>
                        {q.status}
                      </span>
                      {hasReply && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          ✉️ 回答あり
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed line-clamp-2">
                      ❓ {q.question_text}
                    </p>
                  </div>
                  <span className="text-stone-400 flex-shrink-0 mt-0.5">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </div>
              </button>

              {/* 展開時：回答スレッド */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">

                  {/* 質問全文 */}
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-700 mb-1">❓ 質問</p>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
                  </div>

                  {/* 回答・返信スレッド */}
                  {q.replies.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-2">
                      まだ回答がありません。しばらくお待ちください。
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {q.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`rounded-xl p-3 ${
                            reply.from_member
                              ? 'bg-stone-50 border border-stone-100 ml-4'
                              : 'bg-emerald-50 border border-emerald-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold">
                              {reply.from_member ? '🙋 あなた' : '👨‍💼 スタッフ'}
                            </span>                            <span className="text-[10px] text-stone-400">
                              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ja })}
                            </span>
                          </div>
                          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                            {reply.reply_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 返信フォーム */}
                  {replyingId === q.id ? (
                    <div className="space-y-2 mt-1">
                      <Textarea
                        label="返信を入力"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="スタッフへの返信・追加の質問などを入力してください"
                        rows={3}
                      />
                      {error && (
                        <p className="text-xs text-red-500">{error}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={submitting}
                          onClick={() => handleReply(q.id)}
                          disabled={!replyText.trim()}
                        >
                          <Send className="h-3.5 w-3.5" />
                          送信
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setReplyingId(null); setReplyText(''); setError('') }}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setReplyingId(q.id); setReplyText('') }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      スタッフに返信する
                    </button>
                  )}
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
