export const dynamic = 'force-dynamic'

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

  // 自分のつまずきデータ（全期間）
  const { data: myStuckItems } = await supabase
    .from('checkins')
    .select('id, date, category, stuck_text, mood')
    .eq('user_id', user.id)
    .not('stuck_text', 'is', null)
    .neq('stuck_text', '')
    .order('date', { ascending: false })

  // 分析用：自分の全チェックイン（カテゴリ・気分込み）
  const { data: allMyCheckins } = await supabase
    .from('checkins')
    .select('id, date, category, mood, stuck_text')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  // 分析用：同期生の全チェックイン（カテゴリ集計・平均比較用）
  const myGeneration = profile.generation
  const { data: generationCheckins } = myGeneration ? await supabase
    .from('checkins')
    .select('date, category, mood, user_id')
    .neq('user_id', user.id)
    .in('user_id',
      (await supabase
        .from('profiles')
        .select('id')
        .eq('generation', myGeneration)
        .eq('role', 'member')
        .eq('status', 'active')
      ).data?.map((p: { id: string }) => p.id) ?? []
    ) : { data: [] }

  return (
    <AppShell profile={profile}>
      <DashboardClient
        profile={profile}
        checkins={checkins ?? []}
        allCheckins={allCheckins ?? []}
        userBadges={userBadges ?? []}
        achievements={achievements ?? []}
        myStuckItems={myStuckItems ?? []}
        allMyCheckins={allMyCheckins ?? []}
        generationCheckins={generationCheckins ?? []}
      />
    </AppShell>
  )
}
