'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Link2, Check, AlertCircle } from 'lucide-react'

interface WebhookSetting {
  generation: string
  discord_webhook_url: string | null
  encourage_webhook_url: string | null
  achievement_webhook_url: string | null
}

interface Props {
  generations: string[]
  webhookSettings: WebhookSetting[]
}

type UrlType = 'discord_webhook_url' | 'encourage_webhook_url' | 'achievement_webhook_url'

const URL_CONFIG: { key: UrlType; label: string; placeholder: string; description: string }[] = [
  {
    key: 'discord_webhook_url',
    label: '📋 日報通知',
    placeholder: 'https://discord.com/api/webhooks/...',
    description: '日報提出時に送信されます',
  },
  {
    key: 'encourage_webhook_url',
    label: '💛 励まし通知',
    placeholder: 'https://discord.com/api/webhooks/（未設定なら日報チャンネルに送信）',
    description: '「励ましてほしい」選択時に送信されます。未設定の場合は日報チャンネルに送信。',
  },
  {
    key: 'achievement_webhook_url',
    label: '⭐ 成果報告',
    placeholder: 'https://discord.com/api/webhooks/（未設定なら日報チャンネルに送信）',
    description: '成果報告投稿時に送信されます。未設定の場合は日報チャンネルに送信。',
  },
]

export function GenerationWebhookSettings({ generations, webhookSettings }: Props) {
  // 初期値をマップで管理： { generation: { url_type: value } }
  const [urls, setUrls] = useState<Record<string, Record<UrlType, string>>>(() => {
    const map: Record<string, Record<UrlType, string>> = {}
    generations.forEach(gen => {
      const setting = webhookSettings.find(s => s.generation === gen)
      map[gen] = {
        discord_webhook_url: setting?.discord_webhook_url ?? '',
        encourage_webhook_url: setting?.encourage_webhook_url ?? '',
        achievement_webhook_url: setting?.achievement_webhook_url ?? '',
      }
    })
    return map
  })

  // 保存状態: { `${generation}:${urlType}`: 'saving' | 'saved' | undefined }
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async (generation: string, urlType: UrlType) => {
    const key = `${generation}:${urlType}`
    setSaving(key)
    setErrors(prev => ({ ...prev, [key]: '' }))

    const res = await fetch('/api/admin/generation-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation,
        urlType,
        webhookUrl: urls[generation]?.[urlType] ?? '',
      }),
    })

    if (res.ok) {
      setSaved(key)
      setTimeout(() => setSaved(null), 3000)
    } else {
      const body = await res.json().catch(() => ({}))
      setErrors(prev => ({ ...prev, [key]: body.error ?? '保存に失敗しました' }))
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
        用途ごとに異なる Discord チャンネルへ通知できます。
        Discord サーバーの「連携サービス」→「Webhook」から URL を取得してください。
      </p>

      <div className="space-y-5">
        {generations.map((gen) => (
          <Card key={gen} className="border-stone-100 space-y-3">
            <div className="text-sm font-bold text-stone-800 border-b border-stone-100 pb-2">
              {gen}
            </div>

            {URL_CONFIG.map(({ key, label, placeholder, description }) => {
              const stateKey = `${gen}:${key}`
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700">{label}</span>
                    <span className="text-xs text-stone-400">{description}</span>
                    {saved === stateKey && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-bold ml-auto">
                        <Check className="h-3 w-3" /> 保存しました
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urls[gen]?.[key] ?? ''}
                      onChange={e =>
                        setUrls(prev => ({
                          ...prev,
                          [gen]: { ...prev[gen], [key]: e.target.value },
                        }))
                      }
                      placeholder={placeholder}
                      className="flex-1 text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(gen, key)}
                      disabled={saving === stateKey}
                    >
                      {saving === stateKey ? '保存中...' : '保存'}
                    </Button>
                  </div>
                  {errors[stateKey] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors[stateKey]}
                    </p>
                  )}
                </div>
              )
            })}
          </Card>
        ))}
      </div>
    </div>
  )
}
