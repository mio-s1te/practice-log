'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Input'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Calendar, MessageSquare, Star, Award, FileText, Save } from 'lucide-react'
import { getStatusColor, getStatusLabel, getRoleColor, getRoleLabel, calcStreak, calcMonthlyRate, getCheckinStamp, formatDate } from '@/lib/utils'
import { MOOD_COLORS, MOOD_EMOJI, STAGES } from '@/types/database'
import type { Profile, Checkin, Achievement, StaffNote, Badge as BadgeType } from '@/types/database'

interface Props {
  member: Profile
  currentProfile: Profile
  checkins: Checkin[]
  userBadges: (any)[]
  achievements: Achievement[]
  staffNotes: (StaffNote & { staff: { name: string } })[]
  allBadges: BadgeType[]
}

const STATUS_OPTIONS = [
  { value: 'active', label: '受講中' },
  { value: 'paused', label: '一時停止' },
  { value: 'graduated', label: '卒業' },
  { value: 'cancelled', label: 'キャンセル' },
]

const ROLE_OPTIONS = [
  { value: 'member', label: '参加者' },
  { value: 'staff', label: 'スタッフ' },
  { value: 'admin', label: '管理者' },
]

const STAGE_OPTIONS = STAGES.map((s) => ({ value: s, label: s }))

