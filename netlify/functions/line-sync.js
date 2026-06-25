// netlify/functions/line-sync.js
//
// ============================================================
// GAS → Netlify → Supabase 同期エンドポイント
// ============================================================
//
// 役割:
//   GAS (Google Apps Script) がLINE Webhookを受信してスプレッドシートに保存後、
//   このエンドポイントへ同一データを転送してSupabaseにも同期する。
//
// 処理フロー:
//   LINE公式アカウント
//     ↓ Webhook
//   GAS (既存運用を維持)
//     ↓ スプレッドシートに保存 (メイン処理)
//     ↓ POST /.netlify/functions/line-sync  (サイドカー同期)
//   Netlify Function (このファイル)
//     ↓
//   Supabase leads テーブルに upsert
//
// 認証:
//   リクエストヘッダー x-line-sync-secret に
//   環境変数 LINE_SYNC_SECRET と同じ値が必要。
//   一致しない場合は 401 を返す。
//
// 環境変数:
//   LINE_SYNC_SECRET          GAS共有シークレットキー（必須）
//   SUPABASE_URL              SupabaseプロジェクトURL
//   SUPABASE_SERVICE_ROLE_KEY Supabase Service Role Key
//
// POSTボディ (JSON):
//   {
//     "line_account_type"  : "free_seminar" | "purchaser",
//     "line_user_id"       : "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
//     "line_display_name"  : "山田太郎",
//     "email"              : "user@example.com",       // 任意
//     "status"             : "registered",             // GAS側のステータス
//     "keyword"            : "セミナー",               // 最後に送ったキーワード
//     "waiting_state"      : "waiting_email",          // GASの状態機械
//     "registered_at"      : "2025-06-12T10:00:00Z",  // LINE登録日時
//     "last_message_at"    : "2025-06-12T10:05:00Z",  // 最終メッセージ日時
//     "source"             : "line_official",
//     "campaign_id"        : "uuid-...",               // 任意
//     "affiliate_id"       : "uuid-...",               // 任意
//     "affiliate_code"     : "yamada_abc1",            // 任意
//     "click_id"           : "uuid-...",               // 任意
//     "product_id"         : "uuid-...",               // 任意
//     "spreadsheet_row_id" : "42"                      // スプシの行番号（任意）
//   }
//
// レスポンス:
//   200 { "ok": true, "lead_id": "...", "action": "created"|"updated" }
//   401 { "error": "Unauthorized" }
//   400 { "error": "..." }
//   500 { "error": "Internal server error" }

