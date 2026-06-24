import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // admin/staff は管理者ダッシュボードへ
  if (profile.role === 'admin' || profile.role === 'staff') {
    redirect('/admin')
  }

  // 直近60日のチェックイン
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // 全チェックイン（連続日数計算用）
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  // バッジ
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', user.id)
    .order('awarded_at', { ascending: false })

  // 最新の成果報告
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(3)

  return (
    <AppShell profile={profile}>
      <DashboardClient
        profile={profile}
        checkins={checkins ?? []}
        allCheckins={allCheckins ?? []}
        userBadges={userBadges ?? []}
        achievements={achievements ?? []}
      />
    </AppShell>
  )
}
