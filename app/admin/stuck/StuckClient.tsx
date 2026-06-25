'use client'

import { useState, useMemo } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { CATEGORIES } from '@/types/database'

// ─── 型 ─────────────────────────────────────────────────────
type Item = {
  id: string
  date: string
  category: string
  stuck_text?: string | null
  mood: string
  profiles: { name: string; generation: string | null } | null
}

interface Props {
  items: Item[]          // 過去30日・stuck_textあり
  allItems: Item[]       // 全期間・stuck_textあり（集計用）
  allCheckins30: { date: string; category: string }[]
}

// ─── カテゴリ色 ──────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'スタート講座':       '#f59e0b',
  'アフィリエイト講座': '#10b981',
  '投稿作成':           '#3b82f6',
  '導線作成':           '#8b5cf6',
  '案件選定':           '#ef4444',
  '無料プレゼント作成': '#ec4899',
  '今日はできなかった': '#9ca3af',
  'その他':             '#6b7280',
}

const MOOD_COLOR: Record<string, string> = {
  '順調':           '#10b981',
  '少し止まった':   '#f59e0b',
  '質問したい':     '#3b82f6',
  '励ましがほしい': '#f97316',
  '個別相談が必要かも': '#ef4444',
}

// ─── SVG レーダーチャート ────────────────────────────────────
function RadarChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  const cx = 120, cy = 120, r = 90
  const n = data.length
  if (n === 0) return null

  const points = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const ratio = d.max > 0 ? d.value / d.max : 0
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
      lx: cx + (r + 24) * Math.cos(angle),
      ly: cy + (r + 24) * Math.sin(angle),
      angle,
      ...d,
    }
  })

  // グリッド線（25% / 50% / 75% / 100%）
  const grids = [0.25, 0.5, 0.75, 1.0]
  const gridPolygons = grids.map(ratio => {
    const pts = data.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      return `${cx + r * ratio * Math.cos(angle)},${cy + r * ratio * Math.sin(angle)}`
    })
    return pts.join(' ')
  })

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-xs mx-auto">
      {/* グリッド */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e7e5e4" strokeWidth="1" />
      ))}
      {/* 軸線 */}
      {data.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="#e7e5e4" strokeWidth="1"
          />
        )
      })}
      {/* データ面 */}
      <polygon points={polyPoints} fill="rgba(217,119,6,0.25)" stroke="#d97706" strokeWidth="2" />
      {/* データ点 */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#d97706" />
      ))}
      {/* ラベル */}
      {points.map((p, i) => {
        const anchor = p.lx < cx - 5 ? 'end' : p.lx > cx + 5 ? 'start' : 'middle'
        const shortLabel = p.label.length > 6 ? p.label.slice(0, 6) + '…' : p.label
        return (
          <g key={i}>
            <text x={p.lx} y={p.ly - 4} textAnchor={anchor} fontSize="9" fill="#57534e" fontWeight="600">
              {shortLabel}
            </text>
            <text x={p.lx} y={p.ly + 7} textAnchor={anchor} fontSize="9" fill="#d97706" fontWeight="700">
              {p.value}件
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── SVG 折れ線グラフ ─────────────────────────────────────────
function LineChart({ data }: { data: { label: string; count: number }[] }) {
  const w = 320, h = 100, padL = 28, padR = 12, padT = 12, padB = 24
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const max = Math.max(...data.map(d => d.count), 1)

  const pts = data.map((d, i) => ({
    x: padL + (innerW / (data.length - 1)) * i,
    y: padT + innerH - (innerH * d.count / max),
    ...d,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')

  // 塗りつぶし用パス
  const fillPath = `M${pts[0].x},${padT + innerH} ` +
    pts.map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length - 1].x},${padT + innerH} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* Y軸グリッド */}
      {[0, 0.5, 1].map((r, i) => {
        const y = padT + innerH - innerH * r
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f5f5f4" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#a8a29e">
              {Math.round(max * r)}
            </text>
          </g>
        )
      })}
      {/* 塗りつぶし */}
      <path d={fillPath} fill="rgba(217,119,6,0.12)" />
      {/* 折れ線 */}
      <polyline points={polyline} fill="none" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
      {/* 点 */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#d97706" />
          {p.count > 0 && (
            <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="#92400e" fontWeight="700">
              {p.count}
            </text>
          )}
          <text x={p.x} y={h - 6} textAnchor="middle" fontSize="8" fill="#a8a29e">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── 縦棒グラフ（期別比較） ───────────────────────────────────
function GroupedBar({ generations, data }: {
  generations: string[]
  data: Record<string, Record<string, number>>  // category -> generation -> count
}) {
  const categories = Object.keys(data).slice(0, 6)
  if (categories.length === 0) return <p className="text-xs text-stone-400 text-center py-6">データなし</p>

  const maxVal = Math.max(...categories.flatMap(cat =>
    generations.map(g => data[cat]?.[g] ?? 0)
  ), 1)

  const barW = 12, gap = 2
  const groupW = generations.length * (barW + gap) + 8
  const chartW = categories.length * groupW + 40
  const chartH = 120
  const padB = 32, padL = 24, padT = 10

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartW + padL} ${chartH + padB + padT}`} className="min-w-[320px] w-full">
        {/* Y軸グリッド */}
        {[0, 0.5, 1].map((r, i) => {
          const y = padT + chartH - chartH * r
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={chartW + padL} y2={y} stroke="#f5f5f4" strokeWidth="1" />
              <text x={padL - 3} y={y + 3} textAnchor="end" fontSize="8" fill="#a8a29e">
                {Math.round(maxVal * r)}
              </text>
            </g>
          )
        })}
        {/* バー */}
        {categories.map((cat, ci) => {
          const gx = padL + ci * groupW + 4
          return (
            <g key={cat}>
              {generations.map((gen, gi) => {
                const val = data[cat]?.[gen] ?? 0
                const barH = (val / maxVal) * chartH
                const x = gx + gi * (barW + gap)
                const y = padT + chartH - barH
                const color = Object.values(CAT_COLORS)[ci % 8]
                const opacity = 0.5 + (gi / Math.max(generations.length - 1, 1)) * 0.5
                return (
                  <g key={gen}>
                    <rect x={x} y={y} width={barW} height={Math.max(barH, 1)}
                      fill={color} opacity={opacity} rx="2" />
                    {val > 0 && (
                      <text x={x + barW / 2} y={y - 2} textAnchor="middle" fontSize="7" fill="#57534e" fontWeight="700">
                        {val}
                      </text>
                    )}
                  </g>
                )
              })}
              {/* カテゴリラベル */}
              <text
                x={gx + (generations.length * (barW + gap)) / 2}
                y={padT + chartH + 14}
                textAnchor="middle" fontSize="8" fill="#78716c"
              >
                {cat.length > 5 ? cat.slice(0, 5) + '…' : cat}
              </text>
            </g>
          )
        })}
      </svg>
      {/* 凡例 */}
      <div className="flex flex-wrap gap-2 mt-2 px-1">
        {generations.map((gen, i) => (
          <div key={gen} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ opacity: 0.5 + (i / Math.max(generations.length - 1, 1)) * 0.5, background: '#d97706' }} />
            <span className="text-[10px] text-stone-500">{gen}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── メインコンポーネント ────────────────────────────────────
export default function StuckClient({ items, allItems, allCheckins30 }: Props) {
  const [tab, setTab] = useState<'overview' | 'timeline' | 'list'>('overview')

  // ── カテゴリ別集計 ──
  const categoryCount = useMemo(() => {
    return allItems.reduce((acc, item) => {
      if (item.category !== '今日はできなかった') {
        acc[item.category] = (acc[item.category] ?? 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
  }, [allItems])

  const sortedCategories = useMemo(() =>
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1]),
    [categoryCount]
  )
  const maxCatCount = sortedCategories[0]?.[1] ?? 1

  // ── レーダーチャート用 ──
  const radarData = useMemo(() => {
    const cats = ['スタート講座', 'アフィリエイト講座', '投稿作成', '導線作成', '案件選定', '無料プレゼント作成', 'その他']
    const maxVal = Math.max(...cats.map(c => categoryCount[c] ?? 0), 1)
    return cats.map(cat => ({
      label: cat,
      value: categoryCount[cat] ?? 0,
      max: maxVal,
    }))
  }, [categoryCount])

  // ── つまずき率（過去30日・カテゴリ別） ──
  const stuckRateData = useMemo(() => {
    const checkinCatCount = allCheckins30.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryCount)
      .filter(([cat]) => cat !== '今日はできなかった')
      .map(([cat, stuckCnt]) => {
        const total = checkinCatCount[cat] ?? 0
        const rate = total > 0 ? Math.round((stuckCnt / total) * 100) : 0
        return { cat, stuckCnt, total, rate }
      })
      .sort((a, b) => b.rate - a.rate)
  }, [categoryCount, allCheckins30])

  // ── 時系列（過去14日） ──
  const timelineData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const count = items.filter(it => it.date === dateStr).length
      return { label: format(d, 'M/d'), count }
    })
  }, [items])

  // ── 気分別集計 ──
  const moodCount = useMemo(() => {
    return allItems.reduce((acc, item) => {
      acc[item.mood] = (acc[item.mood] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [allItems])
  const totalMood = Object.values(moodCount).reduce((a, b) => a + b, 0)

  // ── 期別比較 ──
  const generations = useMemo(() => {
    const gens = new Set(allItems.map(it => (it.profiles as any)?.generation).filter(Boolean))
    return Array.from(gens).sort() as string[]
  }, [allItems])

  const genCatData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {}
    allItems.forEach(item => {
      const gen = (item.profiles as any)?.generation
      if (!gen || item.category === '今日はできなかった') return
      if (!data[item.category]) data[item.category] = {}
      data[item.category][gen] = (data[item.category][gen] ?? 0) + 1
    })
    return data
  }, [allItems])

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-stone-800">📊 つまずき分析</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          過去30日 {items.length}件 ／ 全期間 {allItems.length}件
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {([
          { key: 'overview', label: '📊 概要' },
          { key: 'timeline', label: '📈 時系列' },
          { key: 'list',     label: '📋 一覧' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${
              tab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 概要タブ ── */}
      {tab === 'overview' && (
        <div className="space-y-4">

          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card text-center">
              <div className="text-2xl font-black text-amber-700">{allItems.length}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">全期間つまずき</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-2xl font-black text-blue-600">{items.length}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">過去30日</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-2xl font-black text-emerald-600">
                {sortedCategories[0]?.[0]?.slice(0, 4) ?? '—'}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">最多講座</div>
            </div>
          </div>

          {/* レーダーチャート */}
          <Card>
            <h2 className="text-sm font-bold text-stone-700 mb-1">🕸️ 講座別つまずきレーダー</h2>
            <p className="text-[10px] text-stone-400 mb-3">面積が広いほどつまずきが多い講座</p>
            <RadarChart data={radarData} />
          </Card>

          {/* つまずき率ランキング */}
          <Card>
            <h2 className="text-sm font-bold text-stone-700 mb-3">🔥 つまずき率ランキング（過去30日）</h2>
            <p className="text-[10px] text-stone-400 mb-3">チェックインのうちつまずきを報告した割合</p>
            <div className="space-y-2.5">
              {stuckRateData.slice(0, 6).map(({ cat, stuckCnt, total, rate }, i) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-400 w-4">{i + 1}</span>
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: CAT_COLORS[cat] ?? '#9ca3af' }} />
                      <span className="text-xs text-stone-700">{cat}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-stone-800">{rate}%</span>
                      <span className="text-[10px] text-stone-400 ml-1">({stuckCnt}/{total})</span>
                    </div>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${rate}%`,
                        background: rate >= 50 ? '#ef4444' : rate >= 30 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 気分分布ドーナツ風 */}
          <Card>
            <h2 className="text-sm font-bold text-stone-700 mb-3">😰 つまずき時の気分分布</h2>
            <div className="space-y-2">
              {Object.entries(moodCount).sort((a, b) => b[1] - a[1]).map(([mood, cnt]) => {
                const pct = totalMood > 0 ? Math.round((cnt / totalMood) * 100) : 0
                return (
                  <div key={mood} className="flex items-center gap-2">
                    <span className="text-xs text-stone-600 w-28 flex-shrink-0 truncate">{mood}</span>
                    <div className="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(pct, 8)}%`, background: MOOD_COLOR[mood] ?? '#9ca3af' }}
                      >
                        <span className="text-[9px] text-white font-bold">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-stone-500 w-8 text-right">{cnt}件</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 期別比較 */}
          {generations.length >= 2 && (
            <Card>
              <h2 className="text-sm font-bold text-stone-700 mb-1">👥 期別つまずき比較</h2>
              <p className="text-[10px] text-stone-400 mb-3">濃いバーほど期が新しい</p>
              <GroupedBar generations={generations} data={genCatData} />
            </Card>
          )}
        </div>
      )}

      {/* ── 時系列タブ ── */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-bold text-stone-700 mb-1">📈 過去14日のつまずき件数</h2>
            <p className="text-[10px] text-stone-400 mb-3">日別のつまずき報告数の推移</p>
            <LineChart data={timelineData} />
          </Card>

          {/* カテゴリ別ランキング */}
          <Card>
            <h2 className="text-sm font-bold text-stone-700 mb-3">📊 講座別つまずき数（全期間）</h2>
            <div className="space-y-2">
              {sortedCategories.map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: CAT_COLORS[cat] ?? '#9ca3af' }} />
                      <span className="text-xs text-stone-700">{cat}</span>
                    </div>
                    <span className="text-xs font-bold text-stone-800">{count}件</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / maxCatCount) * 100}%`,
                        background: CAT_COLORS[cat] ?? '#9ca3af'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── 一覧タブ ── */}
      {tab === 'list' && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-10">過去30日のつまずきデータはありません</p>
          ) : (
            items.map(item => (
              <Card key={item.id} padding="sm">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-700">
                    {(item.profiles as any)?.name}
                  </span>
                  {(item.profiles as any)?.generation && (
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                      {(item.profiles as any).generation}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: (CAT_COLORS[item.category] ?? '#9ca3af') + '22', color: CAT_COLORS[item.category] ?? '#9ca3af' }}>
                    {item.category}
                  </span>
                  <span className="text-[10px] text-stone-400 ml-auto">{item.date}</span>
                </div>
                <p className="text-sm text-stone-800 bg-stone-50 rounded-xl p-3 leading-relaxed">
                  {item.stuck_text}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] text-stone-400">気分:</span>
                  <span className="text-[10px]" style={{ color: MOOD_COLOR[item.mood] ?? '#9ca3af' }}>
                    {item.mood}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