export function MemberDetailClient({ member, currentProfile, checkins, userBadges, achievements, staffNotes, allBadges }: Props) {
  const supabase = createClient()
  const isAdmin = currentProfile.role === 'admin'

  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: member.name,
    discord_name: member.discord_name ?? '',
    generation: member.generation ?? '',
    status: member.status,
    role: member.role,
    current_stage: member.current_stage,
    start_date: member.start_date ?? '',
    end_date: member.end_date ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // メモ
  const [noteText, setNoteText] = useState('')
  const [noteFollowup, setNoteFollowup] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [notes, setNotes] = useState(staffNotes)

  // バッジ手動付与
  const [badgeLoading, setBadgeLoading] = useState(false)
  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id))
  const [earnedIds, setEarnedIds] = useState(earnedBadgeIds)

  // パスワード設定
  const [showPwForm, setShowPwForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  // 招待再送信
  const [reinviteLoading, setReinviteLoading] = useState(false)
  const [reinviteMsg, setReinviteMsg] = useState('')
  // created_at と updated_at が同じ = まだログインしてパスワード設定をしていない
  const neverLoggedIn = member.created_at === member.updated_at

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPwMsg('❌ パスワードは8文字以上で入力してください')
      return
    }
    setPwLoading(true)
    setPwMsg('')
    try {
      const res = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, password: newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '設定失敗')
      setPwMsg('✅ パスワードを設定しました')
      setNewPassword('')
      setShowPwForm(false)
    } catch (e: any) {
      setPwMsg(`❌ ${e.message}`)
    } finally {
      setPwLoading(false)
      setTimeout(() => setPwMsg(''), 4000)
    }
  }

  const streak = calcStreak(checkins)
  const { reported, total, rate } = calcMonthlyRate(checkins)

  const handleReinvite = async () => {
    if (!confirm(`${member.name}（${member.email}）に招待メールを再送信しますか？\n\n※現在のアカウントは一旦削除され、新しい招待メールが送られます。`)) return
    setReinviteLoading(true)
    setReinviteMsg('')
    try {
      const res = await fetch('/api/admin/reinvite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, email: member.email, name: member.name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '再送信失敗')
      setReinviteMsg(`✅ ${member.email} に招待メールを再送信しました`)
    } catch (e: any) {
      setReinviteMsg(`❌ ${e.message}`)
    } finally {
      setReinviteLoading(false)
      setTimeout(() => setReinviteMsg(''), 5000)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        name: editData.name,
        discord_name: editData.discord_name || null,
        generation: editData.generation || null,
        status: editData.status,
        role: editData.role,
        current_stage: editData.current_stage,
        start_date: editData.start_date || null,
        end_date: editData.end_date || null,
      })
      .eq('id', member.id)

    if (error) {
      setSaveMsg('保存に失敗しました')
    } else {
      setSaveMsg('保存しました ✓')
      setEditing(false)
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setNoteLoading(true)

    const { data, error } = await supabase
      .from('staff_notes')
      .insert({
        user_id: member.id,
        staff_id: currentProfile.id,
        note: noteText.trim(),
        next_followup_date: noteFollowup || null,
      })
      .select('*, staff:staff_id(name)')
      .single()

    if (!error && data) {
      setNotes([data as any, ...notes])
      setNoteText('')
      setNoteFollowup('')
    }
    setNoteLoading(false)
  }

  const handleAwardBadge = async (badgeId: string) => {
    if (earnedIds.has(badgeId)) return
    setBadgeLoading(true)

    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: member.id,
        badge_id: badgeId,
        awarded_by: currentProfile.id,
        is_manual: true,
      })

    if (!error) {
      setEarnedIds(new Set([...earnedIds, badgeId]))
    }
    setBadgeLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* ナビ */}
      <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" />
        メンバー一覧へ
      </Link>

      {/* プロフィールカード */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-lg font-black text-amber-800">
              {(member.name || '?')[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-800">{member.name}</h1>
              <p className="text-sm text-stone-500">{member.email}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-wrap justify-end">
              {neverLoggedIn && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleReinvite}
                  disabled={reinviteLoading}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  {reinviteLoading ? '送信中...' : '📧 招待を再送信'}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => { setShowPwForm(!showPwForm); setEditing(false) }}>
                🔑 PW設定
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditing(!editing); setShowPwForm(false) }}>
                {editing ? 'キャンセル' : '編集'}
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <Input
              label="名前"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
            <Input
              label="Discord名"
              value={editData.discord_name}
              onChange={(e) => setEditData({ ...editData, discord_name: e.target.value })}
              placeholder="@なし"
            />
            <Input
              label="期生"
              value={editData.generation}
              onChange={(e) => setEditData({ ...editData, generation: e.target.value })}
              placeholder="例：1期生"
            />
            <Select
              label="ステータス"
              options={STATUS_OPTIONS}
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
            />
            {isAdmin && (
              <Select
                label="権限"
                options={ROLE_OPTIONS}
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
              />
            )}
            <Select
              label="現在地"
              options={STAGE_OPTIONS}
              value={editData.current_stage}
              onChange={(e) => setEditData({ ...editData, current_stage: e.target.value as any })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="開始日"
                type="date"
                value={editData.start_date}
                onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
              />
              <Input
                label="終了日"
                type="date"
                value={editData.end_date}
                onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} loading={saving}>
                <Save className="h-4 w-4" />
                保存
              </Button>
              {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: '期生', value: member.generation ?? '未設定' },
              { label: 'ステータス', value: getStatusLabel(member.status) },
              { label: '権限', value: getRoleLabel(member.role) },
              { label: '現在地', value: member.current_stage },
              { label: '開始日', value: member.start_date ? formatDate(member.start_date) : '未設定' },
              { label: '終了日', value: member.end_date ? formatDate(member.end_date) : '未設定' },
              { label: 'Discord', value: member.discord_name || '未設定' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-stone-400 mb-0.5">{label}</p>
                <p className="font-medium text-stone-800">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 招待再送信メッセージ */}
      {reinviteMsg && (
        <div className={`text-sm px-4 py-3 rounded-xl ${reinviteMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {reinviteMsg}
        </div>
      )}

      {/* 未ログインバナー */}
      {neverLoggedIn && isAdmin && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-orange-700">⏳ まだログインしていません</p>
            <p className="text-xs text-orange-600 mt-0.5">招待メールの期限が切れている可能性があります</p>
          </div>
          <Button
            size="sm"
            onClick={handleReinvite}
            disabled={reinviteLoading}
            className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white border-0"
          >
            {reinviteLoading ? '送信中...' : '再送信'}
          </Button>
        </div>
      )}

      {/* パスワード設定フォーム */}
      {showPwForm && isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-bold text-stone-700 mb-1">🔑 パスワードを設定する</p>
          <p className="text-xs text-stone-500 mb-3">管理者が初期パスワードを設定できます（8文字以上）</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="新しいパスワード（8文字以上）"
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
            />
            <Button size="sm" onClick={handleSetPassword} disabled={pwLoading}>
              {pwLoading ? '設定中...' : '設定する'}
            </Button>
          </div>
          {pwMsg && (
            <p className={`text-xs mt-2 ${pwMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>
          )}
        </Card>
      )}

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <div className="text-2xl font-black text-orange-500">{streak}</div>
          <div className="text-xs text-stone-500">🔥 連続日数</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-black text-amber-700">{checkins.length}</div>
          <div className="text-xs text-stone-500">📋 累計報告</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-black text-stone-800">{rate}%</div>
          <div className="text-xs text-stone-500">今月報告率</div>
        </div>
      </div>

      {/* バッジ手動付与（adminのみ） */}
      {isAdmin && (
        <Card>
          <h2 className="text-sm font-bold text-stone-700 mb-3">
            <Award className="h-4 w-4 inline mr-1.5 text-amber-500" />
            バッジ管理
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {allBadges.map((badge) => {
              const earned = earnedIds.has(badge.id)
              return (
                <button
                  key={badge.id}
                  onClick={() => handleAwardBadge(badge.id)}
                  disabled={earned || badgeLoading}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left border transition-all ${
                    earned
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-stone-50 border-stone-100 text-stone-500 hover:border-amber-300'
                  }`}
                >
                  <span className={earned ? '' : 'grayscale opacity-50'}>{badge.icon}</span>
                  <span>{badge.name}</span>
                  {earned && <span className="ml-auto text-amber-600">✓</span>}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* 運営メモ */}
      <Card>
        <h2 className="text-sm font-bold text-stone-700 mb-3">
          <FileText className="h-4 w-4 inline mr-1.5 text-stone-400" />
          運営メモ
        </h2>
        <div className="space-y-2 mb-4">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="メモを記入..."
            rows={2}
          />
          <div className="flex gap-3">
            <Input
              type="date"
              value={noteFollowup}
              onChange={(e) => setNoteFollowup(e.target.value)}
              placeholder="次回確認日"
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddNote} loading={noteLoading}>
              追加
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-stone-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-stone-600">{(note.staff as any)?.name}</span>
                <span className="text-xs text-stone-400">{formatDate(note.created_at)}</span>
              </div>
              <p className="text-sm text-stone-800">{note.note}</p>
              {note.next_followup_date && (
                <p className="text-xs text-amber-700 mt-1.5">📅 次回確認: {formatDate(note.next_followup_date)}</p>
              )}
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-3">メモはありません</p>
          )}
        </div>
      </Card>

      {/* 最近のチェックイン */}
      <Card>
        <h2 className="text-sm font-bold text-stone-700 mb-3">
          <Calendar className="h-4 w-4 inline mr-1.5 text-stone-400" />
          報告履歴 ({checkins.length}件)
        </h2>
        <div className="space-y-2">
          {checkins.slice(0, 10).map((c) => (
            <div key={c.id} className="flex items-start gap-2 py-2 border-b border-stone-50 last:border-0">
              <span>{getCheckinStamp(c)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-600">{formatDate(c.date, 'M/d（EEEE）')}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${MOOD_COLORS[c.mood]}`}>
                    {c.mood}
                  </span>
                </div>
                {c.done_text && <p className="text-xs text-stone-700 mt-0.5 truncate">{c.done_text}</p>}
                {c.stuck_text && <p className="text-xs text-orange-600 mt-0.5 truncate">🤔 {c.stuck_text}</p>}
                {c.has_question && c.question_text && (
                  <p className="text-xs text-blue-600 mt-0.5 truncate">❓ {c.question_text}</p>
                )}
              </div>
            </div>
          ))}
          {checkins.length > 10 && (
            <p className="text-xs text-stone-400 text-center pt-1">他{checkins.length - 10}件</p>
          )}
        </div>
      </Card>

      {/* 成果報告 */}
      {achievements.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold text-stone-700 mb-3">
            <Star className="h-4 w-4 inline mr-1.5 text-yellow-500" />
            成果報告 ({achievements.length}件)
          </h2>
          <div className="space-y-2">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-2 border-b border-stone-50 last:border-0">
                <span>⭐</span>
                <div>
                  <p className="text-xs text-stone-500">{formatDate(a.date, 'M/d')}</p>
                  <p className="text-sm text-stone-800">{a.achievement_text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
