'use client'

import Link from 'next/link'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ClipboardList, Flame, Calendar, Star, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { calcStreak, calcMonthlyRate, calcMissedDays, getCheckinStamp, formatDate, getMissedDaysColor } from '@/lib/utils'
import type { Profile, Checkin, UserBadge, Achievement } from '@/types/database'
import { MOOD_EMOJI, MOOD_COLORS } from '@/types/database'

interface Props {
  profile: Profile
  checkins: Checkin[]
  allCheckins: { date: string }[]
  userBadges: (UserBadge & { badges: { name: string; icon: string; description: string } })[]
  achievements: Achievement[]
}

export function DashboardClient({ profile, checkins, allCheckins, userBadges, achievements }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayCheckin = checkins.find((c) => c.date === today)
  const streak = calcStreak(allCheckins)
  const { reported, total, rate } = calcMonthlyRate(allCheckins)
  const missed = calcMissedDays(allCheckins, profile.start_date)

  // 今月のカレンダー（ミニ版）
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const recentCheckins = checkins.slice(0, 5)

  const stageColors: Record<string, string> = {
    '土台づくり中': 'bg-stone-100 text-stone-700',
    '方向性整理中': 'bg-blue-50 text-blue-700',
    '導線設計中': 'bg-purple-50 text-purple-700',
    '発信実践中': 'bg-amber-50 text-amber-700',
    '反応確認中': 'bg-green-50 text-green-700',
    '改善中': 'bg-orange-50 text-orange-700',
    '成果検証中': 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="space-y-5">
      {/* ヘッダー挨拶 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{format(now, 'M月d日（EEEE）', { locale: ja })}</p>
          <h1 className="text-xl font-bold text-stone-800 mt-0.5">
            {profile.name || 'さん'}のダッシュボード
          </h1>
        </div>
        {/* 現在地 */}
        {profile.current_stage && (
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${stageColors[profile.current_stage] ?? 'bg-stone-100 text-stone-700'}`}>
            📍 {profile.current_stage}
          </span>
        )}
      </div>

      {/* 今日のチェックイン */}
      {!todayCheckin ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 mb-0.5">今日はまだ報告していません</p>
              <p className="text-xs text-amber-700">1分で実践を記録しましょう ✨</p>
            </div>
            <Link href="/checkin">
              <Button size="sm">
                <ClipboardList className="h-4 w-4" />
                チェックイン
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="text-3xl">✅</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800 mb-0.5">今日の報告完了！</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${MOOD_COLORS[todayCheckin.mood]}`}>
                  {MOOD_EMOJI[todayCheckin.mood]} {todayCheckin.mood}
                </span>
                <span className="text-xs text-stone-500">{todayCheckin.category}</span>
              </div>
            </div>
            <Link href="/checkin" className="text-xs text-green-700 underline">
              確認・修正
            </Link>
          </div>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <div className="flex items-center justify-center mb-1">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-stone-800">{streak}</div>
          <div className="text-xs text-stone-500 mt-0.5">連続日数</div>
        </div>
        <div className="stat-card text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-800">{rate}<span className="text-sm font-normal">%</span></div>
          <div className="text-xs text-stone-500 mt-0.5">今月の報告率</div>
        </div>
        <div className="stat-card text-center">
          <div className="flex items-center justify-center mb-1">
            <AlertCircle className={`h-5 w-5 ${getMissedDaysColor(missed)}`} />
          </div>
          <div className={`text-2xl font-black ${getMissedDaysColor(missed)}`}>{missed}</div>
          <div className="text-xs text-stone-500 mt-0.5">未報告日数</div>
        </div>
      </div>

      {/* 今月のミニカレンダー */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-700">
            <Calendar className="h-4 w-4 inline mr-1.5 text-amber-600" />
            {format(now, 'M月', { locale: ja })}の報告カレンダー
          </h2>
          <Link href="/calendar" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
            全表示 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
          ))}
          {/* 最初の日の曜日分オフセット */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const checkin = checkins.find((c) => c.date === dayStr)
            const stamp = getCheckinStamp(checkin ?? null)
            const isCurrentDay = isToday(day)
            const isFuture = day > now

            return (
              <div
                key={dayStr}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs relative ${
                  isCurrentDay ? 'ring-2 ring-amber-600' : ''
                } ${isFuture ? 'opacity-30' : ''}`}
              >
                {stamp ? (
                  <span className="text-base leading-none">{stamp}</span>
                ) : (
                  <span className={`text-xs ${isFuture ? 'text-stone-300' : 'text-stone-400'}`}>
                    {format(day, 'd')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
          <span>✅ 報告</span>
          <span>❓ 質問</span>
          <span>💛 励まし</span>
          <span>🌱 お休み</span>
        </div>
      </Card>

      {/* 最近の報告 */}
      {recentCheckins.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">最近の報告</h2>
            <Link href="/history" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
              全履歴 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentCheckins.map((checkin) => (
              <div key={checkin.id} className="flex items-start gap-3 py-2.5 border-b border-stone-50 last:border-0">
                <div className="text-lg leading-none mt-0.5">{getCheckinStamp(checkin)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-stone-600">{formatDate(checkin.date, 'M/d（EEEE）')}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${MOOD_COLORS[checkin.mood]}`}>
                      {checkin.mood}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 truncate">{checkin.category}</p>
                  {checkin.done_text && (
                    <p className="text-xs text-stone-700 mt-0.5 truncate">✓ {checkin.done_text}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* バッジ */}
      {userBadges.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">
              <Star className="h-4 w-4 inline mr-1.5 text-amber-500" />
              獲得バッジ
            </h2>
            <Link href="/badges" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
              全バッジ <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {userBadges.slice(0, 6).map((ub) => (
              <div key={ub.id} className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5" title={ub.badges.description}>
                <span className="text-base">{ub.badges.icon}</span>
                <span className="text-xs font-medium text-amber-800">{ub.badges.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 成果報告 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-700">
            <Star className="h-4 w-4 inline mr-1.5 text-yellow-500" />
            成果報告
          </h2>
          <Link href="/achievements" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
            報告する <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {achievements.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">
            成果が出たら記録しましょう ⭐
          </p>
        ) : (
          <div className="space-y-2">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-2 border-b border-stone-50 last:border-0">
                <span className="text-base">⭐</span>
                <div>
                  <p className="text-xs text-stone-600">{formatDate(a.date, 'M/d')}</p>
                  <p className="text-sm text-stone-800">{a.achievement_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
