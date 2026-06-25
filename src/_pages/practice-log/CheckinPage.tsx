// src/pages/practice-log/CheckinPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/practice-log/supabase';
import { usePracticeLogAuth } from '@/hooks/practice-log/useAuth';
import { PracticeLogLayout } from '@/components/practice-log/Layout';
import { CHECKIN_CATEGORIES, MOODS, CheckinCategory, Mood, DiscordShare } from '@/types/practice-log';

export function CheckinPage() {
  const { user } = usePracticeLogAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [alreadyDone, setAlreadyDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [category, setCategory] = useState<CheckinCategory>('スタート講座');
  const [section, setSection] = useState('');
  const [doneText, setDoneText] = useState('');
  const [stuckText, setStuckText] = useState('');
  const [hasQuestion, setHasQuestion] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [nextText, setNextText] = useState('');
  const [mood, setMood] = useState<Mood>('順調');
  const [discordShare, setDiscordShare] = useState<DiscordShare>('共有OK');

  useEffect(() => {
    const check = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('checkins')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      if (data) setAlreadyDone(true);
      setLoading(false);
    };
    check();
  }, [user, today]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('checkins').insert({
      user_id: user.id,
      date: today,
      category,
      section: section || null,
      done_text: doneText || null,
      stuck_text: stuckText || null,
      has_question: hasQuestion,
      question_text: hasQuestion ? questionText : null,
      next_text: nextText || null,
      mood,
      discord_share: discordShare,
    });
    setSubmitting(false);
    if (!error) {
      // バッジ自動付与（初チェックイン・連続報告は後述hookで処理）
      setDone(true);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '1.5px solid #e5e7eb', fontSize: '15px',
    background: '#fafafa', boxSizing: 'border-box' as const, outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 700,
    color: '#374151', marginBottom: '6px',
  } as const;

  const sectionStyle = { marginBottom: '20px' };

  if (loading) return (
    <PracticeLogLayout>
      <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>読み込み中...</div>
    </PracticeLogLayout>
  );

  if (done) return (
    <PracticeLogLayout>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '8px' }}>
          チェックイン完了！
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.75, marginBottom: '8px' }}>
          報告した日としてスタンプが記録されました。
        </p>
        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.75, marginBottom: '28px' }}>
          必要があればDiscordの質問・相談部屋にも投稿してください🐱
        </p>
        <button
          onClick={() => navigate('/practice-log/dashboard')}
          style={{
            background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff',
            fontWeight: 900, fontSize: '16px', padding: '14px 32px',
            borderRadius: '14px', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(249,115,22,.35)',
          }}
        >
          ダッシュボードへ →
        </button>
      </div>
    </PracticeLogLayout>
  );

  if (alreadyDone) return (
    <PracticeLogLayout>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌟</div>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c1c', marginBottom: '8px' }}>
          今日はもうチェックイン済みです！
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
          お疲れさまでした。明日もまた記録しましょう🐱
        </p>
        <button
          onClick={() => navigate('/practice-log/dashboard')}
          style={{
            background: '#f3e8d8', color: '#92400e',
            fontWeight: 800, fontSize: '15px', padding: '12px 28px',
            borderRadius: '12px', border: 'none', cursor: 'pointer',
          }}
        >
          ダッシュボードへ
        </button>
      </div>
    </PracticeLogLayout>
  );

  return (
    <PracticeLogLayout>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1c1c1c', marginBottom: '4px' }}>
          ✏️ 今日のチェックイン
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '24px' }}>
          {today.replace(/-/g, '/')} の記録
        </p>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>

          {/* 今日進めたもの */}
          <div style={sectionStyle}>
            <label style={labelStyle}>📚 今日進めたもの <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {CHECKIN_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '10px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                    border: category === cat ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                    background: category === cat ? '#fff7ed' : '#fafafa',
                    color: category === cat ? '#ea580c' : '#6b7280',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 進んだ場所 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>📍 進んだ場所（任意）</label>
            <input
              type="text"
              value={section}
              onChange={e => setSection(e.target.value)}
              placeholder="例：第2章、Day3、投稿3本 など"
              style={fieldStyle}
            />
          </div>

          {/* 今日できたこと */}
          <div style={sectionStyle}>
            <label style={labelStyle}>✅ 今日できたこと</label>
            <textarea
              value={doneText}
              onChange={e => setDoneText(e.target.value)}
              placeholder="小さなことでもOK！"
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          {/* つまずいたこと */}
          <div style={sectionStyle}>
            <label style={labelStyle}>🤔 つまずいたこと（任意）</label>
            <textarea
              value={stuckText}
              onChange={e => setStuckText(e.target.value)}
              placeholder="分からなかったことや止まった場所"
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          {/* 質問 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>❓ 質問したいことはありますか？</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: hasQuestion ? '12px' : '0' }}>
              {[false, true].map(val => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setHasQuestion(val)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                    border: hasQuestion === val ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                    background: hasQuestion === val ? '#fff7ed' : '#fafafa',
                    color: hasQuestion === val ? '#ea580c' : '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {val ? 'あり' : 'なし'}
                </button>
              ))}
            </div>
            {hasQuestion && (
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                placeholder="質問内容を入力してください"
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            )}
          </div>

          {/* 明日やること */}
          <div style={sectionStyle}>
            <label style={labelStyle}>📌 明日やること（任意）</label>
            <textarea
              value={nextText}
              onChange={e => setNextText(e.target.value)}
              placeholder="次にやることを書いておくと迷わない"
              rows={2}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          {/* 今の状態 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>💭 今の状態 <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MOODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  style={{
                    padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                    border: mood === m.value ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                    background: mood === m.value ? '#fff7ed' : '#fafafa',
                    color: mood === m.value ? '#ea580c' : '#6b7280',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Discord共有 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>💬 Discord共有</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['共有OK', '匿名ならOK', '共有NG'] as DiscordShare[]).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscordShare(val)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                    border: discordShare === val ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                    background: discordShare === val ? '#fff7ed' : '#fafafa',
                    color: discordShare === val ? '#ea580c' : '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%', padding: '16px',
              background: submitting ? '#d1d5db' : 'linear-gradient(135deg,#f97316,#fb923c)',
              color: '#fff', fontWeight: 900, fontSize: '17px',
              borderRadius: '14px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(249,115,22,.35)',
              marginTop: '8px',
            }}
          >
            {submitting ? '送信中...' : '✅ チェックインを完了する'}
          </button>
        </div>
      </div>
    </PracticeLogLayout>
  );
}
