'use client'

import Link from 'next/link'
import { useMemo, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import GenerationTimeline from '@/components/GenerationTimeline'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ClipboardList, Flame, Calendar, Star, ChevronRight, TrendingUp, AlertCircle, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { calcStreak, calcMonthlyRate, calcMissedDays, getCheckinStamp, formatDate, getMissedDaysColor } from '@/lib/utils'
import type { Profile, Checkin, UserBadge, Achievement } from '@/types/database'
import { MOOD_EMOJI, MOOD_COLORS, CATEGORIES } from '@/types/database'

// ─── レーダーチャート（受講生用） ────────────────────────────
const CAT_RADAR = [
  'スタート講座', 'アフィリエイト講座', '投稿作成',
  '導線作成', '案件選定', '無料プレゼント作成', 'その他',
] as const

function MemberRadarChart({
  myData, genData,
}: {
  myData: Record<string, number>
  genData?: Record<string, number>
}) {
  const vw = 320, vh = 320, cx = 160, cy = 160, r = 100, n = CAT_RADAR.length
  const maxVal = Math.max(...CAT_RADAR.map(c => Math.max(myData[c] ?? 0, genData?.[c] ?? 0)), 1)

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  })
  const lpt = (i: number) => ({
    lx: cx + (r + 42) * Math.cos(angle(i)),
    ly: cy + (r + 42) * Math.sin(angle(i)),
  })

  const grids = [0.25, 0.5, 0.75, 1.0]
  const myPts = CAT_RADAR.map((c, i) => pt(i, (myData[c] ?? 0) / maxVal))
  const genPts = genData ? CAT_RADAR.map((c, i) => pt(i, (genData[c] ?? 0) / maxVal)) : null

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full max-w-sm mx-auto">
      {/* グリッド */}
      {grids.map((ratio, gi) => (
        <polygon key={gi}
          points={CAT_RADAR.map((_, i) => `${pt(i, ratio).x},${pt(i, ratio).y}`).join(' ')}
          fill="none" stroke="#e7e5e4" strokeWidth="1" />
      ))}
      {/* 軸線 */}
      {CAT_RADAR.map((_, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={pt(i, 1).x} y2={pt(i, 1).y}
          stroke="#e7e5e4" strokeWidth="1" />
      ))}
      {/* 同期生平均面 */}
      {genPts && (
        <polygon
          points={genPts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(96,165,250,0.15)" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,2" />
      )}
      {/* 自分のデータ面 */}
      <polygon
        points={myPts.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(217,119,6,0.25)" stroke="#d97706" strokeWidth="2" />
      {myPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#d97706" />)}
      {/* ラベル */}
      {CAT_RADAR.map((cat, i) => {
        const { lx, ly } = lpt(i)
        const anchor = lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle'
        const val = myData[cat] ?? 0
        const label1 = cat.length > 6 ? cat.slice(0, Math.ceil(cat.length / 2)) : cat
        const label2 = cat.length > 6 ? cat.slice(Math.ceil(cat.length / 2)) : null
        return (
          <g key={i}>
            <text x={lx} y={ly - (label2 ? 8 : 2)} textAnchor={anchor} fontSize="10" fill="#57534e" fontWeight="600">{label1}</text>
            {label2 && <text x={lx} y={ly + 5} textAnchor={anchor} fontSize="10" fill="#57534e" fontWeight="600">{label2}</text>}
            <text x={lx} y={ly + (label2 ? 19 : 12)} textAnchor={anchor} fontSize="10" fill="#d97706" fontWeight="700">{val}回</text>
          </g>
        )
      })}
    </svg>
  )
}

interface Props {
  profile: Profile
  checkins: Checkin[]
  allCheckins: { date: string }[]
  userBadges: (UserBadge & { badges: { name: string; icon: string; description: string } })[]
  achievements: Achievement[]
  myStuckItems?: { id: string; date: string; category: string; stuck_text?: string | null; mood: string }[]
  allMyCheckins?: { id: string; date: string; category: string; mood: string; stuck_text?: string | null }[]
  generationCheckins?: { date: string; category: string; mood: string; user_id: string }[]
  answeredQuestionCount?: number
  lineConnected?: boolean
}

export function DashboardClient({
  profile, checkins, allCheckins, userBadges, achievements,
  myStuckItems = [], allMyCheckins = [], generationCheckins = [],
  answeredQuestionCount = 0,
  lineConnected = false,
}: Props) {
  const searchParams = useSearchParams()
  const [lineJustConnected, setLineJustConnected] = useState(false)
  useEffect(() => {
    if (searchParams.get('line_connected') === '1') setLineJustConnected(true)
  }, [searchParams])
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

      {/* LINE連携バナー */}
      {!lineConnected && !lineJustConnected && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="text-3xl">💬</div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">LINEと連携して通知を受け取ろう</p>
            <p className="text-xs text-green-100 mt-0.5">報告忘れを防ぐ朝の優しいリマインドが届きます</p>
          </div>
          <a
            href="/api/auth/line-connect"
            className="bg-white text-green-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-50 transition-colors flex-shrink-0"
          >
            連携する
          </a>
        </div>
      )}
      {lineJustConnected && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="text-2xl">✅</div>
          <div>
            <p className="text-sm font-bold text-green-800">LINE連携が完了しました！</p>
            <p className="text-xs text-green-600 mt-0.5">明日から朝7時にリマインドが届きます</p>
          </div>
        </div>
      )}

      {/* スタッフからの回答通知 */}
      {answeredQuestionCount > 0 && (
        <Link href="/questions" className="block">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="text-2xl">✉️</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">スタッフから回答が届いています</p>
              <p className="text-xs text-emerald-700 mt-0.5">質問への回答 {answeredQuestionCount}件 → タップして確認</p>
            </div>
            <ChevronRight className="h-5 w-5 text-emerald-600" />
          </div>
        </Link>
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

      {/* 同期タイムライン（generationがない場合も表示・メッセージで案内） */}
      <GenerationTimeline myUserId={profile.id} generation={profile.generation ?? null} />

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

      {/* ━━━ 実践分析ダッシュボード ━━━ */}
      <MemberAnalysisSection
        profile={profile}
        allMyCheckins={allMyCheckins}
        myStuckItems={myStuckItems}
        generationCheckins={generationCheckins}
        streak={streak}
        rate={rate}
        achievements={achievements}
      />
    </div>
  )
}

