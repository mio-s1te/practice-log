export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { AppShell } from '@/components/layout/AppShell'
import { EncourageClient } from './EncourageClient'

export default async function EncouragePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // 直近7日の「励ましがほしい」チェックインを取得
  const since = new Date()
  since.setDate(since.getDate() - 7)

  // mood は単一文字列 or JSON配列文字列 の両方があるので ilike で検索
  const { data: items } = await adminClient
    .from('checkins')
    .select(`
      id, date, done_text, stuck_text, next_text, user_id,
      profiles!inner(name, generation, discord_name)
    `)
    .ilike('mood', '%励ましがほしい%')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // 該当チェックインのタイムラインイベントを取得
  const checkinIds = (items ?? []).map((i: any) => i.id)
  const { data: timelineEvents } = checkinIds.length > 0
    ? await adminClient
        .from('timeline_events')
        .select('id, checkin_id, user_id, generation, encourage_stamps(id, stamp, user_id)')
        .in('checkin_id', checkinIds)
        .eq('event_type', 'encourage')
    : { data: [] }

  // checkinId → timelineEvent のマップ
  const eventMap: Record<string, any> = {}
  ;(timelineEvents ?? []).forEach((e: any) => {
    if (e.checkin_id) eventMap[e.checkin_id] = e
  })

  // 絵文字マップを取得（全世代）
  const { data: emojiRows } = await adminClient
    .from('emoji_assignments')
    .select('user_id, emoji')

  const emojiMap: Record<string, string> = {}
  ;(emojiRows ?? []).forEach((r: any) => { emojiMap[r.user_id] = r.emoji })

  return (
    <AppShell profile={profile}>
      <EncourageClient
        items={items ?? []}
        eventMap={eventMap}
        emojiMap={emojiMap}
        myUserId={user.id}
      />
    </AppShell>
  )
}
