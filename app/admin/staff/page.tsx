'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type StaffMember = {
  id: string
  name: string
  email: string
  role: 'member' | 'staff' | 'admin'
  generation: string | null
  status: string
  created_at: string
}

export default function StaffPage() {
  const supabase = createClient()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff')
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, generation, status, created_at')
      .in('role', ['staff', 'admin'])
      .order('role', { ascending: true })
    setStaffList(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setMsg('')
    try {
      // Supabase Auth Admin APIでユーザー招待
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '招待失敗')
      setMsg(`✅ ${inviteEmail} に招待メールを送信しました`)
      setInviteEmail('')
      setInviteName('')
      setShowInvite(false)
      load()
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (id: string, newRole: 'member' | 'staff' | 'admin') => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    load()
  }

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`${name} をスタッフから外しますか？（memberに変更されます）`)) return
    await supabase.from('profiles').update({ role: 'member' }).eq('id', id)
    load()
  }

  const roleLabel = (role: string) => {
    if (role === 'admin') return { label: '管理者', color: 'bg-red-100 text-red-700' }
    return { label: 'スタッフ', color: 'bg-blue-100 text-blue-700' }
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-800">スタッフ管理</h1>
            <p className="text-sm text-stone-500 mt-0.5">スタッフ・管理者の一覧と権限管理</p>
          </div>
          <Button onClick={() => setShowInvite(!showInvite)} size="sm">
            ＋ スタッフを追加
          </Button>
        </div>

        {msg && (
          <div className={`text-sm px-4 py-3 rounded-xl ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        {/* 招待フォーム */}
        {showInvite && (
          <Card className="border-amber-200 bg-amber-50">
            <h2 className="text-sm font-bold text-stone-800 mb-4">新しいスタッフを招待</h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">お名前</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="例：田中スタッフ"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">権限</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'staff' | 'admin')}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
                >
                  <option value="staff">スタッフ（管理画面の閲覧・サポート）</option>
                  <option value="admin">管理者（全機能・メンバー管理）</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={inviting} size="sm">
                  {inviting ? '送信中...' : '招待メールを送る'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)} type="button">
                  キャンセル
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* スタッフ一覧 */}
        <Card>
          <h2 className="text-sm font-bold text-stone-700 mb-4">
            現在のスタッフ・管理者 ({staffList.length}名)
          </h2>
          {loading ? (
            <p className="text-sm text-stone-400 text-center py-6">読み込み中...</p>
          ) : staffList.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">スタッフがいません</p>
          ) : (
            <div className="space-y-3">
              {staffList.map(staff => {
                const rl = roleLabel(staff.role)
                return (
                  <div key={staff.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-base flex-shrink-0">
                      {staff.role === 'admin' ? '👑' : '🙋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-stone-800">{staff.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rl.color}`}>
                          {rl.label}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{staff.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* 権限変更 */}
                      <select
                        value={staff.role}
                        onChange={e => handleRoleChange(staff.id, e.target.value as any)}
                        className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="staff">スタッフ</option>
                        <option value="admin">管理者</option>
                        <option value="member">メンバーに戻す</option>
                      </select>
                      <button
                        onClick={() => handleRemove(staff.id, staff.name)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                      >
                        外す
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* 権限説明 */}
        <Card className="bg-stone-50">
          <h3 className="text-xs font-bold text-stone-600 mb-3">権限の違い</h3>
          <div className="space-y-2 text-xs text-stone-600">
            <div className="flex gap-3">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">スタッフ</span>
              <span>メンバーの報告確認・質問一覧・励まし希望・つまずき分析の閲覧ができます</span>
            </div>
            <div className="flex gap-3">
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">管理者</span>
              <span>全機能 + メンバー追加・パスワード設定・バッジ付与・スタッフ管理ができます</span>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
