'use client'

import Link from 'next/link'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ClipboardList, Flame, Calendar, Star, ChevronRight, TrendingUp, AlertCircle, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
  const now = new Date()
  const todayCheckin = checkins.find((c) => c.date === today)
  const streak = calcStreak(allCheckins)
  const { reported, total, rate } = calcMonthlyRate(allCheckins)
  const missed = calcMissedDays(allCheckins, profile.start_date)

  // 今月カレンダー
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const checkinMap = new Map(checkins.map((c) => [c.date, c]))

  // 過去14日間の棒グラフデータ（報告あり=🐱 なし=空）
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(now, 13 - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const label = format(d, 'M/d')
    const hasCheckin = !!checkinMap.get(dateStr)
    const isCurrentDay = dateStr === today
    return { label, dateStr, hasCheckin, isCurrentDay }
  })

  // 気分の分布（全チェックイン）
  const moodMap: Record<string, number> = {}
  checkins.forEach(c => { moodMap[c.mood] = (moodMap[c.mood] ?? 0) + 1 })
  const moodTotal = checkins.length || 1
  const moodOrder = ['絶好調', '順調', '普通', '励ましがほしい', 'しんどい']
  const moodColors: Record<string, string> = {
    '絶好調': '#10b981', '順調': '#60a5fa', '普通': '#a78bfa',
    '励ましがほしい': '#fbbf24', 'しんどい': '#f87171',
  }

  // ステージ進捗
  const stages = ['土台づくり中', '方向性整理中', '導線設計中', '発信実践中', '反応確認中', '改善中', '成果検証中']
  const stageIdx = stages.indexOf(profile.current_stage ?? '') 
  const stageProgress = stageIdx >= 0 ? Math.round(((stageIdx + 1) / stages.length) * 100) : 0
  const stageColors: Record<string, string> = {
    '土台づくり中': 'bg-stone-100 text-stone-700',
    '方向性整理中': 'bg-blue-50 text-blue-700',
    '導線設計中': 'bg-purple-50 text-purple-700',
    '発信実践中': 'bg-amber-50 text-amber-700',
    '反応確認中': 'bg-green-50 text-green-700',
    '改善中': 'bg-orange-50 text-orange-700',
    '成果検証中': 'bg-emerald-50 text-emerald-700',
  }

  const recentCheckins = checkins.slice(0, 5)

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{format(now, 'M月d日（EEEE）', { locale: ja })}</p>
          <h1 className="text-xl font-bold text-stone-800 mt-0.5">
            {profile.name || 'さん'}のダッシュボード
          </h1>
        </div>
        {profile.current_stage && (
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${stageColors[profile.current_stage] ?? 'bg-stone-100 text-stone-700'}`}>
            📍 {profile.current_stage}
          </span>
        )}
      </div>

      {/* 今日のチェックイン */}
      {!todayCheckin ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="text-3xl animate-bounce">🐱</div>
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
            <div className="text-3xl">🐱</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800 mb-0.5">今日の報告完了！</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${MOOD_COLORS[todayCheckin.mood]}`}>
                  {MOOD_EMOJI[todayCheckin.mood]} {todayCheckin.mood}
                </span>
                <span className="text-xs text-stone-500">{todayCheckin.category}</span>
              </div>
            </div>
            <Link href="/checkin" className="text-xs text-green-700 underline">確認・修正</Link>
          </div>
        </div>
      )}

      {/* 成果報告ボタン（目立つ位置） */}
      <Link href="/achievements" className="block">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity shadow-md">
          <div className="text-3xl">⭐</div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">成果を報告する</p>
            <p className="text-xs text-yellow-100 mt-0.5">初クリック・LINE登録・報酬発生など</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white" />
        </div>
      </Link>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <div className="text-xl mb-1">🔥</div>
          <div className="text-2xl font-black text-stone-800">{streak}</div>
          <div className="text-xs text-stone-500 mt-0.5">連続日数</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xl mb-1">📈</div>
          <div className="text-2xl font-black text-stone-800">{rate}<span className="text-sm font-normal">%</span></div>
          <div className="text-xs text-stone-500 mt-0.5">今月の報告率</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xl mb-1">📋</div>
          <div className="text-2xl font-black text-stone-800">{checkins.length}</div>
          <div className="text-xs text-stone-500 mt-0.5">累計報告数</div>
        </div>
      </div>

      {/* ━━━ 分析グラフ ━━━ */}
      {/* 過去14日間の出席スタンプ */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-700">🐱 過去14日間の記録</h2>
          <Link href="/calendar" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
            カレンダー <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-1 flex-wrap">
          {last14.map((d) => (
            <div key={d.dateStr} className="flex flex-col items-center gap-0.5" style={{ width: '13px' }}>
              <span
                className={`text-base leading-none ${d.hasCheckin ? '' : 'opacity-20'} ${d.isCurrentDay ? 'ring-1 ring-amber-500 rounded' : ''}`}
                title={d.label}
              >
                {d.hasCheckin ? '🐱' : '○'}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
          <span>🐱 報告した日</span>
          <span>○ 未報告</span>
          <span className={`font-bold ${getMissedDaysColor(missed)}`}>未報告 {missed}日</span>
        </div>
      </Card>

      {/* 今月の報告率 プログレスバー */}
      <Card>
        <h2 className="text-sm font-bold text-stone-700 mb-3">📊 今月の実践分析</h2>

        {/* 報告率バー */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-stone-600">今月の報告率</span>
            <span className="text-sm font-black text-amber-700">{rate}%</span>
          </div>
          <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${rate}%`,
                background: rate >= 80 ? 'linear-gradient(to right, #10b981, #34d399)'
                  : rate >= 50 ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
                  : 'linear-gradient(to right, #f87171, #fca5a5)',
              }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">{reported}日 / {total}日</p>
        </div>

        {/* ステージ進捗バー */}
        {profile.current_stage && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-stone-600">ステージ進捗</span>
              <span className="text-xs font-bold text-purple-600">{profile.current_stage}</span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-purple-400 to-purple-600"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-stone-400">土台づくり中</span>
              <span className="text-[10px] text-stone-400">成果検証中</span>
            </div>
          </div>
        )}

        {/* 気分グラフ（横棒） */}
        {checkins.length > 0 && (
          <div>
            <p className="text-xs text-stone-600 mb-2">気分の分布（全期間）</p>
            <div className="space-y-1.5">
              {moodOrder.filter(m => moodMap[m] > 0).map(mood => {
                const cnt = moodMap[mood] ?? 0
                const pct = Math.round((cnt / moodTotal) * 100)
                return (
                  <div key={mood} className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-600 w-24 flex-shrink-0">
                      {MOOD_EMOJI[mood as keyof typeof MOOD_EMOJI]} {mood}
                    </span>
                    <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: moodColors[mood] ?? '#a78bfa' }}
                      />
                    </div>
                    <span className="text-[11px] text-stone-500 w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 今月のミニカレンダー */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-700">
            <Calendar className="h-4 w-4 inline mr-1.5 text-amber-600" />
            {format(now, 'M月', { locale: ja })}のカレンダー
          </h2>
          <Link href="/calendar" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
            全表示 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
          ))}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const checkin = checkinMap.get(dayStr)
            const stamp = getCheckinStamp(checkin ?? null)
            const isCurrentDay = isToday(day)
            const isFuture = day > now

            return (
              <div
                key={dayStr}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs ${
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
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
          <span>🐱 報告</span>
          <span>❓ 質問</span>
          <span>💛 励まし</span>
          <span>🌱 お休み</span>
          <span>⭐ 成果</span>
        </div>
      </Card>

      {/* バッジ */}
      {userBadges.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">
              <Trophy className="h-4 w-4 inline mr-1.5 text-amber-500" />
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
    </div>
  )
}
