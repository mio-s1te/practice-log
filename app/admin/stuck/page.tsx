import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export default async function StuckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const { data: items } = await supabase
    .from('checkins')
    .select(`
      id, date, category, stuck_text,
      profiles!inner(name, generation)
    `)
    .not('stuck_text', 'is', null)
    .neq('stuck_text', '')
    .order('date', { ascending: false })

  // カテゴリ別集計
  const categoryCount = (items ?? []).reduce((acc: Record<string, number>, item: any) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {})
  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])

  return (
    <AppShell profile={profile}>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-stone-800">つまずき分析</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {(items ?? []).length} 件</p>
        </div>

        {/* カテゴリ別ランキング */}
        <Card>
          <h2 className="text-sm font-bold text-stone-700 mb-4">📊 講座別つまずき数</h2>
          <div className="space-y-2">
            {sortedCategories.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-stone-600 w-28 flex-shrink-0">{cat}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-amber-600"
                    style={{ width: `${(count / (items ?? []).length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-stone-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 一覧 */}
        <div className="space-y-3">
          {(items ?? []).map((item: any) => (
            <Card key={item.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-stone-700">{item.profiles?.name}</span>
                {item.profiles?.generation && (
                  <Badge size="sm" variant="outline">{item.profiles.generation}</Badge>
                )}
                <Badge size="sm" variant="default">{item.category}</Badge>
                <span className="text-xs text-stone-400 ml-auto">{formatDate(item.date, 'M/d')}</span>
              </div>
              <p className="text-sm text-stone-800 bg-stone-50 rounded-xl p-3">{item.stuck_text}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
