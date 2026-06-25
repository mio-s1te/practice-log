export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  return (
    <AppShell profile={profile}>
      <CalendarClient checkins={checkins ?? []} profile={profile} />
    </AppShell>
  )
}
