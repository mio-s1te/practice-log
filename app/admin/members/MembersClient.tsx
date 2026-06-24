'use client'

import { useState } from 'react'
import Link from 'next/link'
import { differenceInDays, parseISO, format } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Users, Search, UserPlus, Filter } from 'lucide-react'
import { getStatusColor, getStatusLabel, getMissedDaysColor, formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface Props {
  members: Profile[]
  currentUserId: string
  isAdmin: boolean
  todayCheckinIds: string[]
  lastCheckinMap: Record<string, string>
  today: string
}

export function MembersClient({ members, currentUserId, isAdmin, todayCheckinIds, lastCheckinMap, today }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [genFilter, setGenFilter] = useState<string>('all')

  const todaySet = new Set(todayCheckinIds)
  const generations = ['all', ...new Set(members.map((m) => m.generation ?? '未設定'))]

  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    const matchGen = genFilter === 'all' || (m.generation ?? '未設定') === genFilter
    return matchSearch && matchStatus && matchGen
  })

  const getMissedDays = (memberId: string) => {
    const last = lastCheckinMap[memberId]
    if (!last) return 999
    return differenceInDays(parseISO(today), parseISO(last))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">メンバー管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {members.length} 名</p>
        </div>
        {isAdmin && (
          <Link href="/admin/members/new">
            <Button size="sm">
              <UserPlus className="h-4 w-4" />
              追加
            </Button>
          </Link>
        )}
      </div>

      {/* フィルター */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メールで検索"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'すべて' },
            { value: 'active', label: '受講中' },
            { value: 'paused', label: '停止中' },
            { value: 'graduated', label: '卒業' },
            { value: 'cancelled', label: 'キャンセル' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                statusFilter === opt.value
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {generations.length > 2 && (
          <div className="flex gap-2 flex-wrap">
            {generations.map((gen) => (
              <button
                key={gen}
                onClick={() => setGenFilter(gen)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  genFilter === gen
                    ? 'bg-stone-700 text-white border-stone-700'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {gen === 'all' ? '全期生' : gen}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* メンバーリスト */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="h-8 w-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">メンバーが見つかりません</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => {
            const missedDays = getMissedDays(member.id)
            const reportedToday = todaySet.has(member.id)
            const lastDate = lastCheckinMap[member.id]

            return (
              <Link key={member.id} href={`/admin/members/${member.id}`}>
                <div className="bg-white border border-stone-100 rounded-2xl p-4 hover:border-amber-200 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* アバター */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      reportedToday ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {(member.name || '?')[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-stone-800">{member.name}</span>
                        {member.generation && (
                          <Badge size="sm" variant="outline">{member.generation}</Badge>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(member.status)}`}>
                          {getStatusLabel(member.status)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5 truncate">{member.email}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-stone-500">
                          {member.current_stage}
                        </span>
                        {reportedToday ? (
                          <span className="text-xs text-green-600">✅ 今日報告済み</span>
                        ) : (
                          <span className={`text-xs ${getMissedDaysColor(missedDays)}`}>
                            {lastDate
                              ? `${missedDays}日未報告`
                              : '未報告'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
