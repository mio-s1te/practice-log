export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { CheckinClient } from './CheckinClient'
import { format } from 'date-fns'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayCheckin } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  return (
    <AppShell profile={profile}>
      <CheckinClient profile={profile} todayCheckin={todayCheckin} />
    </AppShell>
  )
}
