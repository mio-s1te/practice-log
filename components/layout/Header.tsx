'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Menu, X, ClipboardList, LayoutDashboard, Calendar, Star, Award, Settings, Users } from 'lucide-react'
import type { Profile } from '@/types/database'
import { getRoleLabel } from '@/lib/utils'

interface HeaderProps {
  profile: Profile
}

export function Header({ profile }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile.role === 'admin' || profile.role === 'staff'
  const isOnlyAdmin = profile.role === 'admin'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const memberLinks = [
    { href: '/dashboard', label: 'マイページ', icon: LayoutDashboard },
    { href: '/checkin', label: 'チェックイン', icon: ClipboardList },
    { href: '/calendar', label: '報告カレンダー', icon: Calendar },
    { href: '/achievements', label: '成果報告', icon: Star },
    { href: '/badges', label: 'バッジ', icon: Award },
  ]

  const adminLinks = [
    { href: '/admin', label: '管理ダッシュボード', icon: LayoutDashboard, adminOnly: false },
    { href: '/admin/members', label: 'メンバー管理', icon: Settings, adminOnly: false },
    { href: '/admin/staff', label: 'スタッフ管理', icon: Users, adminOnly: true },
    { href: '/admin/questions', label: '質問一覧', icon: ClipboardList, adminOnly: false },
    { href: '/admin/encourage', label: '励まし希望', icon: Star, adminOnly: false },
    { href: '/admin/stuck', label: 'つまずき分析', icon: Calendar, adminOnly: false },
    { href: '/admin/achievements', label: '成果報告一覧', icon: Award, adminOnly: false },
  ]

  const links = isAdmin
    ? adminLinks.filter(l => !l.adminOnly || isOnlyAdmin)
    : memberLinks

  return (
    <header className="bg-white border-b border-stone-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* ロゴ */}
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <span className="text-lg font-black text-amber-800">みお革命</span>
          <span className="hidden sm:block text-xs text-stone-400 font-medium">実践ログ</span>
        </Link>

        {/* PCナビ */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* 右側 */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500">
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
              {getRoleLabel(profile.role)}
            </span>
            <span className="font-medium text-stone-700">{profile.name || 'ゲスト'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
          {/* ハンバーガー */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 px-4 py-3">
          <div className="text-xs text-stone-500 mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
              {getRoleLabel(profile.role)}
            </span>
            <span>{profile.name}</span>
          </div>
          <nav className="grid grid-cols-2 gap-2">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-stone-700 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-colors"
                >
                  <Icon className="h-4 w-4 text-amber-700" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
