import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO, isToday, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Checkin, MoodType } from '@/types/database'
import { CHECKIN_STAMP } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 日付フォーマット
export function formatDate(date: string | Date, fmt = 'yyyy年M月d日'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ja })
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'M/d')
}

// 連続報告日数を計算
export function calcStreak(checkins: Pick<Checkin, 'date'>[]): number {
  if (checkins.length === 0) return 0

  const sorted = [...checkins]
    .map((c) => c.date)
    .sort()
    .reverse()

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // 今日チェックインしていない場合は昨日から開始
  const todayStr = format(currentDate, 'yyyy-MM-dd')
  const hasToday = sorted.includes(todayStr)
  if (!hasToday) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  for (const dateStr of sorted) {
    const d = parseISO(dateStr)
    const diff = differenceInDays(currentDate, d)
    if (diff === 0) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (diff > 0) {
      break
    }
  }

  return streak
}

// 今月の報告率
export function calcMonthlyRate(checkins: Pick<Checkin, 'date'>[]): {
  reported: number
  total: number
  rate: number
} {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const daysInMonth = today // 今日までの日数
  const reportedDays = checkins.filter((c) => {
    const d = parseISO(c.date)
    return d.getFullYear() === year && d.getMonth() === month
  }).length

  return {
    reported: reportedDays,
    total: daysInMonth,
    rate: daysInMonth > 0 ? Math.round((reportedDays / daysInMonth) * 100) : 0,
  }
}

// カレンダー用スタンプ取得
export function getCheckinStamp(checkin: Checkin | null): string {
  if (!checkin) return ''
  if (checkin.category === '今日はできなかった') return CHECKIN_STAMP.no_today
  if (checkin.mood === '励ましがほしい') return CHECKIN_STAMP.encourage
  if (checkin.has_question) return CHECKIN_STAMP.question
  return CHECKIN_STAMP.default
}

// 未報告日数計算（参加開始日から）
export function calcMissedDays(
  checkins: Pick<Checkin, 'date'>[],
  startDate: string | null
): number {
  if (!startDate) return 0
  const start = parseISO(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = differenceInDays(today, start) + 1
  return Math.max(0, totalDays - checkins.length)
}

// ステータスの表示カラー
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-600 bg-green-50 border-green-200',
    paused: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    graduated: 'text-blue-600 bg-blue-50 border-blue-200',
    cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
  }
  return colors[status] ?? 'text-gray-500 bg-gray-50 border-gray-200'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '受講中',
    paused: '一時停止',
    graduated: '卒業',
    cancelled: 'キャンセル',
  }
  return labels[status] ?? status
}

// ロールの表示
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    member: '参加者',
    staff: 'スタッフ',
    admin: '管理者',
  }
  return labels[role] ?? role
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    member: 'text-stone-600 bg-stone-50',
    staff: 'text-amber-700 bg-amber-50',
    admin: 'text-orange-700 bg-orange-50',
  }
  return colors[role] ?? 'text-stone-600 bg-stone-50'
}

// 質問ステータスの色
export function getQuestionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    '未対応': 'text-red-600 bg-red-50 border-red-200',
    '対応中': 'text-orange-600 bg-orange-50 border-orange-200',
    'Discordで回答済み': 'text-blue-600 bg-blue-50 border-blue-200',
    '個別回答済み': 'text-green-600 bg-green-50 border-green-200',
    'FAQ化済み': 'text-purple-600 bg-purple-50 border-purple-200',
    '個別相談へ案内': 'text-teal-600 bg-teal-50 border-teal-200',
  }
  return colors[status] ?? 'text-gray-500 bg-gray-50 border-gray-200'
}

// 未報告日数の危険度
export function getMissedDaysColor(days: number): string {
  if (days >= 7) return 'text-red-600'
  if (days >= 3) return 'text-orange-500'
  if (days >= 1) return 'text-yellow-600'
  return 'text-green-600'
}
