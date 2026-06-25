'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
  user_id?: string
  profiles: { name: string; generation: string | null } | null
}

type Member = {
  id: string
  name: string
  generation: string | null
}

interface Props {
  items: Item[]          // 過去30日・stuck_textあり
  allItems: Item[]       // 全期間・stuck_textあり（集計用）
  allCheckins30: { date: string; category: string; user_id?: string }[]
  members?: Member[]     // メンバー一覧（個人フィルター用）
  allCheckinsForGen?: { date: string; category: string; mood: string; user_id: string }[]
  generationList?: string[]
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
  // viewBox を広げてラベルが確実に収まるようにする
  const vw = 320, vh = 320
  const cx = vw / 2, cy = vh / 2
  const r = 100  // チャート半径
  const labelOffset = 38  // ラベルを軸端からさらに離す距離
  const n = data.length
  if (n === 0) return null

  const points = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const ratio = d.max > 0 ? d.value / d.max : 0
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
      lx: cx + (r + labelOffset) * Math.cos(angle),
      ly: cy + (r + labelOffset) * Math.sin(angle),
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
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full max-w-sm mx-auto">
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
      {/* ラベル：ラベルが長い場合は2行に分割 */}
      {points.map((p, i) => {
        const anchor = p.lx < cx - 8 ? 'end' : p.lx > cx + 8 ? 'start' : 'middle'
        // 6文字超は前半・後半の2行表示
        const label = p.label
        const line1 = label.length > 6 ? label.slice(0, Math.ceil(label.length / 2)) : label
        const line2 = label.length > 6 ? label.slice(Math.ceil(label.length / 2)) : null
        return (
          <g key={i}>
            <text x={p.lx} y={p.ly - (line2 ? 6 : 3)} textAnchor={anchor} fontSize="10" fill="#57534e" fontWeight="600">
              {line1}
            </text>
            {line2 && (
              <text x={p.lx} y={p.ly + 8} textAnchor={anchor} fontSize="10" fill="#57534e" fontWeight="600">
                {line2}
              </text>
            )}
            <text x={p.lx} y={p.ly + (line2 ? 22 : 12)} textAnchor={anchor} fontSize="10" fill="#d97706" fontWeight="700">
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
export default function StuckClient({
  items, allItems, allCheckins30, members = [],
  allCheckinsForGen = [], generationList = [],
}: Props) {
  const [tab, setTab] = useState<'overview' | 'timeline' | 'list'>('overview')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all')

  // 選択中メンバーでフィルター
  const filteredItems = useMemo(() =>
    selectedMemberId === 'all' ? items : items.filter(i => i.user_id === selectedMemberId)
  , [items, selectedMemberId])

  const filteredAllItems = useMemo(() =>
    selectedMemberId === 'all' ? allItems : allItems.filter(i => i.user_id === selectedMemberId)
  , [allItems, selectedMemberId])

  const filteredCheckins30 = useMemo(() =>
    selectedMemberId === 'all' ? allCheckins30 : allCheckins30.filter(i => i.user_id === selectedMemberId)
  , [allCheckins30, selectedMemberId])

  const selectedMember = members.find(m => m.id === selectedMemberId)

  // ── カテゴリ別集計 ──
  const categoryCount = useMemo(() => {
    return filteredAllItems.reduce((acc, item) => {
      if (item.category !== '今日はできなかった') {
        acc[item.category] = (acc[item.category] ?? 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
  }, [filteredAllItems])

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
    const checkinCatCount = filteredCheckins30.reduce((acc, c) => {
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
  }, [categoryCount, filteredCheckins30])

  // ── 時系列（過去14日） ──
  const timelineData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const count = filteredItems.filter(it => it.date === dateStr).length
      return { label: format(d, 'M/d'), count }
    })
  }, [filteredItems])

  // ── 気分別集計 ──
  const moodCount = useMemo(() => {
    return filteredAllItems.reduce((acc, item) => {
      acc[item.mood] = (acc[item.mood] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [filteredAllItems])
  const totalMood = Object.values(moodCount).reduce((a, b) => a + b, 0)

  // ── 期別比較 ──
  const generations = useMemo(() => {
    const gens = new Set(filteredAllItems.map(it => (it.profiles as any)?.generation).filter(Boolean))
    return Array.from(gens).sort() as string[]
  }, [filteredAllItems])

  const genCatData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {}
    filteredAllItems.forEach(item => {
      const gen = (item.profiles as any)?.generation
      if (!gen || item.category === '今日はできなかった') return
      if (!data[item.category]) data[item.category] = {}
      data[item.category][gen] = (data[item.category][gen] ?? 0) + 1
    })
    return data
  }, [filteredAllItems])

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-stone-800">📊 つまずき分析</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {selectedMemberId === 'all'
            ? `全体 ／ 過去30日 ${filteredItems.length}件 ／ 全期間 ${filteredAllItems.length}件`
            : `${selectedMember?.name ?? ''} ／ 過去30日 ${filteredItems.length}件 ／ 全期間 ${filteredAllItems.length}件`
          }
        </p>
      </div>

      {/* メンバー絞り込み */}
      {members.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-stone-600">👤 メンバーで絞り込み</p>
            {selectedMemberId !== 'all' && (
              <Link
                href={`/admin/members/${selectedMemberId}`}
                className="text-xs text-amber-700 hover:underline flex items-center gap-0.5"
              >
                詳細ページへ →
              </Link>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedMemberId('all')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedMemberId === 'all'
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
              }`}
            >
              全体
            </button>
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  selectedMemberId === m.id
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
                }`}
              >
                {m.name}{m.generation ? ` (${m.generation})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

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
              <div className="text-2xl font-black text-amber-700">{filteredAllItems.length}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">全期間つまずき</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-2xl font-black text-blue-600">{filteredItems.length}</div>
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
          {filteredItems.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-10">過去30日のつまずきデータはありません</p>
          ) : (
            filteredItems.map(item => (
              <Card key={item.id} padding="sm">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Link
                    href={`/admin/members/${item.user_id}`}
                    className="text-sm font-medium text-amber-800 hover:underline"
                  >
                    {(item.profiles as any)?.name}
                  </Link>
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

      {/* ── 個人分析カード（メンバー選択時のみ） ── */}
      {selectedMemberId !== 'all' && selectedMember && (
        <MemberInsightCards
          selectedMember={selectedMember}
          filteredAllItems={filteredAllItems}
          filteredItems={filteredItems}
          allCheckinsForGen={allCheckinsForGen}
          members={members}
          generationList={generationList}
        />
      )}
    </div>
  )
}

// ─── 管理者向け個人分析カード ────────────────────────────────
const CAT_RADAR_KEYS = [
  'スタート講座', 'アフィリエイト講座', '投稿作成',
  '導線作成', '案件選定', '無料プレゼント作成', 'その他',
] as const

function AdminRadarChart({
  myData, sameGenData, prevGenData,
}: {
  myData: Record<string, number>
  sameGenData?: Record<string, number>
  prevGenData?: Record<string, number>
}) {
  const vw = 320, vh = 320, cx = 160, cy = 160, r = 100, n = CAT_RADAR_KEYS.length
  const maxVal = Math.max(
    ...CAT_RADAR_KEYS.map(c => Math.max(myData[c] ?? 0, sameGenData?.[c] ?? 0, prevGenData?.[c] ?? 0)),
    1
  )
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  })
  const lpt = (i: number) => ({ lx: cx + (r + 42) * Math.cos(angle(i)), ly: cy + (r + 42) * Math.sin(angle(i)) })
  const grids = [0.25, 0.5, 0.75, 1.0]
  const myPts = CAT_RADAR_KEYS.map((c, i) => pt(i, (myData[c] ?? 0) / maxVal))
  const sgPts = sameGenData ? CAT_RADAR_KEYS.map((c, i) => pt(i, (sameGenData[c] ?? 0) / maxVal)) : null
  const pgPts = prevGenData ? CAT_RADAR_KEYS.map((c, i) => pt(i, (prevGenData[c] ?? 0) / maxVal)) : null

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full max-w-sm mx-auto">
      {grids.map((ratio, gi) => (
        <polygon key={gi}
          points={CAT_RADAR_KEYS.map((_, i) => `${pt(i, ratio).x},${pt(i, ratio).y}`).join(' ')}
          fill="none" stroke="#e7e5e4" strokeWidth="1" />
      ))}
      {CAT_RADAR_KEYS.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt(i, 1).x} y2={pt(i, 1).y} stroke="#e7e5e4" strokeWidth="1" />
      ))}
      {pgPts && (
        <polygon
          points={pgPts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(167,139,250,0.12)" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="3,3" />
      )}
      {sgPts && (
        <polygon
          points={sgPts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(96,165,250,0.15)" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,2" />
      )}
      <polygon
        points={myPts.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(217,119,6,0.25)" stroke="#d97706" strokeWidth="2" />
      {myPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#d97706" />)}
      {CAT_RADAR_KEYS.map((cat, i) => {
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

function MemberInsightCards({
  selectedMember, filteredAllItems, filteredItems, allCheckinsForGen, members, generationList,
}: {
  selectedMember: Member
  filteredAllItems: Item[]
  filteredItems: Item[]
  allCheckinsForGen: { date: string; category: string; mood: string; user_id: string }[]
  members: Member[]
  generationList: string[]
}) {
  const memberGen = selectedMember.generation

  const myCatCount = useMemo(() =>
    allCheckinsForGen
      .filter(c => c.user_id === selectedMember.id && c.category !== '今日はできなかった')
      .reduce((acc, c) => { acc[c.category] = (acc[c.category] ?? 0) + 1; return acc }, {} as Record<string, number>)
  , [allCheckinsForGen, selectedMember.id])

  const sameGenAvg = useMemo(() => {
    const sameMembers = members.filter(m => m.generation === memberGen && m.id !== selectedMember.id)
    if (sameMembers.length === 0) return undefined
    const sameIds = new Set(sameMembers.map(m => m.id))
    const totals = allCheckinsForGen
      .filter(c => sameIds.has(c.user_id) && c.category !== '今日はできなかった')
      .reduce((acc, c) => { acc[c.category] = (acc[c.category] ?? 0) + 1; return acc }, {} as Record<string, number>)
    return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v / sameMembers.length)]))
  }, [allCheckinsForGen, members, memberGen, selectedMember.id])

  const prevGenAvg = useMemo(() => {
    const genIdx = generationList.indexOf(memberGen ?? '')
    if (genIdx <= 0) return undefined
    const prevGen = generationList[genIdx - 1]
    const prevMembers = members.filter(m => m.generation === prevGen)
    if (prevMembers.length === 0) return undefined
    const prevIds = new Set(prevMembers.map(m => m.id))
    const totals = allCheckinsForGen
      .filter(c => prevIds.has(c.user_id) && c.category !== '今日はできなかった')
      .reduce((acc, c) => { acc[c.category] = (acc[c.category] ?? 0) + 1; return acc }, {} as Record<string, number>)
    return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v / prevMembers.length)]))
  }, [allCheckinsForGen, members, memberGen, generationList])

  const stuckCatCount = useMemo(() =>
    filteredAllItems.reduce((acc, c) => {
      if (c.category !== '今日はできなかった') acc[c.category] = (acc[c.category] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  , [filteredAllItems])

  const totalCheckins = Object.values(myCatCount).reduce((a, b) => a + b, 0)
  const recent7Moods = allCheckinsForGen
    .filter(c => c.user_id === selectedMember.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map(c => c.mood)
  const warnCount = recent7Moods.filter(m => m === '励ましがほしい' || m === '個別相談が必要かも').length

  const praisePoints = useMemo(() => {
    const pts: string[] = []
    if (totalCheckins >= 30) pts.push(`🔥 全期間で${totalCheckins}回もチェックインしています！継続力が素晴らしいです`)
    else if (totalCheckins >= 10) pts.push(`💪 ${totalCheckins}回のチェックイン実績。ここまで続けられています`)
    const topCat = Object.entries(myCatCount).sort((a, b) => b[1] - a[1])[0]
    if (topCat) pts.push(`🏆 「${topCat[0]}」に最も力を入れて取り組んでいます（${topCat[1]}回）`)
    if (sameGenAvg) {
      const topCatKey = topCat?.[0]
      if (topCatKey && (myCatCount[topCatKey] ?? 0) > (sameGenAvg[topCatKey] ?? 0))
        pts.push(`📈 「${topCatKey}」の取り組みが同期生の平均より多いです`)
    }
    if (filteredAllItems.length === 0) pts.push('✨ この期間はつまずきなし！すごくスムーズに進んでいます')
    if (pts.length === 0) pts.push('📝 チェックインを続けていること自体が大きな進歩です')
    return pts
  }, [totalCheckins, myCatCount, filteredAllItems, sameGenAvg])

  const improvePoints = useMemo(() => {
    const pts: string[] = []
    const topStuck = Object.entries(stuckCatCount).sort((a, b) => b[1] - a[1])[0]
    if (topStuck) pts.push(`🤔 「${topStuck[0]}」で${topStuck[1]}件のつまずき。小グループ・個別フォローを検討しましょう`)
    if (warnCount >= 2) pts.push(`💛 最近${warnCount}日が「励まし希望」状態。フォローアップや小メッセージでサポートを`)
    const untouchedCats = CAT_RADAR_KEYS.filter(c => c !== 'その他' && (myCatCount[c] ?? 0) === 0)
    if (untouchedCats.length > 0 && totalCheckins > 5)
      pts.push(`📚 「${untouchedCats[0]}」がまだ未着手です。次のステップに記載あり`)
    if (pts.length === 0) pts.push('✨ 現時点で特に気になる点はありません')
    return pts
  }, [stuckCatCount, warnCount, myCatCount, totalCheckins])

  const topStuckCat = Object.entries(stuckCatCount).sort((a, b) => b[1] - a[1])[0]?.[0]
  const revenuePoints = useMemo(() => {
    const pts: string[] = []
    if (topStuckCat) pts.push(`🔑 「${topStuckCat}」のつまずきを解消すると収益に最も近づきます`)
    if (sameGenAvg) {
      const myTotal = Object.values(myCatCount).reduce((a, b) => a + b, 0)
      const genTotal = Object.values(sameGenAvg).reduce((a, b) => a + b, 0)
      if (myTotal >= genTotal) pts.push('📊 同期生平均以上の取り組みです！その勢いのまま続けて')
      else pts.push('📊 同期生平均と比較すると取り組み量に差があります。日常の小さな行動が収益に繋がります')
    }
    if (prevGenAvg) pts.push('📣 前期生も同じステップを踏まえています。前期生の担当スタッフに直接相談するのもおすすめ')
    pts.push('✅ 一度で大きな成果を出そうとせず、小さな成功体験を積み重ねることが大切です')
    return pts
  }, [topStuckCat, sameGenAvg, prevGenAvg, myCatCount])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs font-bold text-stone-400 px-2">📊 {selectedMember.name}の分析</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-stone-700">🕸️ 講座別 取り組みレーダー</h2>
          <div className="flex gap-2 text-[10px] text-stone-400">
            {sameGenAvg && <span>点線青＝同期生平均</span>}
            {prevGenAvg && <span>点線紫＝前期生平均</span>}
          </div>
        </div>
        <AdminRadarChart myData={myCatCount} sameGenData={sameGenAvg} prevGenData={prevGenAvg} />
        <div className="flex flex-wrap items-center gap-3 justify-center mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] text-stone-500">{selectedMember.name}</span>
          </div>
          {sameGenAvg && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0 border-t-2 border-dashed border-blue-400" />
              <span className="text-[10px] text-stone-500">同期生平均</span>
            </div>
          )}
          {prevGenAvg && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0 border-t-2 border-dashed border-purple-400" />
              <span className="text-[10px] text-stone-500">前期生平均</span>
            </div>
          )}
        </div>
      </Card>

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
        {filteredItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-bold text-stone-600 mb-2">最近のつまずき（過去30日）</p>
            <div className="space-y-1.5">
              {filteredItems.slice(0, 2).map(item => (
                <div key={item.id} className="bg-red-50 rounded-xl px-3 py-2">
                  <div className="flex gap-2 mb-0.5">
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

      <Card>
        <h2 className="text-sm font-bold text-purple-700 mb-3">💰 収益化・やる気維持へのアドバイス</h2>
        <div className="space-y-2">
          {revenuePoints.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-purple-50 rounded-xl px-3 py-2.5">
              <span className="text-base leading-none mt-0.5">{p.split(' ')[0]}</span>
              <p className="text-xs text-purple-900 leading-relaxed">{p.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-xs font-bold text-stone-600 mb-2">💡 やる気を維持するサポート</p>
          <div className="space-y-1.5 text-xs text-stone-600">
            <p>✅ 小さな進歩を「すごいですね」と積極的に認めましょう</p>
            <p>✅ つまずきは成長のチャンス。「どこで止まったか」を一緒に見つけましょう</p>
            <p>✅ 連続発信を良いペースで続けているので、お客様に認知される日が必ず来ます</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
