// netlify/functions/line-webhook.js
// LINE公式アカウント Webhookハンドラ
// 無料セミナーLINE / 購入者LINE の2アカウント対応
//
// URL設計:
//   /.netlify/functions/line-webhook?account=seminar  → 無料セミナーLINE用
//   /.netlify/functions/line-webhook?account=buyer    → 購入者LINE用
//
// 環境変数:
//   LINE_SEMINAR_CHANNEL_SECRET   → 無料セミナーLINEのチャンネルシークレット
//   LINE_SEMINAR_CHANNEL_ACCESS_TOKEN → 無料セミナーLINEのアクセストークン
//   LINE_BUYER_CHANNEL_SECRET     → 購入者LINEのチャンネルシークレット
//   LINE_BUYER_CHANNEL_ACCESS_TOKEN   → 購入者LINEのアクセストークン
//   SITE_URL                      → アプリのURL (例: https://your-app.netlify.app)

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

const SITE_URL = process.env.SITE_URL || 'https://localhost:3000';

// キャッシュ: キーワード応答をメモリに一時保存（10分TTL）
let keywordCache = { seminar: null, buyer: null, lastFetched: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // どちらのLINEアカウントか判定
  const account = event.queryStringParameters?.account || 'seminar';
  const lineType = account === 'buyer' ? 'buyer' : 'seminar';

  const channelSecret =
    lineType === 'buyer'
      ? process.env.LINE_BUYER_CHANNEL_SECRET
      : process.env.LINE_SEMINAR_CHANNEL_SECRET;

  const channelAccessToken =
    lineType === 'buyer'
      ? process.env.LINE_BUYER_CHANNEL_ACCESS_TOKEN
      : process.env.LINE_SEMINAR_CHANNEL_ACCESS_TOKEN;

  // ----------------------------------------
  // Webhook署名検証
  // ----------------------------------------
  const signature = event.headers['x-line-signature'];
  if (!signature || !channelSecret) {
    console.error(`[${lineType}] Missing signature or channel secret`);
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const hmac = crypto
    .createHmac('SHA256', channelSecret)
    .update(event.body)
    .digest('base64');

  if (hmac !== signature) {
    console.error(`[${lineType}] Signature mismatch`);
    return { statusCode: 401, body: 'Invalid signature' };
  }

  // ----------------------------------------
  // イベント処理
  // ----------------------------------------
  let webhookBody;
  try {
    webhookBody = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const events = webhookBody.events || [];

  for (const lineEvent of events) {
    try {
      await handleLineEvent(lineEvent, lineType, channelAccessToken);
    } catch (err) {
      console.error(`[${lineType}] Event handling error:`, err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// ============================================================
// LINEイベントハンドラ
// ============================================================
async function handleLineEvent(lineEvent, lineType, accessToken) {
  const { type, source, replyToken, message } = lineEvent;
  const lineUserId = source?.userId;

  if (!lineUserId) return;

  // フォロー（友だち追加）イベント
  if (type === 'follow') {
    await handleFollow(lineUserId, lineType, accessToken, replyToken);
    return;
  }

  // テキストメッセージ
  if (type === 'message' && message?.type === 'text') {
    await handleTextMessage(lineUserId, lineType, message.text, accessToken, replyToken);
    return;
  }
}

// ============================================================
// 友だち追加時の処理
// ============================================================
async function handleFollow(lineUserId, lineType, accessToken, replyToken) {
  // LINEプロフィール取得
  const profile = await getLineProfile(lineUserId, accessToken);
  const displayName = profile?.displayName || '';

  if (lineType === 'seminar') {
    // 無料セミナーLINE: leadsテーブルに追加/更新
    await upsertSeminarLead(lineUserId, displayName);

    // ウェルカムメッセージ
    await replyMessage(accessToken, replyToken, [
      {
        type: 'text',
        text: `${displayName}さん、友だち追加ありがとうございます！🎉

AIで副業を1時間で始める方法をお伝えしています。

まずは無料セミナーをご覧ください👇
${SITE_URL}/seminar

「セミナー」「ロードマップ」「スタート講座」「価格」「アフィリエイト」「質問」と送ると詳細をご案内します😊`,
      },
    ]);
  } else {
    // 購入者LINE: 購入確認フロー
    const purchaseInfo = await checkPurchaseByLineUserId(lineUserId);

    if (purchaseInfo) {
      // セミナーLINEのuser_idで購入確認できた場合
      await linkBuyerLine(purchaseInfo.leadId, lineUserId, displayName);
      await replyMessage(accessToken, replyToken, [
        {
          type: 'text',
          text: `${displayName}さん、購入者専用LINEへようこそ！🎊

ご購入を確認しました。
「講座」と送ると講座URLをお届けします📚

【利用できるキーワード】
・講座 → 講座URLを受け取る
・第0章〜第1章 → 各章を開く
・ワーク → ワークシートを受け取る
・ToDo → ToDoアプリを開く
・特典 → 特典を受け取る
・紹介 → 紹介制度の案内
・アフィリエイト参加 → 参加申請
・紹介者画面 → ダッシュボードを開く`,
        },
      ]);
    } else {
      // 購入確認できない → メール入力を促す
      await replyMessage(accessToken, replyToken, [
        {
          type: 'text',
          text: `購入者専用LINEへのご登録ありがとうございます。

購入確認が取れませんでした。
決済時のメールアドレスを送ってください。

例：example@gmail.com`,
        },
      ]);
    }
  }
}

// ============================================================
// テキストメッセージ処理
// ============================================================
async function handleTextMessage(lineUserId, lineType, text, accessToken, replyToken) {
  const trimmedText = text.trim();

  // ----------------------------------------
  // 購入者LINE: メールアドレス入力による購入確認
  // ----------------------------------------
  if (lineType === 'buyer') {
    // まだ紐づいていない場合のみ確認フローを実行
    const alreadyLinked = await isBuyerLineLinked(lineUserId);

    if (!alreadyLinked) {
      // メールアドレス形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedText)) {
        const purchaseInfo = await checkPurchaseByEmail(trimmedText);
        if (purchaseInfo) {
          const profile = await getLineProfile(lineUserId, accessToken);
          const displayName = profile?.displayName || '';
          await linkBuyerLine(purchaseInfo.leadId, lineUserId, displayName);

          await replyMessage(accessToken, replyToken, [
            {
              type: 'text',
              text: `✅ 購入を確認しました！

${displayName}さん、ようこそ購入者専用LINEへ！

「講座」と送ると講座URLをお届けします📚

【利用できるキーワード】
・講座 → 講座URLを受け取る
・第0章〜第1章 → 各章を開く
・ワーク → ワークシートを受け取る
・ToDo → ToDoアプリを開く
・特典 → 特典を受け取る
・紹介 → 紹介制度の案内
・アフィリエイト参加 → 参加申請
・紹介者画面 → ダッシュボードを開く`,
            },
          ]);
          return;
        } else {
          // メールでも確認できない
          await replyMessage(accessToken, replyToken, [
            {
              type: 'text',
              text: `そのメールアドレスで購入記録が見つかりませんでした。

以下をご確認ください：
・Stripeの決済完了メールに記載のアドレス
・メールアドレスの入力ミスがないか

再度正しいメールアドレスを送ってください。
解決しない場合はこちらにメッセージをお送りください。`,
            },
          ]);
          return;
        }
      }

      // キーワードを送ったが未認証の場合
      const keywords = await getKeywords('buyer');
      const matched = keywords.find(k =>
        trimmedText.includes(k.keyword) && k.requires_purchase
      );
      if (matched) {
        await replyMessage(accessToken, replyToken, [
          {
            type: 'text',
            text: `購入確認が取れませんでした。決済時のメールアドレスを送ってください。

例：example@gmail.com`,
          },
        ]);
        return;
      }
    }
  }

  // ----------------------------------------
  // キーワードマッチング
  // ----------------------------------------
  const keywords = await getKeywords(lineType);
  const matched = keywords.find(k => trimmedText.includes(k.keyword));

  if (!matched) {
    // マッチなし:
    // buyer → チャットで普通の会話もするので完全無視（返信しない）
    // seminar → キーワード案内を返す
    if (lineType === 'seminar') {
      const defaultReply = `メッセージありがとうございます😊

以下のキーワードをお試しください：
・セミナー
・ロードマップ
・スタート講座
・価格
・アフィリエイト
・質問`;
      await replyMessage(accessToken, replyToken, [{ type: 'text', text: defaultReply }]);
    }
    // buyer は何も返さない（手動チャットで対応）
    return;
  }

  // 購入確認が必要なキーワードを認証済みか確認
  if (matched.requires_purchase && lineType === 'buyer') {
    const linked = await isBuyerLineLinked(lineUserId);
    if (!linked) {
      await replyMessage(accessToken, replyToken, [
        {
          type: 'text',
          text: `購入確認が取れませんでした。決済時のメールアドレスを送ってください。`,
        },
      ]);
      return;
    }
  }

  // 返信テキストのプレースホルダー置換
  const replyText = (matched.reply_text || '').replace(/\{\{SITE_URL\}\}/g, SITE_URL);

  // 講座URL送信時は受取日時を記録
  if (lineType === 'buyer' && trimmedText.includes('講座')) {
    await recordCourseDelivery(lineUserId);
  }

  await replyMessage(accessToken, replyToken, [{ type: 'text', text: replyText }]);
}

// ============================================================
// ユーティリティ関数
// ============================================================

/** LINEメッセージ返信 */
async function replyMessage(accessToken, replyToken, messages) {
  if (!replyToken || replyToken === 'dummy') return;
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('LINE reply error:', res.status, body);
    }
  } catch (err) {
    console.error('replyMessage error:', err);
  }
}

/** LINEプッシュメッセージ（replyToken不要） */
async function pushMessage(accessToken, toUserId, messages) {
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ to: toUserId, messages }),
    });
  } catch (err) {
    console.error('pushMessage error:', err);
  }
}