// ─── 受講生向け分析セクション ────────────────────────────────
function MemberAnalysisSection({
  profile, allMyCheckins, myStuckItems, generationCheckins, streak, rate, achievements
}: {
  profile: Profile
  allMyCheckins: { id: string; date: string; category: string; mood: string; stuck_text?: string | null }[]
  myStuckItems: { id: string; date: string; category: string; stuck_text?: string | null; mood: string }[]
  generationCheckins: { date: string; category: string; mood: string; user_id: string }[]
  streak: number
  rate: number
  achievements: Achievement[]
}) {
  // ── カテゴリ別チェックイン数（自分） ──
  const myCatCount = useMemo(() =>
    allMyCheckins.reduce((acc, c) => {
      if (c.category !== '今日はできなかった') acc[c.category] = (acc[c.category] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  , [allMyCheckins])

  // ── カテゴリ別チェックイン数（同期生平均） ──
  const genMemberIds = useMemo(() => [...new Set(generationCheckins.map(c => c.user_id))], [generationCheckins])
  const genCatCount = useMemo(() => {
    if (genMemberIds.length === 0) return undefined
    const totals = generationCheckins.reduce((acc, c) => {
      if (c.category !== '今日はできなかった') acc[c.category] = (acc[c.category] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    // 人数で割って平均に
    return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v / genMemberIds.length)]))
  }, [generationCheckins, genMemberIds])

  // ── つまずき率（カテゴリ別） ──
  const stuckCatCount = useMemo(() =>
    myStuckItems.reduce((acc, c) => {
      if (c.category !== '今日はできなかった') acc[c.category] = (acc[c.category] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  , [myStuckItems])

  // ── 褒めポイント計算 ──
  const praisePoints = useMemo(() => {
    const pts: string[] = []
    if (streak >= 7) pts.push(`🔥 ${streak}日連続チェックイン継続中！継続力がすごいです`)
    else if (streak >= 3) pts.push(`🔥 ${streak}日連続でチェックイン中。その習慣を大切に！`)
    if (rate >= 80) pts.push(`📈 今月の報告率${rate}%！ほぼ毎日取り組めています`)
    else if (rate >= 60) pts.push(`📈 今月${rate}%の報告率。コンスタントに動けています`)
    if (achievements.length > 0) pts.push(`⭐ 成果報告が${achievements.length}件！実績を積み上げています`)
    const topCat = Object.entries(myCatCount).sort((a,b) => b[1]-a[1])[0]
    if (topCat) pts.push(`💪 「${topCat[0]}」に${topCat[1]}回取り組みました。集中できています`)
    if (pts.length === 0) pts.push('📝 記録を続けることが成長の第一歩！毎日の積み重ねが力になります')
    return pts
  }, [streak, rate, achievements, myCatCount])

  // ── 改善ポイント計算 ──
  const improvePoints = useMemo(() => {
    const pts: string[] = []
    const topStuck = Object.entries(stuckCatCount).sort((a,b) => b[1]-a[1])[0]
    if (topStuck) pts.push(`🤔 「${topStuck[0]}」でのつまずきが${topStuck[1]}件と最多です。質問や相談を活用してみましょう`)
    const weakCats = CATEGORIES.filter(c =>
      c !== '今日はできなかった' && c !== 'その他' && (myCatCount[c] ?? 0) === 0
    )
    if (weakCats.length > 0 && allMyCheckins.length > 10)
      pts.push(`📚 「${weakCats[0]}」がまだ未着手です。次のステップとして取り組んでみましょう`)
    const recentMoods = allMyCheckins.slice(0, 7).map(c => c.mood)
    const warnMoods = recentMoods.filter(m => m === '励ましがほしい' || m === '個別相談が必要かも')
    if (warnMoods.length >= 3) pts.push('💛 最近しんどそうな日が続いています。無理せず管理者やスタッフに声をかけてください')
    if (streak < 3 && allMyCheckins.length > 5) pts.push('📅 チェックインが途切れがちです。毎日5分でも記録する習慣をつけましょう')
    if (pts.length === 0) pts.push('✨ 特に気になる点はありません。この調子で続けましょう！')
    return pts
  }, [stuckCatCount, myCatCount, allMyCheckins])

  // ── 収益化アドバイス ──
  const revenueAdvice = useMemo(() => {
    const stage = profile.current_stage ?? ''
    const adviceMap: Record<string, string[]> = {
      '土台づくり中':   ['🎯 今は土台を固める段階。スタート講座を最後まで完走することが収益への最短ルートです', '📝 毎日のチェックインで「何をやったか」を言語化する習慣が後々の発信ネタになります'],
      '方向性整理中':   ['🧭 方向性が決まると行動スピードが一気に上がります。「誰に・何を届けるか」を明確にしましょう', '💡 自分の得意や経験を棚卸しして、発信ジャンルを1つに絞るのがコツです'],
      '導線設計中':     ['🔗 導線が整うと集客が自動化されます。まず1本の導線を完成させることを目標に', '📊 LINE登録率・クリック率を意識して設計すると収益に直結します'],
      '発信実践中':     ['📣 発信を続けることが信頼につながります。週3回以上の投稿を目指しましょう', '🎁 無料プレゼントの質を上げるとLINE登録率が上がり、収益チャンスが増えます'],
      '反応確認中':     ['📊 反応データを見て「何が刺さるか」を分析しましょう。数字が上がらなくても継続が大事', '💬 フォロワーとの交流を増やすと信頼度が上がり案件が決まりやすくなります'],
      '改善中':         ['🔧 改善のサイクルを回すほど収益が安定します。A/Bテストを意識して変化させましょう', '📈 小さな改善を積み重ねる人が最終的に大きな成果を出します'],
      '成果検証中':     ['🏆 成果を数値で記録しておくと、自己ブランディングや次の案件交渉に使えます', '🚀 ここまで来たら「再現性」を意識して、同じ成果を繰り返せる仕組みを作りましょう'],
    }
    return adviceMap[stage] ?? ['📝 現在のステージでできることを1つずつ丁寧に進めていきましょう']
  }, [profile.current_stage])

  if (allMyCheckins.length === 0) return null

  return (
    <div className="space-y-4 mt-2">
      {/* セクションタイトル */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs font-bold text-stone-400 px-2">📊 あなたの実践分析</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      {/* ─ レーダーチャート ─ */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-stone-700">🕸️ 講座別 取り組みレーダー</h2>
          {genMemberIds.length > 0 && (
            <span className="text-[10px] text-stone-400">点線＝同期生平均</span>
          )}
        </div>
        <p className="text-[10px] text-stone-400 mb-2">広いほどバランスよく取り組めています</p>
        <MemberRadarChart myData={myCatCount} genData={genCatCount} />
        {genMemberIds.length > 0 && (
          <div className="flex items-center gap-4 justify-center mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-stone-500">あなた</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0 border-t-2 border-dashed border-blue-400" />
              <span className="text-[10px] text-stone-500">同期生平均</span>
            </div>
          </div>
        )}
      </Card>

      {/* ─ 褒めポイント ─ */}
      <Card>
        <h2 className="text-sm font-bold text-emerald-700 mb-3">🌟 できていること・続けられていること</h2>
        <div className="space-y-2">
          {praisePoints.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-emerald-50 rounded-xl px-3 py-2.5">
              <span className="text-base leading-none mt-0.5">{p.split(' ')[0]}</span>
              <p className="text-xs text-emerald-800 leading-relaxed">{p.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ─ 見直しポイント ─ */}
      <Card>
        <h2 className="text-sm font-bold text-amber-700 mb-3">🔍 見直してみるといいこと</h2>
        <div className="space-y-2">
          {improvePoints.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-amber-50 rounded-xl px-3 py-2.5">
              <span className="text-base leading-none mt-0.5">{p.split(' ')[0]}</span>
              <p className="text-xs text-amber-900 leading-relaxed">{p.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
        {myStuckItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-bold text-stone-600 mb-2">最近のつまずき</p>
            <div className="space-y-1.5">
              {myStuckItems.slice(0, 2).map(item => (
                <div key={item.id} className="bg-red-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-stone-400">{item.date}</span>
                    <span className="text-[10px] text-stone-500">{item.category}</span>
                  </div>
                  <p className="text-xs text-stone-700">{item.stuck_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ─ 収益化アドバイス ─ */}
      <Card>
        <h2 className="text-sm font-bold text-purple-700 mb-1">💰 収益化・やる気を保つために</h2>
        {profile.current_stage && (
          <p className="text-[10px] text-stone-400 mb-3">現在のステージ：{profile.current_stage}</p>
        )}
        <div className="space-y-2">
          {revenueAdvice.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-purple-50 rounded-xl px-3 py-2.5">
              <span className="text-base leading-none mt-0.5">{p.split(' ')[0]}</span>
              <p className="text-xs text-purple-900 leading-relaxed">{p.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
        {/* やる気維持ヒント */}
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-xs font-bold text-stone-600 mb-2">💡 やる気を維持するコツ</p>
          <div className="space-y-1.5 text-xs text-stone-600">
            <p>✅ 「完璧にやる」より「毎日少しやる」を優先しましょう</p>
            <p>✅ 成果報告は小さなものでも積極的に投稿！自信につながります</p>
            <p>✅ つまずいたらすぐ質問。一人で抱えないことが継続の秘訣です</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
