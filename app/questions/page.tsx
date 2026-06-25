export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { QuestionsClient } from './QuestionsClient'

export default async function QuestionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // admin/staff は管理者ページへ
  if (profile.role === 'admin' || profile.role === 'staff') {
    redirect('/admin/questions')
  }

  return (
    <AppShell profile={profile}>
      <QuestionsClient />
    </AppShell>
  )
}
