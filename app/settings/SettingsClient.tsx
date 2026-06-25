'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Settings } from 'lucide-react'

interface Props {
  lineUserId: string | null
  lineNotificationOk: boolean
  isGraduated: boolean
  endDate: string | null
}

export function SettingsClient({ lineUserId, lineNotificationOk: initial, isGraduated, endDate }: Props) {
  const [notificationOk, setNotificationOk] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleToggle = async (enabled: boolean) => {
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/settings/line-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    const json = await res.json()
    if (res.ok) {
      setNotificationOk(enabled)
      setMsg(enabled ? '✅ LINE通知をONにしました' : '✅ LINE通知を停止しました')
    } else {
      setMsg(`❌ ${json.error}`)
    }
    setLoading(false)
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-stone-500" />
          設定
        </h1>
      </div>

      {/* LINE連携 */}
      <Card>
        <h2 className="text-sm font-bold text-stone-700 mb-3">💬 LINE連携</h2>
        {lineUserId ? (
          <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5">
            <span className="text-green-600 font-bold">✅</span>
            <p className="text-sm text-green-800">LINE連携済みです</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2.5">
              <span className="text-stone-400">⚪</span>
              <p className="text-sm text-stone-600">LINEと連携していません</p>
            </div>
            <a
              href="/api/auth/line-connect"
              className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
            >
              📲 LINEと連携する
            </a>
            <p className="text-xs text-stone-400">
              連携すると毎朝7時に未報告の場合、優しいリマインドが届きます
            </p>
          </div>
        )}
      </Card>

      {/* LINE通知設定 */}
      {lineUserId && (
        <Card>
          <h2 className="text-sm font-bold text-stone-700 mb-1">🔔 LINE通知設定</h2>

          {!isGraduated ? (
            <div className="space-y-2">
              <div className="bg-amber-50 rounded-xl px-3 py-2.5">
                <p className="text-xs font-bold text-amber-800">受講期間中は通知を停止できません</p>
                {endDate && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    卒業日（{endDate}）以降に停止できます
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-green-500 font-bold text-lg">●</span>
                <p className="text-sm text-stone-700">通知ON（自動リマインド有効）</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">
                卒業後はLINE通知をいつでもON/OFFできます
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleToggle(true)}
                  disabled={loading || notificationOk}
                  className={`flex-1 py-2.5 rounded-xl text-sm border font-medium transition-all ${
                    notificationOk
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-green-400'
                  }`}
                >
                  🔔 通知ON
                </button>
                <button
                  onClick={() => handleToggle(false)}
                  disabled={loading || !notificationOk}
                  className={`flex-1 py-2.5 rounded-xl text-sm border font-medium transition-all ${
                    !notificationOk
                      ? 'bg-stone-500 text-white border-stone-500'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  🔕 通知OFF
                </button>
              </div>
              {msg && (
                <p className={`text-xs ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                  {msg}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
