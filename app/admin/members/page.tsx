import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { MembersClient } from './MembersClient'
import { format, subDays } from 'date-fns'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'member')
    .order('generation')

  const today = format(new Date(), 'yyyy-MM-dd')
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd')

  // 全チェックイン（最近7日）
  const { data: recentCheckins } = await supabase
    .from('checkins')
    .select('user_id, date')
    .gte('date', sevenDaysAgo)

  const todayIds = new Set((recentCheckins ?? []).filter((c) => c.date === today).map((c) => c.user_id))

  // 各メンバーの最終チェックイン日
  const lastCheckinMap = (recentCheckins ?? []).reduce((acc: Record<string, string>, c) => {
    if (!acc[c.user_id] || c.date > acc[c.user_id]) acc[c.user_id] = c.date
    return acc
  }, {})

  return (
    <AppShell profile={profile}>
      <MembersClient
        members={members ?? []}
        currentUserId={user.id}
        isAdmin={profile.role === 'admin'}
        todayCheckinIds={[...todayIds]}
        lastCheckinMap={lastCheckinMap}
        today={today}
      />
    </AppShell>
  )
}
