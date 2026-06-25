export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'

export default async function AdminBadgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/admin')

  const { data: badges } = await supabase.from('badges').select('*').order('created_at')

  return (
    <AppShell profile={profile}>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-stone-800">バッジ管理</h1>

        <div className="grid grid-cols-2 gap-3">
          {(badges ?? []).map((badge) => (
            <Card key={badge.id} className="bg-amber-50 border-amber-100">
              <div className="text-3xl mb-2">{badge.icon}</div>
              <div className="text-sm font-bold text-amber-900">{badge.name}</div>
              <div className="text-xs text-amber-700 mt-0.5">{badge.description}</div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.is_auto ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                  {badge.is_auto ? '自動付与' : '手動付与'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
