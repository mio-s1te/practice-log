'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function NewMemberClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [generation, setGeneration] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role: 'member', generation }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '招待失敗')
      setMsg(`✅ ${email} に招待メールを送信しました`)
      setTimeout(() => router.push('/admin/members'), 2000)
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← 戻る
        </button>
        <h1 className="text-xl font-bold text-stone-800">メンバーを追加</h1>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">お名前 <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：山田みお"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">メールアドレス <span className="text-red-400">*</span></label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">期 <span className="text-stone-400 font-normal">（例：1期・2期）</span></label>
            <input
              type="text"
              value={generation}
              onChange={e => setGeneration(e.target.value)}
              placeholder="1期"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800">
            <p className="font-bold mb-1">📧 招待メールについて</p>
            <p>入力したメールアドレスに招待メールが送信されます。メンバーがリンクをクリックすると、パスワード設定画面が開きます。</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              招待メールを送る
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
