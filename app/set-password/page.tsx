'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { BookOpen, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const hash = window.location.hash

    if (hash && hash.includes('access_token')) {
      // URLにハッシュトークンがある場合 → 招待 or パスワードリセット
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        // 既存セッションを一旦クリアしてから新しいセッションを確立
        supabase.auth.signOut().then(() => {
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => {
              if (!error) setSessionReady(true)
            })
        })
      }
    } else {
      // ハッシュなし → パスワード変更などで既にセッションがある場合
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') {
          if (session) setSessionReady(true)
        }
      })
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setSessionReady(true)
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの設定に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    setDone(true)

    // roleを取得してリダイレクト
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    setTimeout(() => {
      const role = profile?.role ?? 'member'
      router.push(role === 'admin' || role === 'staff' ? '/admin' : '/dashboard')
    }, 2000)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-stone-800 mb-2">パスワードを設定しました！</h1>
          <p className="text-sm text-stone-500">ダッシュボードへ移動します...</p>
        </div>
      </div>
    )
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

        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-8">
          <h2 className="text-lg font-bold text-stone-800 mb-2">パスワードを設定する</h2>
          <p className="text-xs text-stone-500 mb-6">
            はじめてのログイン用パスワードを設定してください。8文字以上で入力してください。
          </p>

          {!sessionReady ? (
            <div className="text-center py-6">
              <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-stone-500">認証情報を確認中...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 新しいパスワード */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  新しいパスワード
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8文字以上"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 確認 */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  パスワード（確認）
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="もう一度入力"
                  required
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                />
              </div>

              {/* パスワード強度表示 */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        background: password.length >= i * 4
                          ? i <= 1 ? '#f87171' : i <= 2 ? '#fbbf24' : i <= 3 ? '#60a5fa' : '#10b981'
                          : '#e7e5e4'
                      }}
                    />
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                パスワードを設定してはじめる
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          問題が発生した場合は運営にご連絡ください
        </p>
      </div>
    </div>
  )
}
