export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { MemberDetailClient } from './MemberDetailClient'

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) redirect('/dashboard')

  const { data: member } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!member) notFound()

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', id)
    .order('date', { ascending: false })

  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', id)
    .order('awarded_at', { ascending: false })

  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', id)
    .order('date', { ascending: false })

  const { data: staffNotes } = await supabase
    .from('staff_notes')
    .select('*, staff:staff_id(name)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const { data: allBadges } = await supabase.from('badges').select('*')

  return (
    <AppShell profile={profile}>
      <MemberDetailClient
        member={member}
        currentProfile={profile}
        checkins={checkins ?? []}
        userBadges={userBadges ?? []}
        achievements={achievements ?? []}
        staffNotes={staffNotes ?? []}
        allBadges={allBadges ?? []}
      />
    </AppShell>
  )
}
