'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Link2, Check, AlertCircle } from 'lucide-react'

interface WebhookSetting {
  generation: string
  discord_webhook_url: string | null
}

interface Props {
  generations: string[]
  webhookSettings: WebhookSetting[]
}

export function GenerationWebhookSettings({ generations, webhookSettings }: Props) {
  // 初期値をマップで管理
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    webhookSettings.forEach(s => {
      map[s.generation] = s.discord_webhook_url ?? ''
    })
    return map
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async (generation: string) => {
    setSaving(generation)
    setErrors(prev => ({ ...prev, [generation]: '' }))

    const res = await fetch('/api/admin/generation-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation, webhookUrl: urls[generation] ?? '' }),
    })

    if (res.ok) {
      setSaved(generation)
      setTimeout(() => setSaved(null), 3000)
    } else {
      const body = await res.json().catch(() => ({}))
      setErrors(prev => ({ ...prev, [generation]: body.error ?? '保存に失敗しました' }))
    }
    setSaving(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-stone-500" />
        <h2 className="text-sm font-bold text-stone-700">期生別 Discord Webhook URL</h2>
      </div>
      <p className="text-xs text-stone-500 -mt-2">
        設定すると、日報提出時に期生ルームへ自動投稿されます。
        Discord サーバーの「連携サービス」→「Webhook」から URL を取得してください。
      </p>

      <div className="space-y-3">
        {generations.map((gen) => (
          <Card key={gen} className="border-stone-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-stone-800">{gen}</span>
              {saved === gen && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                  <Check className="h-3 w-3" /> 保存しました
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={urls[gen] ?? ''}
                onChange={e => setUrls(prev => ({ ...prev, [gen]: e.target.value }))}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 font-mono"
              />
              <Button
                size="sm"
                onClick={() => handleSave(gen)}
                disabled={saving === gen}
              >
                {saving === gen ? '保存中...' : '保存'}
              </Button>
            </div>
            {errors[gen] && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors[gen]}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
