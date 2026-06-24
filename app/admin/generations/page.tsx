import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function GenerationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'member')
    .order('generation')

  const { data: todayCheckins } = await supabase
    .from('checkins')
    .select('user_id')
    .eq('date', today)

  const todayIds = new Set((todayCheckins ?? []).map((c) => c.user_id))

  const generations = [...new Set((members ?? []).map((m) => m.generation ?? '未設定'))]

  return (
    <AppShell profile={profile}>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-stone-800">期生別ダッシュボード</h1>

        <div className="space-y-4">
          {generations.map((gen) => {
            const genMembers = (members ?? []).filter((m) => (m.generation ?? '未設定') === gen)
            const activeMembers = genMembers.filter((m) => m.status === 'active')
            const reportedCount = activeMembers.filter((m) => todayIds.has(m.id)).length
            const rate = activeMembers.length > 0
              ? Math.round((reportedCount / activeMembers.length) * 100)
              : 0

            return (
              <Card key={gen}>
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-base font-bold text-stone-800">{gen}</h2>
                  <span className={`text-sm font-bold ${rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                    報告率 {rate}%
                  </span>
                </div>

                <div className="progress-bar mb-3">
                  <div className="progress-fill" style={{ width: `${rate}%` }} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div>
                    <div className="text-xl font-black text-stone-800">{genMembers.length}</div>
                    <div className="text-xs text-stone-500">全体</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-green-600">{reportedCount}</div>
                    <div className="text-xs text-stone-500">今日報告</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-orange-500">{activeMembers.length - reportedCount}</div>
                    <div className="text-xs text-stone-500">未報告</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {genMembers.slice(0, 5).map((m) => (
                    <Link key={m.id} href={`/admin/members/${m.id}`}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-stone-50 rounded-lg">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        todayIds.has(m.id) ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {todayIds.has(m.id) ? '✓' : '−'}
                      </span>
                      <span className="text-sm text-stone-700">{m.name}</span>
                      <span className="text-xs text-stone-400 ml-auto">{m.current_stage}</span>
                    </Link>
                  ))}
                  {genMembers.length > 5 && (
                    <Link href={`/admin/members?generation=${encodeURIComponent(gen)}`}
                          className="text-xs text-amber-700 hover:underline pl-2">
                      他{genMembers.length - 5}名を見る →
                    </Link>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
