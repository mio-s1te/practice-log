'use client'

import { Header } from './Header'
import type { Profile } from '@/types/database'

interface AppShellProps {
  profile?: Profile
  children: React.ReactNode
}

export function AppShell({ profile, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      {profile && <Header profile={profile} />}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
