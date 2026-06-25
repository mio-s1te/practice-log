export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          discord_name: string | null
          role: 'member' | 'staff' | 'admin'
          generation: string | null
          status: 'active' | 'paused' | 'graduated' | 'cancelled'
          current_stage: StageType
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string
          email?: string
          discord_name?: string | null
          role?: 'member' | 'staff' | 'admin'
          generation?: string | null
          status?: 'active' | 'paused' | 'graduated' | 'cancelled'
          current_stage?: StageType
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          discord_name?: string | null
          role?: 'member' | 'staff' | 'admin'
          generation?: string | null
          status?: 'active' | 'paused' | 'graduated' | 'cancelled'
          current_stage?: StageType
          start_date?: string | null
          end_date?: string | null
          updated_at?: string
        }
      }
      checkins: {
        Row: {
          id: string
          user_id: string
          date: string
          category: CategoryType
          section: string | null
          done_text: string | null
          stuck_text: string | null
          has_question: boolean
          question_text: string | null
          next_text: string | null
          mood: MoodType
          discord_share: DiscordShareType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          category?: CategoryType
          section?: string | null
          done_text?: string | null
          stuck_text?: string | null
          has_question?: boolean
          question_text?: string | null
          next_text?: string | null
          mood?: MoodType
          discord_share?: DiscordShareType
          created_at?: string
          updated_at?: string
        }
        Update: {
          category?: CategoryType
          section?: string | null
          done_text?: string | null
          stuck_text?: string | null
          has_question?: boolean
          question_text?: string | null
          next_text?: string | null
          mood?: MoodType
          discord_share?: DiscordShareType
          updated_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          date: string
          achievement_text: string
          public_ok: 'OK' | '匿名ならOK' | 'NG'
          screenshot_url: string | null
          admin_memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          achievement_text: string
          public_ok?: 'OK' | '匿名ならOK' | 'NG'
          screenshot_url?: string | null
          admin_memo?: string | null
          created_at?: string
        }
        Update: {
          achievement_text?: string
          public_ok?: 'OK' | '匿名ならOK' | 'NG'
          screenshot_url?: string | null
          admin_memo?: string | null
        }
      }
      badges: {
        Row: {
          id: string
          code: string
          name: string
          description: string
          icon: string
          is_auto: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string
          icon?: string
          is_auto?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          icon?: string
          is_auto?: boolean
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          awarded_at: string
          awarded_by: string | null
          is_manual: boolean
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          awarded_at?: string
          awarded_by?: string | null
          is_manual?: boolean
        }
        Update: {
          awarded_by?: string | null
          is_manual?: boolean
        }
      }
      staff_notes: {
        Row: {
          id: string
          user_id: string
          staff_id: string
          note: string
          next_followup_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          staff_id: string
          note: string
          next_followup_date?: string | null
          created_at?: string
        }
        Update: {
          note?: string
          next_followup_date?: string | null
        }
      }
      question_statuses: {
        Row: {
          id: string
          checkin_id: string
          status: QuestionStatusType
          staff_id: string | null
          memo: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          checkin_id: string
          status?: QuestionStatusType
          staff_id?: string | null
          memo?: string | null
          updated_at?: string
        }
        Update: {
          status?: QuestionStatusType
          staff_id?: string | null
          memo?: string | null
          updated_at?: string
        }
      }
    }
    Functions: {
      get_my_role: { Args: Record<never, never>; Returns: string }
      is_admin: { Args: Record<never, never>; Returns: boolean }
      is_staff_or_above: { Args: Record<never, never>; Returns: boolean }
      auto_award_badges: { Args: { p_user_id: string }; Returns: void }
    }
    Enums: Record<never, never>
  }
}

// ============================================================
// 共通型エイリアス
// ============================================================
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type StaffNote = Database['public']['Tables']['staff_notes']['Row']
export type QuestionStatus = Database['public']['Tables']['question_statuses']['Row']

// ============================================================
// ユニオン型
// ============================================================
export type StageType =
  | '土台づくり中'
  | '方向性整理中'
  | '導線設計中'
  | '発信実践中'
  | '反応確認中'
  | '改善中'
  | '成果検証中'

export type CategoryType =
  | 'スタート講座'
  | 'アフィリエイト講座'
  | '投稿作成'
  | '導線作成'
  | '案件選定'
  | '無料プレゼント作成'
  | '今日はできなかった'
  | 'その他'

export type MoodType =
  | '順調'
  | '少し止まった'
  | '質問したい'
  | '励ましがほしい'
  | '個別相談が必要かも'

export type DiscordShareType = '共有OK' | '匿名ならOK' | '共有NG'

export type QuestionStatusType =
  | '未対応'
  | '対応中'
  | 'Discordで回答済み'
  | '個別回答済み'
  | 'FAQ化済み'
  | '個別相談へ案内'

export type UserRole = 'member' | 'staff' | 'admin'
export type UserStatus = 'active' | 'paused' | 'graduated' | 'cancelled'

// ============================================================
// 複合型（JOIN結果など）
// ============================================================
export type CheckinWithProfile = Checkin & {
  profiles: Pick<Profile, 'name' | 'email' | 'generation' | 'discord_name'>
}

export type CheckinWithQuestion = Checkin & {
  question_statuses: QuestionStatus | null
  profiles: Pick<Profile, 'name' | 'generation'>
}

export type UserBadgeWithBadge = UserBadge & {
  badges: Badge
}

export type StaffNoteWithStaff = StaffNote & {
  staff: Pick<Profile, 'name'>
}

// ============================================================
// 定数
// ============================================================
export const STAGES: StageType[] = [
  '土台づくり中',
  '方向性整理中',
  '導線設計中',
  '発信実践中',
  '反応確認中',
  '改善中',
  '成果検証中',
]

export const CATEGORIES: CategoryType[] = [
  'スタート講座',
  'アフィリエイト講座',
  '投稿作成',
  '導線作成',
  '案件選定',
  '無料プレゼント作成',
  '今日はできなかった',
  'その他',
]

export const MOODS: MoodType[] = [
  '順調',
  '少し止まった',
  '質問したい',
  '励ましがほしい',
  '個別相談が必要かも',
]

export const MOOD_COLORS: Record<MoodType, string> = {
  '順調': 'text-green-600 bg-green-50',
  '少し止まった': 'text-yellow-600 bg-yellow-50',
  '質問したい': 'text-blue-600 bg-blue-50',
  '励ましがほしい': 'text-orange-500 bg-orange-50',
  '個別相談が必要かも': 'text-red-500 bg-red-50',
}

export const MOOD_EMOJI: Record<MoodType, string> = {
  '順調': '😊',
  '少し止まった': '🤔',
  '質問したい': '❓',
  '励ましがほしい': '💛',
  '個別相談が必要かも': '🆘',
}

export const CHECKIN_STAMP: Record<string, string> = {
  default: '🐱',
  question: '❓',
  encourage: '💛',
  achievement: '⭐',
  no_today: '🌱',
}
