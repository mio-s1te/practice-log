'use client'

import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Users, AlertCircle, MessageSquare, Heart, Star, ChevronRight, TrendingUp } from 'lucide-react'
import type { Profile } from '@/types/database'
import { MOOD_COLORS, MOOD_EMOJI } from '@/types/database'
import { formatDate } from '@/lib/utils'

interface Props {
  profile: Profile
  members: Profile[]
  activeMembers: Profile[]
  todayCheckins: { user_id: string; mood: string; has_question: boolean }[]
  notReportedToday: Profile[]
  openQuestions: any[]
  encourageNeeded: any[]
  recentAchievements: any[]
  generations: string[]
  allCheckins?: { date: string; mood: string }[]
}

export function AdminDashboardClient({
  profile,
  members,
  activeMembers,
  todayCheckins,
  notReportedToday,
  openQuestions,
  encourageNeeded,
  recentAchievements,
  generations,
  allCheckins = [],
}: Props) {
  const isAdmin = profile.role === 'admin'
  const today = format(new Date(), 'yyyy年M月d日（EEEE）', { locale: ja })
  const reportRate = activeMembers.length > 0
    ? Math.round((todayCheckins.length / activeMembers.length) * 100)
    : 0

  const questionCount = openQuestions.filter((q) =>
    !q.question_statuses || q.question_statuses?.status === '未対応'
  ).length

  // 過去7日間の日別チェックイン数を集計
  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const label = format(d, 'M/d')
    const count = allCheckins.filter(c => c.date === dateStr).length
    return { label, count, dateStr }
  })
  const maxCount = Math.max(...last7days.map(d => d.count), 1)

  // 気分別集計（今日）
  const moodCounts = todayCheckins.reduce((acc, c) => {
    acc[c.mood] = (acc[c.mood] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const moodEntries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div>
        <p className="text-sm text-stone-500">{today}</p>
        <h1 className="text-xl font-bold text-stone-800 mt-0.5">管理ダッシュボード</h1>
      </div>

      {/* 要対応バナー */}
      {(questionCount > 0 || encourageNeeded.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-800 mb-2">🚨 要対応</p>
          <div className="flex flex-wrap gap-2">
            {questionCount > 0 && (
              <Link href="/admin/questions" className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-50 flex items-center gap-1">
                ❓ 未対応の質問 {questionCount}件
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
            {encourageNeeded.length > 0 && (
              <Link href="/admin/encourage" className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-50 flex items-center gap-1">
                💛 励まし希望 {encourageNeeded.length}件
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 統計グリッド */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-stone-400" />
            <span className="text-xs text-stone-500">受講中メンバー</span>
          </div>
          <div className="text-2xl font-black text-stone-800">{activeMembers.length}</div>
          <div className="text-xs text-stone-400 mt-0.5">全{members.length}名中</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-stone-500">今日の報告率</span>
          </div>
          <div className={`text-2xl font-black ${reportRate >= 70 ? 'text-green-600' : reportRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
            {reportRate}%
          </div>
          <div className="text-xs text-stone-400 mt-0.5">{todayCheckins.length}/{activeMembers.length}名報告</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-stone-500">今日の未報告</span>
          </div>
          <Link href="/admin/members?filter=not_today" className="group">
            <div className={`text-2xl font-black ${notReportedToday.length > 5 ? 'text-red-500' : 'text-stone-800'} group-hover:text-amber-700`}>
              {notReportedToday.length}
            </div>
          </Link>
          <div className="text-xs text-stone-400 mt-0.5">名</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-stone-500">未対応の質問</span>
          </div>
          <Link href="/admin/questions" className="group">
            <div className={`text-2xl font-black ${questionCount > 0 ? 'text-red-500' : 'text-stone-800'} group-hover:text-amber-700`}>
              {questionCount}
            </div>
          </Link>
          <div className="text-xs text-stone-400 mt-0.5">件</div>
        </div>
      </div>

      {/* 今日の状態分布 */}
      {todayCheckins.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold text-stone-700 mb-3">今日のメンバーの状態</h2>
          <div className="space-y-2">
            {(['順調', '少し止まった', '質問したい', '励ましがほしい', '個別相談が必要かも'] as const).map((mood) => {
              const count = todayCheckins.filter((c) => c.mood === mood).length
              if (count === 0) return null
              return (
                <div key={mood} className="flex items-center gap-3">
                  <span className="text-xs w-28 text-stone-600">{MOOD_EMOJI[mood]} {mood}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${(count / todayCheckins.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-stone-700 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 📊 過去7日間 SVG棒グラフ */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold text-stone-800">過去7日間のチェックイン数</h2>
        </div>
        {(() => {
          const W = 320, H = 110, padL = 24, padR = 8, padT = 16, padB = 22
          const innerW = W - padL - padR
          const innerH = H - padT - padB
          const barW = innerW / last7days.length
          const todayStr = format(new Date(), 'yyyy-MM-dd')
          return (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              {/* グリッド線 */}
              {[0, 0.5, 1].map((r, i) => {
                const y = padT + innerH - innerH * r
                return (
                  <g key={i}>
                    <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f5f5f4" strokeWidth="1" />
                    <text x={padL - 3} y={y + 3} textAnchor="end" fontSize="8" fill="#d6d3d1">
                      {Math.round(maxCount * r)}
                    </text>
                  </g>
                )
              })}
              {/* バー */}
              {last7days.map((d, i) => {
                const isToday = d.dateStr === todayStr
                const barH = maxCount > 0 ? (d.count / maxCount) * innerH : 0
                const x = padL + i * barW + barW * 0.15
                const bw = barW * 0.7
                const y = padT + innerH - barH
                return (
                  <g key={d.label}>
                    <defs>
                      <linearGradient id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isToday ? '#fbbf24' : '#c4b5fd'} />
                        <stop offset="100%" stopColor={isToday ? '#d97706' : '#7c3aed'} />
                      </linearGradient>
                    </defs>
                    <rect
                      x={x} y={d.count > 0 ? y : padT + innerH - 2}
                      width={bw} height={Math.max(barH, 2)}
                      fill={d.count > 0 ? `url(#bar-${i})` : '#e7e5e4'}
                      rx="3"
                    />
                    {d.count > 0 && (
                      <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize="9" fill={isToday ? '#92400e' : '#5b21b6'} fontWeight="700">
                        {d.count}
                      </text>
                    )}
                    <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize="9"
                      fill={isToday ? '#d97706' : '#a8a29e'} fontWeight={isToday ? '700' : '400'}>
                      {d.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          )
        })()}
        <div className="flex justify-center gap-4 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ background: 'linear-gradient(#fbbf24,#d97706)' }} />
            <span className="text-[10px] text-stone-400">今日</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ background: 'linear-gradient(#c4b5fd,#7c3aed)' }} />
            <span className="text-[10px] text-stone-400">過去6日</span>
          </div>
        </div>
      </Card>

      {/* 🎭 今日の気分分布 */}
      {todayCheckins.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold text-stone-800 mb-3">😊 今日の気分分布</h2>
          <div className="space-y-2">
            {moodEntries.map(([mood, cnt]) => {
              const pct = Math.round((cnt / todayCheckins.length) * 100)
              return (
                <div key={mood} className="flex items-center gap-2">
                  <span className="text-xs text-stone-600 w-24 flex-shrink-0">
                    {MOOD_EMOJI[mood as keyof typeof MOOD_EMOJI] ?? '😐'} {mood}
                  </span>
                  <div className="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: mood === '絶好調' ? '#10b981' :
                          mood === '順調' ? '#60a5fa' :
                          mood === '励ましがほしい' ? '#fbbf24' :
                          mood === 'しんどい' ? '#f87171' : '#a78bfa'
                      }}
                    />
                  </div>
                  <span className="text-xs text-stone-500 w-10 text-right">{cnt}名 ({pct}%)</span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-stone-400 mt-3">本日チェックイン済み {todayCheckins.length}名</p>
        </Card>
      )}

      {/* 未報告者 */}
      {notReportedToday.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">
              <AlertCircle className="h-4 w-4 inline mr-1 text-orange-400" />
              今日の未報告者
            </h2>
            <Link href="/admin/members?filter=not_today" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
              全員を見る <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {notReportedToday.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-stone-50 rounded-xl transition-colors"
              >
                <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-xs font-bold text-stone-600">
                  {(m.name || '?')[0]}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-stone-700">{m.name}</span>
                  {m.generation && (
                    <span className="text-xs text-stone-400 ml-2">{m.generation}</span>
                  )}
                </div>
                <Badge variant="warning" size="sm">{m.current_stage}</Badge>
              </Link>
            ))}
            {notReportedToday.length > 5 && (
              <p className="text-xs text-stone-400 text-center pt-1">他{notReportedToday.length - 5}名</p>
            )}
          </div>
        </Card>
      )}

      {/* 最近の質問 */}
      {openQuestions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">
              <MessageSquare className="h-4 w-4 inline mr-1 text-blue-400" />
              最近の質問
            </h2>
            <Link href="/admin/questions" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
              全件見る <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {openQuestions.map((q: any) => (
              <div key={q.id} className="border-b border-stone-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-stone-700">{q.profiles?.name}</span>
                  {q.profiles?.generation && (
                    <span className="text-xs text-stone-400">{q.profiles.generation}</span>
                  )}
                  <span className="text-xs text-stone-400">{formatDate(q.date, 'M/d')}</span>
                  {q.question_statuses?.status && (
                    <Badge size="sm" variant={q.question_statuses.status === '未対応' ? 'danger' : 'default'}>
                      {q.question_statuses.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-stone-600 line-clamp-2">{q.question_text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 最近の成果報告 */}
      {recentAchievements.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-700">
              <Star className="h-4 w-4 inline mr-1 text-yellow-500" />
              最近の成果報告
            </h2>
            <Link href="/admin/achievements" className="text-xs text-amber-700 hover:underline flex items-center gap-0.5">
              全件見る <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentAchievements.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 py-2 border-b border-stone-50 last:border-0">
                <span>⭐</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-stone-700">{a.profiles?.name}</span>
                    <span className="text-xs text-stone-400">{formatDate(a.date, 'M/d')}</span>
                  </div>
                  <p className="text-xs text-stone-600">{a.achievement_text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* クイックリンク */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/admin/members', label: 'メンバー管理', icon: '👥', adminOnly: false },
          { href: '/admin/questions', label: '質問一覧', icon: '❓', adminOnly: false },
          { href: '/admin/encourage', label: '励まし希望', icon: '💛', adminOnly: false },
          { href: '/admin/stuck', label: 'つまずき分析', icon: '🤔', adminOnly: false },
          { href: '/admin/achievements', label: '成果報告', icon: '⭐', adminOnly: false },
          { href: '/admin/generations', label: '期生別', icon: '📊', adminOnly: false },
          { href: '/admin/staff', label: 'スタッフ管理', icon: '🛠️', adminOnly: true },
        ]
          .filter(link => !link.adminOnly || isAdmin)
          .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-stone-100 rounded-2xl p-4 flex items-center gap-3 hover:border-amber-200 hover:bg-amber-50 transition-all"
          >
            <span className="text-xl">{link.icon}</span>
            <span className="text-sm font-medium text-stone-700">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
