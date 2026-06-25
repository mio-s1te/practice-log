'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error, data } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    // roleを取得してリダイレクト先を振り分け
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role ?? 'member'
    if (role === 'admin' || role === 'staff') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-700 rounded-2xl shadow-lg mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-amber-900">みお革命</h1>
          <p className="text-sm text-stone-500 mt-1">実践ログ・進捗ダッシュボード</p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-8">
          <h2 className="text-lg font-bold text-stone-800 mb-6">ログイン</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              ログイン
            </Button>

            {/* パスワードを忘れた場合 */}
            <button
              type="button"
              onClick={async () => {
                if (!email) { setError('メールアドレスを入力してください'); return }
                setLoading(true)
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/set-password`,
                })
                setLoading(false)
                if (error) { setError('送信に失敗しました'); return }
                setError('')
                alert(`${email} にパスワードリセットメールを送信しました`)
              }}
              className="w-full text-xs text-stone-400 hover:text-amber-700 underline mt-1"
            >
              パスワードを忘れた方はこちら
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          アカウントについては運営にお問い合わせください
        </p>
      </div>
    </div>
  )
}
