-- ============================================================
-- 013: 質問返信テーブル拡張（メンバーからの返信対応）
-- ============================================================

-- question_replies に メンバー返信フラグ・親返信ID を追加
ALTER TABLE public.question_replies
  ADD COLUMN IF NOT EXISTS from_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_reply_id uuid REFERENCES public.question_replies(id) ON DELETE CASCADE;

-- staff_id を nullable にする（メンバー返信の場合はstaffではなく member_id を使う）
ALTER TABLE public.question_replies
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- メンバーが自分の質問スレッドに返信できるポリシー追加
-- （既存の replies_insert_staff を補完）
CREATE POLICY IF NOT EXISTS "replies_insert_member_own" ON public.question_replies
  FOR INSERT WITH CHECK (
    from_member = true
    AND member_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.checkins
      WHERE id = checkin_id AND user_id = auth.uid()
    )
  );

-- メンバーが自分の返信を見られるポリシー（既存 replies_select_own で対応済みだが念のため確認）
-- replies_select_own は checkin.user_id = auth.uid() の場合にSELECT可なので追加不要
