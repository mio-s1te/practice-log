'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { formatDate, getQuestionStatusColor } from '@/lib/utils'
import type { QuestionStatusType } from '@/types/database'
import { MessageSquare, Filter } from 'lucide-react'

const STATUS_OPTIONS: QuestionStatusType[] = [
  '未対応', '対応中', 'Discordで回答済み', '個別回答済み', 'FAQ化済み', '個別相談へ案内'
]

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

interface QuestionItem {
  id: string
  date: string
  question_text: string
  category: string
  mood: string
  profiles: { name: string; generation: string | null; discord_name: string | null }
  question_statuses: { id: string; status: string; memo: string | null } | null
}

interface Props {
  questions: QuestionItem[]
}

export function QuestionsClient({ questions: initialQuestions }: Props) {
  const supabase = createClient()
  const [questions, setQuestions] = useState(initialQuestions)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = filterStatus === 'all'
    ? questions
    : questions.filter((q) => q.question_statuses?.status === filterStatus || (!q.question_statuses && filterStatus === '未対応'))

  const handleStatusChange = async (questionId: string, checkinId: string, newStatus: QuestionStatusType) => {
    setUpdating(questionId)
    const supabaseClient = createClient()

    const existing = questions.find((q) => q.id === questionId)?.question_statuses

    if (existing?.id) {
      // 既存レコードはUPDATE（staffはRLSで許可済み）
      await supabaseClient
        .from('question_statuses')
        .update({ status: newStatus })
        .eq('id', existing.id)
    } else {
      // 新規レコードはAPIルート経由（Service Role Keyでstaff/adminどちらもINSERT可）
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

  const unopenedCount = questions.filter(
    (q) => !q.question_statuses || q.question_statuses.status === '未対応'
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
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0">{formatDate(q.date, 'M/d')}</span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3 mb-3">
                  <p className="text-sm text-stone-800">{q.question_text}</p>
                  <p className="text-xs text-stone-400 mt-1.5">{q.category}</p>
                </div>

                <div className="flex items-center gap-3">
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
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
