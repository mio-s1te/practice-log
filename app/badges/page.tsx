import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'

export default async function BadgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: allBadges } = await supabase.from('badges').select('*').order('created_at')
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id, awarded_at')
    .eq('user_id', user.id)

  const earnedIds = new Set((userBadges ?? []).map((ub) => ub.badge_id))
  const earnedMap = new Map((userBadges ?? []).map((ub) => [ub.badge_id, ub.awarded_at]))

  return (
    <AppShell profile={profile}>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-stone-800">バッジ</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {earnedIds.size} / {(allBadges ?? []).length} 個獲得
          </p>
        </div>

        {/* 進捗バー */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700">バッジ獲得率</span>
            <span className="text-sm font-bold text-amber-700">
              {(allBadges ?? []).length > 0
                ? Math.round((earnedIds.size / (allBadges ?? []).length) * 100)
                : 0}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  (allBadges ?? []).length > 0
                    ? (earnedIds.size / (allBadges ?? []).length) * 100
                    : 0
                }%`
              }}
            />
          </div>
        </div>

        {/* 獲得済み */}
        {earnedIds.size > 0 && (
          <div>
            <h2 className="text-sm font-bold text-stone-600 mb-3">🏅 獲得済み</h2>
            <div className="grid grid-cols-2 gap-3">
              {(allBadges ?? []).filter((b) => earnedIds.has(b.id)).map((badge) => (
                <Card key={badge.id} className="bg-amber-50 border-amber-100">
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <div className="text-sm font-bold text-amber-900">{badge.name}</div>
                  <div className="text-xs text-amber-700 mt-0.5">{badge.description}</div>
                  {earnedMap.get(badge.id) && (
                    <div className="text-xs text-amber-500 mt-2">
                      {new Date(earnedMap.get(badge.id)!).toLocaleDateString('ja-JP')} 獲得
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 未獲得 */}
        <div>
          <h2 className="text-sm font-bold text-stone-400 mb-3">🔒 未獲得</h2>
          <div className="grid grid-cols-2 gap-3">
            {(allBadges ?? []).filter((b) => !earnedIds.has(b.id)).map((badge) => (
              <Card key={badge.id} className="opacity-50">
                <div className="text-3xl mb-2 grayscale">{badge.icon}</div>
                <div className="text-sm font-bold text-stone-500">{badge.name}</div>
                <div className="text-xs text-stone-400 mt-0.5">{badge.description}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