/** LINEプロフィール取得 */
async function getLineProfile(userId, accessToken) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return res.json();
  } catch {}
  return null;
}

/** キーワード一覧取得（キャッシュ付き） */
async function getKeywords(lineType) {
  const now = Date.now();
  if (keywordCache[lineType] && now - keywordCache.lastFetched < CACHE_TTL_MS) {
    return keywordCache[lineType];
  }
  const { data } = await supabase
    .from('line_keyword_responses')
    .select('*')
    .eq('line_type', lineType)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  keywordCache[lineType] = data || [];
  keywordCache.lastFetched = now;
  return keywordCache[lineType];
}

/** 無料セミナーLINEの登録者を leadsテーブルに upsert */
async function upsertSeminarLead(lineUserId, displayName) {
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .or(`line_user_id.eq.${lineUserId},seminar_line_user_id.eq.${lineUserId}`)
    .single();

  if (existing) {
    await supabase
      .from('leads')
      .update({
        seminar_line_user_id: lineUserId,
        seminar_line_display_name: displayName,
        current_display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('leads').insert({
      line_user_id: lineUserId,
      seminar_line_user_id: lineUserId,
      seminar_line_display_name: displayName,
      display_name: displayName,
      current_display_name: displayName,
      registered_at: new Date().toISOString(),
    });
  }
}

/** セミナーLINE userId で購入確認 */
async function checkPurchaseByLineUserId(buyerLineUserId) {
  // 購入者LINEに登録してきたuser_idを、セミナーLINEのuser_idと照合
  // 同一人物がセミナーLINEで登録し購入している可能性
  const { data: lead } = await supabase
    .from('leads')
    .select('id, line_user_id, seminar_line_user_id, purchase_count')
    .or(`line_user_id.eq.${buyerLineUserId},seminar_line_user_id.eq.${buyerLineUserId}`)
    .gt('purchase_count', 0)
    .single();

  if (lead) {
    return { leadId: lead.id };
  }

  // purchasesテーブルを buyer_line_user_id で照合
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id, lead_id')
    .eq('buyer_line_user_id', buyerLineUserId)
    .eq('status', 'completed')
    .limit(1)
    .single();

  if (purchase?.lead_id) {
    return { leadId: purchase.lead_id };
  }
  return null;
}

/** メールアドレスで購入確認 */
async function checkPurchaseByEmail(email) {
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id, lead_id, buyer_email')
    .ilike('buyer_email', email.trim())
    .eq('status', 'completed')
    .order('purchased_at', { ascending: false })
    .limit(1)
    .single();

  if (purchase) {
    // lead_idがない場合、leadsテーブルをメールで検索
    let leadId = purchase.lead_id;
    if (!leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .ilike('email', email.trim())
        .single();
      leadId = lead?.id;
    }
    return { leadId, purchaseId: purchase.id };
  }
  return null;
}

/** 購入者LINEをリードに紐づけ */
async function linkBuyerLine(leadId, buyerLineUserId, displayName) {
  if (!leadId) return;

  await supabase
    .from('leads')
    .update({
      buyer_line_user_id: buyerLineUserId,
      buyer_line_display_name: displayName,
      buyer_line_registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  // 確認記録
  await supabase.from('buyer_line_verifications').insert({
    lead_id: leadId,
    buyer_line_user_id: buyerLineUserId,
    buyer_line_display_name: displayName,
    verified_by: 'line_user_id',
    status: 'verified',
  });
}

/** 購入者LINEがすでに紐づいているか確認 */
async function isBuyerLineLinked(buyerLineUserId) {
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('buyer_line_user_id', buyerLineUserId)
    .limit(1)
    .single();
  return !!data;
}

/** 講座URL送信を記録 */
async function recordCourseDelivery(buyerLineUserId) {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, course_delivery_status')
      .eq('buyer_line_user_id', buyerLineUserId)
      .single();

    if (lead && lead.course_delivery_status !== 'delivered') {
      await supabase
        .from('leads')
        .update({
          course_received_at: new Date().toISOString(),
          course_delivery_status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
    }
  } catch {}
}
