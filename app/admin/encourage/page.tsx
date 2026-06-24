import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export default async function EncouragePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const { data: items } = await supabase
    .from('checkins')
    .select(`
      id, date, done_text, stuck_text, next_text,
      profiles!inner(name, generation, discord_name)
    `)
    .eq('mood', '励ましがほしい')
    .order('date', { ascending: false })

  return (
    <AppShell profile={profile}>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-stone-800">励まし希望一覧</h1>
          <p className="text-sm text-stone-500 mt-0.5">💛 {(items ?? []).length} 件</p>
        </div>

        {(items ?? []).length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-4xl mb-3">💛</p>
            <p className="text-stone-500 text-sm">励まし希望はありません</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {(items ?? []).map((item: any) => (
              <Card key={item.id} className="border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💛</span>
                  <span className="text-sm font-bold text-stone-800">{item.profiles?.name}</span>
                  {item.profiles?.generation && (
                    <Badge size="sm" variant="outline">{item.profiles.generation}</Badge>
                  )}
                  <span className="text-xs text-stone-400 ml-auto">{formatDate(item.date, 'M/d')}</span>
                </div>
                {item.done_text && (
                  <div className="bg-stone-50 rounded-xl p-3 mb-2">
                    <p className="text-xs text-stone-500 mb-1">今日できたこと</p>
                    <p className="text-sm text-stone-800">{item.done_text}</p>
                  </div>
                )}
                {item.stuck_text && (
                  <div className="bg-amber-50 rounded-xl p-3 mb-2">
                    <p className="text-xs text-amber-700 mb-1">つまずき</p>
                    <p className="text-sm text-stone-800">{item.stuck_text}</p>
                  </div>
                )}
                {item.profiles?.discord_name && (
                  <p className="text-xs text-stone-400 mt-2">Discord: @{item.profiles.discord_name}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
