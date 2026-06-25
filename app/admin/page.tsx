export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AdminDashboardClient } from './AdminDashboardClient'
import { format, subDays } from 'date-fns'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const today = format(new Date(), 'yyyy-MM-dd')
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd')
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  // 全メンバー（active）
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'member')
    .order('generation')

  // 今日のチェックイン
  const { data: todayCheckins } = await supabase
    .from('checkins')
    .select('user_id, mood, has_question')
    .eq('date', today)

  // 質問一覧（未対応）
  const { data: openQuestions } = await supabase
    .from('checkins')
    .select('id, user_id, date, question_text, question_statuses(status), profiles(name, generation)')
    .eq('has_question', true)
    .order('date', { ascending: false })
    .limit(5)

  // 励まし希望
  const { data: encourageNeeded } = await supabase
    .from('checkins')
    .select('id, user_id, date, profiles(name, generation)')
    .eq('mood', '励ましがほしい')
    .gte('date', threeDaysAgo)
    .order('date', { ascending: false })

  // 成果報告
  const { data: recentAchievements } = await supabase
    .from('achievements')
    .select('*, profiles(name, generation)')
    .order('created_at', { ascending: false })
    .limit(5)

  // 期生別集計
  const generations = [...new Set((members ?? []).map((m) => m.generation ?? '未設定'))]

  const todayCheckinIds = new Set((todayCheckins ?? []).map((c) => c.user_id))
  const activeMembers = (members ?? []).filter((m) => m.status === 'active')

  // 未報告者（active memberで今日未報告）
  const notReportedToday = activeMembers.filter((m) => !todayCheckinIds.has(m.id))

  return (
    <AppShell profile={profile}>
      <AdminDashboardClient
        profile={profile}
        members={members ?? []}
        activeMembers={activeMembers}
        todayCheckins={todayCheckins ?? []}
        notReportedToday={notReportedToday}
        openQuestions={openQuestions ?? []}
        encourageNeeded={encourageNeeded ?? []}
        recentAchievements={recentAchievements ?? []}
        generations={generations}
      />
    </AppShell>
  )
}
