-- ============================================================
-- 012: タイムライン・スタンプ・質問回答・FAQ・動物絵文字割当
-- ============================================================

-- ① 動物絵文字割り当てテーブル
-- 同期（generation）内でユーザーに絵文字を固定割り当て
CREATE TABLE IF NOT EXISTS public.emoji_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation   text NOT NULL,
  emoji        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, generation),
  UNIQUE (generation, emoji)
);

-- ② タイムラインイベントテーブル
-- 同期生に見せるイベント（日報・質問・励まし希望・スタッフ回答）
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- 投稿者（NULLはシステム）
  generation   text NOT NULL,             -- どの期生向けか
  event_type   text NOT NULL              -- 'checkin' | 'question' | 'encourage' | 'staff_reply'
                 CHECK (event_type IN ('checkin', 'question', 'encourage', 'staff_reply')),
  checkin_id   uuid REFERENCES public.checkins(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ③ 励ましスタンプテーブル
-- timeline_eventsのencourageイベントに対してスタンプを押す
CREATE TABLE IF NOT EXISTS public.encourage_stamps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_event_id uuid NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stamp             text NOT NULL CHECK (stamp IN ('💪', '😭', '👏', '🌟', '❤️')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timeline_event_id, user_id)  -- 1人1スタンプ
);

-- ④ 質問回答テーブル
CREATE TABLE IF NOT EXISTS public.question_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id  uuid NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply_text  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ⑤ checkinsテーブルに質問公開フラグを追加
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS question_public_ok boolean DEFAULT false;

-- ============================================================
-- RLSポリシー
-- ============================================================

-- emoji_assignments
ALTER TABLE public.emoji_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emoji_select_all" ON public.emoji_assignments
  FOR SELECT USING (true);
CREATE POLICY "emoji_insert_system" ON public.emoji_assignments
  FOR INSERT WITH CHECK (public.is_staff_or_above());

-- timeline_events
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
-- 同期生だけ見える（自分のgenerationのイベントのみ）
CREATE POLICY "timeline_select_own_gen" ON public.timeline_events
  FOR SELECT USING (
    generation = (SELECT generation FROM public.profiles WHERE id = auth.uid())
    OR public.is_staff_or_above()
  );
CREATE POLICY "timeline_insert_system" ON public.timeline_events
  FOR INSERT WITH CHECK (true);

-- encourage_stamps
ALTER TABLE public.encourage_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stamps_select_all" ON public.encourage_stamps
  FOR SELECT USING (true);
CREATE POLICY "stamps_insert_own" ON public.encourage_stamps
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "stamps_delete_own" ON public.encourage_stamps
  FOR DELETE USING (user_id = auth.uid());

-- question_replies
ALTER TABLE public.question_replies ENABLE ROW LEVEL SECURITY;
-- 質問者本人とstaff/adminが見える
CREATE POLICY "replies_select_own" ON public.question_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checkins
      WHERE id = checkin_id AND user_id = auth.uid()
    )
    OR public.is_staff_or_above()
  );
CREATE POLICY "replies_insert_staff" ON public.question_replies
  FOR INSERT WITH CHECK (public.is_staff_or_above() AND staff_id = auth.uid());
CREATE POLICY "replies_update_staff" ON public.question_replies
  FOR UPDATE USING (staff_id = auth.uid() OR public.is_admin());