'use strict';

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-line-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  // プリフライト
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return res(405, { error: 'Method not allowed' });
  }

  // ── 認証チェック ──────────────────────────────────────────
  const secret = process.env.LINE_SYNC_SECRET;
  if (!secret) {
    console.error('[line-sync] LINE_SYNC_SECRET is not set');
    return res(500, { error: 'Server configuration error' });
  }

  const incoming = (event.headers['x-line-sync-secret'] || '').trim();
  if (!incoming || incoming !== secret) {
    console.warn('[line-sync] Invalid secret');
    return res(401, { error: 'Unauthorized' });
  }

  // ── ボディ解析 ────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return res(400, { error: 'Invalid JSON body' });
  }

  const {
    line_account_type,
    line_user_id,
    line_display_name,
    email,
    status,
    keyword,
    waiting_state,
    registered_at,
    last_message_at,
    source,
    campaign_id,
    affiliate_id,
    affiliate_code,
    click_id,
    product_id,
    spreadsheet_row_id,
  } = body;

  // 必須フィールドチェック
  if (!line_user_id) {
    return res(400, { error: 'line_user_id is required' });
  }
  if (!['free_seminar', 'purchaser'].includes(line_account_type)) {
    return res(400, { error: 'line_account_type must be "free_seminar" or "purchaser"' });
  }

  const now = new Date().toISOString();

  try {
    let leadId = null;
    let action = 'updated';

    // ──────────────────────────────────────────────────────
    // 無料セミナーLINE (free_seminar)
    // → leads.seminar_line_user_id + leads.line_user_id に保存
    // ──────────────────────────────────────────────────────
    if (line_account_type === 'free_seminar') {
      // 既存レコード検索（seminar_line_user_id または 旧 line_user_id で照合）
      const { data: existing } = await supabase
        .from('leads')
        .select('id, email, first_source, first_campaign_id, first_affiliate_id')
        .or(`line_user_id.eq.${line_user_id},seminar_line_user_id.eq.${line_user_id}`)
        .maybeSingle();

      const updatePayload = {
        line_user_id:              existing ? undefined : line_user_id,  // 新規のみ
        seminar_line_user_id:      line_user_id,
        seminar_line_display_name: line_display_name || null,
        current_display_name:      line_display_name || null,
        updated_at:                now,
      };

      // 表示名（初回 or 更新）
      if (line_display_name) {
        updatePayload.display_name = existing
          ? undefined  // 既存は上書きしない（current_display_name だけ更新）
          : line_display_name;
      }

      // メールは空でなければ更新（GASでメール取得できた場合）
      if (email) {
        updatePayload.email = email;
      }

      // 登録日時（初回のみ）
      if (registered_at && !existing) {
        updatePayload.registered_at = registered_at;
      }

      // アトリビューション（初回のみ設定）
      if (!existing) {
        action = 'created';
        updatePayload.line_user_id          = line_user_id;
        updatePayload.display_name          = line_display_name || null;
        updatePayload.registered_at         = registered_at || now;
        updatePayload.first_source          = source || 'line_official';
        updatePayload.latest_source         = source || 'line_official';

        if (campaign_id) {
          updatePayload.first_campaign_id  = campaign_id;
          updatePayload.latest_campaign_id = campaign_id;
        }
        if (affiliate_id) {
          updatePayload.first_affiliate_id  = affiliate_id;
          updatePayload.latest_affiliate_id = affiliate_id;
        }
      } else {
        // 既存: latest_* は常に更新
        updatePayload.latest_source = source || existing.latest_source || 'line_official';
        if (campaign_id)  updatePayload.latest_campaign_id  = campaign_id;
        if (affiliate_id) updatePayload.latest_affiliate_id = affiliate_id;
      }

      // undefined フィールドを除去
      Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

      if (existing) {
        const { data, error } = await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', existing.id)
          .select('id')
          .single();
        if (error) throw error;
        leadId = data.id;
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert(updatePayload)
          .select('id')
          .single();
        if (error) throw error;
        leadId = data.id;
      }

      // attribution_event を記録（LINE登録イベント）
      if (action === 'created') {
        await supabase.from('attribution_events').insert({
          lead_id:        leadId,
          line_user_id,
          affiliate_id:   affiliate_id   || null,
          affiliate_code: affiliate_code || null,
          campaign_id:    campaign_id    || null,
          product_id:     product_id     || null,
          click_id:       click_id       || null,
          source:         source         || 'line_official',
          event_type:     'line_register',
          created_at:     registered_at  || now,
          expires_at:     campaign_id
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        });
      }
    }

    // ──────────────────────────────────────────────────────
    // 購入者LINE (purchaser)
    // → leads.buyer_line_user_id に保存
    //   purchaser LINE は購入確認が取れた場合のみ紐づく想定だが、
    //   GASからの同期時点では「見込み確認」として記録し、
    //   購入確認はverify-buyer-line.jsで行う
    // ──────────────────────────────────────────────────────
    else if (line_account_type === 'purchaser') {
      // buyer_line_user_id か seminar_line_user_id/line_user_id で既存を検索
      const { data: byBuyer } = await supabase
        .from('leads')
        .select('id')
        .eq('buyer_line_user_id', line_user_id)
        .maybeSingle();

      // seminar_line側でも検索（同一人物の場合）
      const { data: bySeminar } = !byBuyer
        ? await supabase
            .from('leads')
            .select('id')
            .or(`line_user_id.eq.${line_user_id},seminar_line_user_id.eq.${line_user_id}`)
            .maybeSingle()
        : { data: null };

      const existing = byBuyer || bySeminar;

      const buyerPayload = {
        buyer_line_user_id:        line_user_id,
        buyer_line_display_name:   line_display_name || null,
        buyer_line_registered_at:  registered_at || now,
        updated_at:                now,
      };

      if (email) buyerPayload.email = email;

      if (existing) {
        const { data, error } = await supabase
          .from('leads')
          .update(buyerPayload)
          .eq('id', existing.id)
          .select('id')
          .single();
        if (error) throw error;
        leadId = data.id;
      } else {
        // セミナーLINEで未登録のケース（直接購入者LINEに登録した場合）
        action = 'created';
        const { data, error } = await supabase
          .from('leads')
          .insert({
            ...buyerPayload,
            display_name:    line_display_name || null,
            registered_at:   registered_at || now,
            first_source:    source || 'buyer_line',
            latest_source:   source || 'buyer_line',
          })
          .select('id')
          .single();
        if (error) throw error;
        leadId = data.id;
      }
    }

    // ── 同期ログ保存 ──────────────────────────────────────
    await supabase.from('line_sync_logs').insert({
      line_account_type,
      line_user_id,
      lead_id:          leadId,
      action,
      email:            email            || null,
      status:           status           || null,
      keyword:          keyword          || null,
      waiting_state:    waiting_state    || null,
      source:           source           || null,
      campaign_id:      campaign_id      || null,
      affiliate_id:     affiliate_id     || null,
      affiliate_code:   affiliate_code   || null,
      click_id:         click_id         || null,
      product_id:       product_id       || null,
      spreadsheet_row_id: spreadsheet_row_id ? String(spreadsheet_row_id) : null,
      synced_at:        now,
    });

    return res(200, {
      ok:      true,
      lead_id: leadId,
      action,
      line_account_type,
      line_user_id,
    });

  } catch (err) {
    console.error('[line-sync] Supabase error:', err);
    return res(500, { error: 'Internal server error', details: err.message });
  }
};

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────
function res(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}
