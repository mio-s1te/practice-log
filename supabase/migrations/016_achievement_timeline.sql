-- ============================================================
-- 016: timeline_events に achievement_id カラム追加
--      achievement_reactions テーブル作成
-- ============================================================

-- ① timeline_events に achievement_id カラムを追加
ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE;

-- ② CHECK制約を更新して 'achievement' を追加
--    既存のCHECK制約を削除して再作成
ALTER TABLE public.timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_event_type_check;

ALTER TABLE public.timeline_events
  ADD CONSTRAINT timeline_events_event_type_check
    CHECK (event_type IN ('checkin', 'question', 'encourage', 'staff_reply', 'achievement'));

-- ③ achievement_reactions テーブルを作成
CREATE TABLE IF NOT EXISTS public.achievement_reactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji          text NOT NULL CHECK (emoji IN ('❤️', '🎉', '👏', '✨', '🔥')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (achievement_id, user_id, emoji)  -- 1人1絵文字1回まで
);

-- ④ achievement_reactions の RLS
ALTER TABLE public.achievement_reactions ENABLE ROW LEVEL SECURITY;

-- 読み取り: 全認証済みユーザー
CREATE POLICY "reactions_select_all" ON public.achievement_reactions
  FOR SELECT TO authenticated USING (true);

-- 挿入: 自分のリアクション
CREATE POLICY "reactions_insert_own" ON public.achievement_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 削除: 自分のリアクション
CREATE POLICY "reactions_delete_own" ON public.achievement_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ⑤ 過去の成果報告を timeline_events に一括登録（重複回避）
-- ※ profiles.generation が設定されているユーザーのみ対象
INSERT INTO public.timeline_events (user_id, generation, event_type, achievement_id, created_at)
SELECT
  a.user_id,
  p.generation,
  'achievement',
  a.id,
  a.created_at
FROM public.achievements a
JOIN public.profiles p ON p.id = a.user_id
WHERE p.generation IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.timeline_events te
    WHERE te.achievement_id = a.id
  );

-- ⑥ generation の表記統一（'0期生' → '0期'）
-- ※ 実際の値に合わせて追加・変更してください
-- UPDATE public.profiles SET generation = '0期' WHERE generation = '0期生';
-- UPDATE public.timeline_events SET generation = '0期' WHERE generation = '0期生';
