'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { getCheckinStamp, calcStreak, formatDate } from '@/lib/utils'
import { MOOD_COLORS, MOOD_EMOJI } from '@/types/database'
import type { Checkin, Profile } from '@/types/database'

interface Props {
  checkins: Checkin[]
  profile: Profile
}

export function CalendarClient({ checkins, profile }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null)

  const streak = calcStreak(checkins)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const checkinMap = new Map(checkins.map((c) => [c.date, c]))

  const handleDayClick = (dayStr: string) => {
    const c = checkinMap.get(dayStr)
    if (c) setSelectedCheckin(c)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-800">報告カレンダー</h1>
        <p className="text-sm text-stone-500 mt-0.5">実践の記録が積み上がっています</p>
      </div>

      {/* 統計バー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card text-center">
          <div className="text-3xl font-black text-orange-500">{streak}</div>
          <div className="text-xs text-stone-500 mt-1">🔥 連続報告日数</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-3xl font-black text-amber-700">{checkins.length}</div>
          <div className="text-xs text-stone-500 mt-1">📋 累計報告数</div>
        </div>
      </div>

      {/* カレンダー */}
      <Card>
        {/* ナビ */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-stone-100 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4 text-stone-600" />
          </button>
          <h2 className="text-base font-bold text-stone-800">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-stone-100 rounded-lg"
            disabled={addMonths(currentMonth, 1) > new Date()}
          >
            <ChevronRight className={`h-4 w-4 ${addMonths(currentMonth, 1) > new Date() ? 'text-stone-200' : 'text-stone-600'}`} />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-stone-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const checkin = checkinMap.get(dayStr)
            const stamp = getCheckinStamp(checkin ?? null)
            const isCurrentDay = isToday(day)
            const isFuture = day > new Date()
            const isSelected = selectedCheckin?.date === dayStr

            return (
              <button
                key={dayStr}
                onClick={() => !isFuture && handleDayClick(dayStr)}
                disabled={isFuture}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs relative transition-all ${
                  isSelected ? 'ring-2 ring-amber-700 bg-amber-50' : ''
                } ${isCurrentDay && !isSelected ? 'ring-2 ring-amber-400' : ''} ${
                  !isFuture && !isSelected ? 'hover:bg-stone-50' : ''
                } ${isFuture ? 'opacity-25 cursor-default' : 'cursor-pointer'}`}
              >
                {stamp ? (
                  <span className="text-lg leading-none">{stamp}</span>
                ) : (
                  <span className={`text-xs ${isFuture ? 'text-stone-300' : 'text-stone-500'}`}>
                    {format(day, 'd')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500">
          <span>✅ 通常報告</span>
          <span>❓ 質問した日</span>
          <span>💛 励まし希望</span>
          <span>🌱 できなかった日</span>
          <span>⭐ 成果報告</span>
        </div>
      </Card>

      {/* 選択した日の詳細 */}
      {selectedCheckin && (
        <Card className="border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-800">
              {formatDate(selectedCheckin.date, 'M月d日（EEEE）')}の記録
            </h3>
            <button
              onClick={() => setSelectedCheckin(null)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              閉じる
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 w-20">進めたもの</span>
              <span className="text-xs font-medium text-stone-700 bg-stone-50 px-2 py-1 rounded-lg">
                {selectedCheckin.category}
              </span>
            </div>
            {selectedCheckin.section && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-stone-500 w-20 pt-0.5">進んだ場所</span>
                <span className="text-xs text-stone-700">{selectedCheckin.section}</span>
              </div>
            )}
            {selectedCheckin.done_text && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-stone-500 w-20 pt-0.5">できたこと</span>
                <span className="text-xs text-stone-700">{selectedCheckin.done_text}</span>
              </div>
            )}
            {selectedCheckin.stuck_text && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-stone-500 w-20 pt-0.5">つまずき</span>
                <span className="text-xs text-stone-700">{selectedCheckin.stuck_text}</span>
              </div>
            )}
            {selectedCheckin.has_question && selectedCheckin.question_text && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-stone-500 w-20 pt-0.5">質問</span>
                <span className="text-xs text-stone-700">{selectedCheckin.question_text}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 w-20">状態</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${MOOD_COLORS[selectedCheckin.mood]}`}>
                {MOOD_EMOJI[selectedCheckin.mood]} {selectedCheckin.mood}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
