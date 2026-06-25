// src/types/practice-log/index.ts

export type Role = 'member' | 'staff' | 'admin';
export type Status = 'active' | 'paused' | 'graduated' | 'cancelled';
export type Stage =
  | '土台づくり中' | '方向性整理中' | '導線設計中'
  | '発信実践中' | '反応確認中' | '改善中' | '成果検証中';

export type CheckinCategory =
  | 'スタート講座' | 'アフィリエイト講座' | '投稿作成' | '導線作成'
  | '案件選定' | '無料プレゼント作成' | '今日はできなかった' | 'その他';

export type Mood =
  | '順調' | '少し止まった' | '質問したい' | '励ましがほしい' | '個別相談が必要かも';

export type DiscordShare = '共有OK' | '匿名ならOK' | '共有NG';

export type QuestionStatus =
  | '未対応' | '対応中' | 'Discordで回答済み'
  | '個別回答済み' | 'FAQ化済み' | '個別相談へ案内';

export type PublicOk = 'OK' | '匿名ならOK' | 'NG';

export interface Profile {
  id: string;
  name: string;
  email: string;
  discord_name?: string;
  role: Role;
  generation?: string;
  status: Status;
  current_stage?: Stage;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  date: string;
  category: CheckinCategory;
  section?: string;
  done_text?: string;
  stuck_text?: string;
  has_question: boolean;
  question_text?: string;
  next_text?: string;
  mood?: Mood;
  discord_share?: DiscordShare;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  question_statuses?: QuestionStatusRecord[];
}

export interface Achievement {
  id: string;
  user_id: string;
  date: string;
  achievement_text: string;
  public_ok?: PublicOk;
  screenshot_url?: string;
  admin_memo?: string;
  created_at: string;
  profiles?: Profile;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description?: string;
  emoji?: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  awarded_by?: string;
  is_manual: boolean;
  badges?: Badge;
}

export interface StaffNote {
  id: string;
  user_id: string;
  staff_id: string;
  note: string;
  next_followup_date?: string;
  created_at: string;
  staff?: Profile;
}

export interface QuestionStatusRecord {
  id: string;
  checkin_id: string;
  status: QuestionStatus;
  staff_id?: string;
  memo?: string;
  updated_at: string;
}

// UI用
export const CHECKIN_CATEGORIES: CheckinCategory[] = [
  'スタート講座', 'アフィリエイト講座', '投稿作成', '導線作成',
  '案件選定', '無料プレゼント作成', '今日はできなかった', 'その他',
];

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: '順調',           emoji: '😊', label: '順調' },
  { value: '少し止まった',    emoji: '🤔', label: '少し止まった' },
  { value: '質問したい',      emoji: '❓', label: '質問したい' },
  { value: '励ましがほしい',  emoji: '💛', label: '励ましがほしい' },
  { value: '個別相談が必要かも', emoji: '🆘', label: '個別相談が必要かも' },
];

export const STAGES: Stage[] = [
  '土台づくり中', '方向性整理中', '導線設計中',
  '発信実践中', '反応確認中', '改善中', '成果検証中',
];

export const QUESTION_STATUSES: QuestionStatus[] = [
  '未対応', '対応中', 'Discordで回答済み',
  '個別回答済み', 'FAQ化済み', '個別相談へ案内',
];

export const STAMP_MAP: Record<string, string> = {
  default:    '✅',
  question:   '❓',
  encourage:  '💛',
  achievement:'⭐',
  comeback:   '🌱',
};
