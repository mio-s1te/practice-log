export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export default async function AdminAchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const { data: items } = await supabase
    .from('achievements')
    .select('*, profiles!inner(name, generation)')
    .order('date', { ascending: false })

  return (
    <AppShell profile={profile}>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-stone-800">成果報告一覧</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {(items ?? []).length} 件</p>
        </div>

        {(items ?? []).length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-4xl mb-3">⭐</p>
            <p className="text-stone-500 text-sm">まだ成果報告はありません</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {(items ?? []).map((a: any) => (
              <Card key={a.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⭐</span>
                  <span className="text-sm font-bold text-stone-800">{a.profiles?.name}</span>
                  {a.profiles?.generation && (
                    <Badge size="sm" variant="outline">{a.profiles.generation}</Badge>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                    a.public_ok === 'OK' ? 'bg-green-50 text-green-700' :
                    a.public_ok === '匿名ならOK' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-stone-50 text-stone-500'
                  }`}>
                    {a.public_ok}
                  </span>
                </div>
                <p className="text-sm text-stone-800 mb-2">{a.achievement_text}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400">{formatDate(a.date, 'M月d日')}</span>
                  {a.screenshot_url && (
                    <a href={a.screenshot_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-amber-700 hover:underline">
                      📎 スクショ
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
