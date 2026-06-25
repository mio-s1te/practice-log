-- ============================================================
-- みお革命 実践ログ - Row Level Security (RLS) 設定
-- ============================================================

-- ============================================================
-- ヘルパー関数
-- ============================================================

-- 現在のユーザーのroleを取得
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- admin かどうか
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- staff 以上かどうか
CREATE OR REPLACE FUNCTION public.is_staff_or_above()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- profiles テーブル RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 自分自身は常に参照可能
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- staff/admin は全員参照可能
CREATE POLICY "profiles_select_staff" ON public.profiles
  FOR SELECT USING (public.is_staff_or_above());

-- 自分のプロフィールは自分で更新可能（role/status/generation は除く）
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM public.profiles WHERE id = auth.uid()) AND
    generation = (SELECT generation FROM public.profiles WHERE id = auth.uid())
  );

-- admin は全員更新可能
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- admin だけが挿入可能（新規メンバー追加）
-- ※ on_auth_user_created トリガーが SECURITY DEFINER で動くため、
--    通常ユーザーの INSERT は不要
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================
-- checkins テーブル RLS
-- ============================================================
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- 自分のチェックインは参照可能
CREATE POLICY "checkins_select_own" ON public.checkins
  FOR SELECT USING (user_id = auth.uid());

-- staff/admin は全チェックイン参照可能
CREATE POLICY "checkins_select_staff" ON public.checkins
  FOR SELECT USING (public.is_staff_or_above());

-- 自分のチェックインは作成可能（1日1回はアプリ側で制御）
CREATE POLICY "checkins_insert_own" ON public.checkins
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 自分のチェックインは当日のみ更新可能
CREATE POLICY "checkins_update_own" ON public.checkins
  FOR UPDATE USING (
    user_id = auth.uid() AND date = CURRENT_DATE
  );

-- admin は全チェックイン更新可能
CREATE POLICY "checkins_update_admin" ON public.checkins
  FOR UPDATE USING (public.is_admin());

-- ============================================================
-- achievements テーブル RLS
-- ============================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 自分の成果は参照可能
CREATE POLICY "achievements_select_own" ON public.achievements
  FOR SELECT USING (user_id = auth.uid());

-- staff/admin は全成果参照可能
CREATE POLICY "achievements_select_staff" ON public.achievements
  FOR SELECT USING (public.is_staff_or_above());

-- 自分の成果は作成可能
CREATE POLICY "achievements_insert_own" ON public.achievements
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- admin は成果のメモを更新可能
CREATE POLICY "achievements_update_admin" ON public.achievements
  FOR UPDATE USING (public.is_admin());

-- ============================================================
-- badges テーブル RLS（マスタ：全員参照可能）
-- ============================================================
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_all" ON public.badges
  FOR SELECT USING (true);

-- admin だけが作成・更新可能
CREATE POLICY "badges_insert_admin" ON public.badges
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "badges_update_admin" ON public.badges
  FOR UPDATE USING (public.is_admin());

-- ============================================================
-- user_badges テーブル RLS
-- ============================================================
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 自分のバッジは参照可能
CREATE POLICY "user_badges_select_own" ON public.user_badges
  FOR SELECT USING (user_id = auth.uid());

-- staff/admin は全バッジ参照可能
CREATE POLICY "user_badges_select_staff" ON public.user_badges
  FOR SELECT USING (public.is_staff_or_above());

-- システムによる自動付与（SECURITY DEFINER 関数から）と admin のみ INSERT
CREATE POLICY "user_badges_insert_admin" ON public.user_badges
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================
-- staff_notes テーブル RLS
-- ============================================================
ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;

-- staff/admin は全メモ参照可能
CREATE POLICY "staff_notes_select_staff" ON public.staff_notes
  FOR SELECT USING (public.is_staff_or_above());

-- staff/admin はメモ作成可能
CREATE POLICY "staff_notes_insert_staff" ON public.staff_notes
  FOR INSERT WITH CHECK (public.is_staff_or_above());

-- 自分が書いたメモ or admin は更新可能
CREATE POLICY "staff_notes_update" ON public.staff_notes
  FOR UPDATE USING (
    staff_id = auth.uid() OR public.is_admin()
  );

-- admin のみ削除可能
CREATE POLICY "staff_notes_delete_admin" ON public.staff_notes
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- question_statuses テーブル RLS
-- ============================================================
ALTER TABLE public.question_statuses ENABLE ROW LEVEL SECURITY;

-- 質問したユーザー本人は参照可能
CREATE POLICY "question_statuses_select_own" ON public.question_statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checkins
      WHERE id = checkin_id AND user_id = auth.uid()
    )
  );

-- staff/admin は全対応状況参照可能
CREATE POLICY "question_statuses_select_staff" ON public.question_statuses
  FOR SELECT USING (public.is_staff_or_above());

-- staff/admin は更新可能
CREATE POLICY "question_statuses_update_staff" ON public.question_statuses
  FOR UPDATE USING (public.is_staff_or_above());

-- トリガー（SECURITY DEFINER）が INSERT するため、ポリシーは管理者のみ
CREATE POLICY "question_statuses_insert_admin" ON public.question_statuses
  FOR INSERT WITH CHECK (public.is_admin());
