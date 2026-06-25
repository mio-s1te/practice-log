export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { QuestionsClient } from './QuestionsClient'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const { data: questions } = await supabase
    .from('checkins')
    .select(`
      id, date, question_text, category, mood, created_at,
      profiles!inner(name, generation, discord_name),
      question_statuses(id, status, memo, updated_at)
    `)
    .eq('has_question', true)
    .order('date', { ascending: false })

  return (
    <AppShell profile={profile}>
      <QuestionsClient questions={questions ?? []} />
    </AppShell>
  )
}
