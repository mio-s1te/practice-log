export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { getCheckinStamp, formatDate } from '@/lib/utils'
import { MOOD_COLORS, MOOD_EMOJI } from '@/types/database'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  return (
    <AppShell profile={profile}>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-stone-800">報告履歴</h1>
          <p className="text-sm text-stone-500 mt-0.5">累計 {(checkins ?? []).length} 件の報告</p>
        </div>

        {(checkins ?? []).length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-stone-500 text-sm">まだ報告がありません</p>
            <p className="text-stone-400 text-xs mt-1">最初のチェックインをしてみましょう！</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {(checkins ?? []).map((checkin) => (
              <Card key={checkin.id}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none">{getCheckinStamp(checkin)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-bold text-stone-800">
                        {formatDate(checkin.date, 'M月d日（EEEE）')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${MOOD_COLORS[checkin.mood]}`}>
                        {MOOD_EMOJI[checkin.mood]} {checkin.mood}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-stone-400 w-16 flex-shrink-0">📚 講座</span>
                        <span className="text-xs text-stone-700">{checkin.category}</span>
                      </div>
                      {checkin.section && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-stone-400 w-16 flex-shrink-0">📍 進捗</span>
                          <span className="text-xs text-stone-700">{checkin.section}</span>
                        </div>
                      )}
                      {checkin.done_text && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-stone-400 w-16 flex-shrink-0">✅ できた</span>
                          <span className="text-xs text-stone-700">{checkin.done_text}</span>
                        </div>
                      )}
                      {checkin.stuck_text && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-stone-400 w-16 flex-shrink-0">🤔 つまずき</span>
                          <span className="text-xs text-stone-700">{checkin.stuck_text}</span>
                        </div>
                      )}
                      {checkin.has_question && checkin.question_text && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-stone-400 w-16 flex-shrink-0">❓ 質問</span>
                          <span className="text-xs text-blue-700">{checkin.question_text}</span>
                        </div>
                      )}
                      {checkin.next_text && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-stone-400 w-16 flex-shrink-0">📅 明日</span>
                          <span className="text-xs text-stone-700">{checkin.next_text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
