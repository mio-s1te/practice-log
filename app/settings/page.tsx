export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'member') redirect('/admin')

  const today = new Date().toISOString().split('T')[0]
  const isGraduated = profile.status === 'graduated' ||
    ((profile as any).end_date && (profile as any).end_date < today)

  return (
    <AppShell profile={profile}>
      <SettingsClient
        lineUserId={(profile as any).line_user_id ?? null}
        lineNotificationOk={(profile as any).line_notification_ok ?? true}
        isGraduated={isGraduated}
        endDate={(profile as any).end_date ?? null}
      />
    </AppShell>
  )
}
