'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { formatDate, getQuestionStatusColor } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { QuestionStatusType } from '@/types/database'
import { MessageSquare, Filter, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_OPTIONS: QuestionStatusType[] = [
  '未対応', '対応中', 'Discordで回答済み', '個別回答済み', 'FAQ化済み', '個別相談へ案内'
]

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

type Reply = {
  id: string
  checkin_id: string
  reply_text: string
  created_at: string
  from_member?: boolean  // 013マイグレーション後に有効
}

interface QuestionItem {
  id: string
  date: string
  question_text: string
  category: string
  mood: string
  profiles: { name: string; generation: string | null; discord_name: string | null }
  question_statuses: { id: string; status: string; memo: string | null } | null
  replies?: Reply[]
}

interface Props {
  questions: QuestionItem[]
}

export function QuestionsClient({ questions: initialQuestions }: Props) {
  const supabase = createClient()
  const [questions, setQuestions] = useState(initialQuestions)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const filtered = filterStatus === 'all'
    ? questions
    : questions.filter((q) => q.question_statuses?.status === filterStatus || (!q.question_statuses && filterStatus === '未対応'))

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStatusChange = async (questionId: string, checkinId: string, newStatus: QuestionStatusType) => {
    setUpdating(questionId)
    const supabaseClient = createClient()

    const existing = questions.find((q) => q.id === questionId)?.question_statuses

    if (existing?.id) {
      await supabaseClient
        .from('question_statuses')
        .update({ status: newStatus })
        .eq('id', existing.id)
    } else {
      await fetch('/api/admin/question-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId, status: newStatus }),
      })
    }

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, question_statuses: { ...(q.question_statuses ?? { id: '', memo: null }), status: newStatus } }
          : q
      )
    )
    setUpdating(null)
  }

  const handleReply = async (questionId: string) => {
    if (!replyText.trim()) return
    setReplying(true)
    const res = await fetch('/api/admin/question-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinId: questionId, replyText }),
    })
    if (res.ok) {
      const json = await res.json()
      setReplyingId(null)
      setReplyText('')
      // 回答をUIに追加
      setQuestions(prev => prev.map(q =>
        q.id === questionId
          ? {
              ...q,
              question_statuses: { ...(q.question_statuses ?? { id: '', memo: null }), status: '個別回答済み' },
              replies: [...(q.replies ?? []), { ...json.reply, from_member: false }],
            }
          : q
      ))
      // 展開して回答を見せる
      setExpandedIds(prev => new Set(prev).add(questionId))
    }
    setReplying(false)
  }

  const unopenedCount = questions.filter(
    (q) => !q.question_statuses || q.question_statuses.status === '未対応'
  ).length

  // メンバーからの返信がある質問
  const memberRepliedCount = questions.filter(
    (q) => (q.replies ?? []).some(r => r.from_member)
  ).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-800">質問一覧</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          全 {questions.length} 件
          {unopenedCount > 0 && (
            <span className="ml-2 text-red-500 font-medium">未対応 {unopenedCount} 件</span>
          )}
          {memberRepliedCount > 0 && (
            <span className="ml-2 text-blue-500 font-medium">💬 メンバー返信あり {memberRepliedCount} 件</span>
          )}
        </p>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-stone-400" />
        <div className="flex gap-2 flex-wrap">
          {['all', ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filterStatus === s
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
              }`}
            >
              {s === 'all' ? 'すべて' : s}
            </button>
          ))}
        </div>
      </div>

      {/* 質問リスト */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <MessageSquare className="h-8 w-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">質問はありません</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const status = q.question_statuses?.status ?? '未対応'
            const isExpanded = expandedIds.has(q.id)
            const hasMemberReply = (q.replies ?? []).some(r => r.from_member)

            return (
              <Card key={q.id} className={status === '未対応' ? 'border-red-100' : ''}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-800">{q.profiles?.name}</span>
                    {q.profiles?.generation && (
                      <Badge size="sm" variant="outline">{q.profiles.generation}</Badge>
                    )}
                    {q.profiles?.discord_name && (
                      <span className="text-xs text-stone-400">@{q.profiles.discord_name}</span>
                    )}
                    {hasMemberReply && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        💬 メンバー返信あり
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0">{formatDate(q.date, 'M/d')}</span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3 mb-3">
                  <p className="text-sm text-stone-800">{q.question_text}</p>
                  <p className="text-xs text-stone-400 mt-1.5">{q.category}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    options={STATUS_SELECT_OPTIONS}
                    value={status}
                    onChange={(e) => handleStatusChange(q.id, q.id, e.target.value as QuestionStatusType)}
                    className="text-xs py-1.5"
                  />
                  <span className={`text-xs px-2 py-1 rounded-lg border ${getQuestionStatusColor(status)}`}>
                    {status}
                  </span>
                  {updating === q.id && <span className="text-xs text-stone-400">更新中...</span>}
                  <button
                    onClick={() => { setReplyingId(replyingId === q.id ? null : q.id); setReplyText('') }}
                    className="text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    💬 回答する
                  </button>
                  {/* スレッドの展開・折りたたみ */}
                  {(q.replies ?? []).length > 0 && (
                    <button
                      onClick={() => toggleExpand(q.id)}
                      className="text-xs px-2 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      返信 {(q.replies ?? []).length} 件
                    </button>
                  )}
                </div>

                {/* 返信スレッド（展開時） */}
                {isExpanded && (q.replies ?? []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                    {(q.replies ?? []).map((reply) => (
                      <div
                        key={reply.id}
                        className={`rounded-xl p-3 ${
                          reply.from_member
                            ? 'bg-blue-50 border border-blue-100 ml-4'
                            : 'bg-emerald-50 border border-emerald-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">
                            {reply.from_member ? '🙋 メンバー' : '👨‍💼 スタッフ'}
                          </span>
                          <span className="text-[10px] text-stone-400">
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

                {/* 回答フォーム */}
                {replyingId === q.id && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs font-bold text-stone-600 mb-2">💬 アプリ内回答</p>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="回答内容を入力してください..."
                      rows={3}
                      className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReply(q.id)}
                        disabled={replying || !replyText.trim()}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
                      >
                        {replying ? '送信中...' : '回答を送信'}
                      </button>
                      <button
                        onClick={() => { setReplyingId(null); setReplyText('') }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
