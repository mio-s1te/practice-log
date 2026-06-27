export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { AppShell } from '@/components/layout/AppShell'
import { AchievementsClient } from './AchievementsClient'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // 自分の成果報告（全件）- 通常クライアント（自分のはRLSで取れる）
  const { data: myAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  // 同期生の成果報告（generationがある場合）
  // RLSで他ユーザーのデータは取れないため、adminClientを使用
  let generationAchievements: any[] = []
  if (profile.generation) {
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    // 同じgenerationのユーザーを取得（自分を除く）
    const { data: genProfiles } = await adminClient
      .from('profiles')
      .select('id, name')
      .eq('generation', profile.generation)
      .neq('id', user.id)

    if (genProfiles && genProfiles.length > 0) {
      const genUserIds = genProfiles.map((p: any) => p.id)

      // 同期生の成果報告（掲載NGは除外）
      const { data: genAchievements } = await adminClient
        .from('achievements')
        .select('*')
        .in('user_id', genUserIds)
        .neq('public_ok', 'NG')
        .order('date', { ascending: false })

      // user_id → name のマップ
      const nameMap: Record<string, string> = {}
      genProfiles.forEach((p: any) => { nameMap[p.id] = p.name })

      generationAchievements = (genAchievements ?? []).map((a: any) => ({
        ...a,
        displayName: a.public_ok === '匿名ならOK' ? '匿名メンバー' : (nameMap[a.user_id] ?? '同期メンバー'),
        isAnonymous: a.public_ok === '匿名ならOK',
      }))
    }
  }

  return (
    <AppShell profile={profile}>
      <AchievementsClient
        achievements={myAchievements ?? []}
        generationAchievements={generationAchievements}
        userId={user.id}
        generation={profile.generation}
      />
    </AppShell>
  )
}
