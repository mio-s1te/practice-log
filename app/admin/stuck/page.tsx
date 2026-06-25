export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import StuckClient from './StuckClient'
import { subDays, format } from 'date-fns'

export default async function StuckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  // メンバー一覧（フィルター用）
  const { data: members } = await supabase
    .from('profiles')
    .select('id, name, generation')
    .eq('role', 'member')
    .eq('status', 'active')
    .order('generation')

  // 過去30日のつまずきデータ
  const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const { data: items } = await supabase
    .from('checkins')
    .select(`id, date, category, stuck_text, mood, user_id, profiles!inner(name, generation)`)
    .not('stuck_text', 'is', null)
    .neq('stuck_text', '')
    .gte('date', since)
    .order('date', { ascending: false })

  // 全期間のつまずきデータ（集計用）
  const { data: allItems } = await supabase
    .from('checkins')
    .select(`id, date, category, mood, user_id, profiles!inner(name, generation)`)
    .not('stuck_text', 'is', null)
    .neq('stuck_text', '')
    .order('date', { ascending: true })

  // 過去30日の全チェックイン数（分母用）
  const { data: allCheckins30 } = await supabase
    .from('checkins')
    .select('date, category, user_id')
    .gte('date', since)

  return (
    <AppShell profile={profile}>
      <StuckClient
        items={items ?? []}
        allItems={allItems ?? []}
        allCheckins30={allCheckins30 ?? []}
        members={members ?? []}
      />
    </AppShell>
  )
}
