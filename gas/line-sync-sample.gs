// ============================================================
// GAS サンプルコード: LINE登録者データを Netlify へ同期
// ============================================================
//
// 【使い方】
//   既存の GAS プロジェクトにこのファイルの関数を追加してください。
//   LINE Webhook を受信してスプレッドシートに保存した後、
//   syncToNetlify() を呼び出すことで Supabase にも同期されます。
//
// 【処理フロー】
//   LINE公式アカウント
//     ↓ Webhook
//   doPost(e)  ← 既存の GAS Webhook エントリーポイント
//     ↓ スプレッドシートに保存（既存処理を維持）
//     ↓ syncToNetlify(payload) を呼び出し
//   Netlify Function (/.netlify/functions/line-sync)
//     ↓
//   Supabase leads テーブルに upsert
//
// 【必要なスクリプトプロパティの設定】
//   GAS エディタ → プロジェクトの設定 → スクリプトプロパティ に以下を追加:
//
//   NETLIFY_URL        例: https://your-site.netlify.app
//   LINE_SYNC_SECRET   Netlify 環境変数の LINE_SYNC_SECRET と同じ値
//   SPREADSHEET_ID     スプレッドシートの ID（URL から取得）
//   SEMINAR_SHEET_NAME 無料セミナーLINE のシート名（例: "LINE登録者"）
//   BUYER_SHEET_NAME   購入者LINE のシート名（例: "購入者LINE登録者"）
//   LINE_ACCOUNT_TYPE  このスクリプトが担当するアカウント種別
//                      "free_seminar" or "purchaser"
//
// ============================================================

// ============================================================
// 設定取得ヘルパー
// ============================================================
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    netlifyUrl:       props.getProperty('NETLIFY_URL')        || '',
    syncSecret:       props.getProperty('LINE_SYNC_SECRET')   || '',
    spreadsheetId:    props.getProperty('SPREADSHEET_ID')     || '',
    seminarSheetName: props.getProperty('SEMINAR_SHEET_NAME') || 'LINE登録者',
    buyerSheetName:   props.getProperty('BUYER_SHEET_NAME')   || '購入者LINE登録者',
    lineAccountType:  props.getProperty('LINE_ACCOUNT_TYPE')  || 'free_seminar',
  };
}

// ============================================================
// Netlify への同期関数（メイン）
// ============================================================
/**
 * GAS から Netlify Function にデータを送信して Supabase へ同期する。
 *
 * @param {Object} payload - 送信データ（line-sync.js の仕様に準拠）
 * @param {string} payload.line_account_type  "free_seminar" | "purchaser"
 * @param {string} payload.line_user_id       LINE の userId
 * @param {string} [payload.line_display_name] LINE の表示名
 * @param {string} [payload.email]            メールアドレス
 * @param {string} [payload.status]           GAS 側のステータス
 * @param {string} [payload.keyword]          最後に送信したキーワード
 * @param {string} [payload.waiting_state]    GAS の状態機械の状態
 * @param {string} [payload.registered_at]   LINE 登録日時（ISO 8601）
 * @param {string} [payload.last_message_at] 最終メッセージ日時（ISO 8601）
 * @param {string} [payload.source]          流入元
 * @param {string} [payload.campaign_id]     キャンペーン UUID
 * @param {string} [payload.affiliate_id]    紹介者 UUID
 * @param {string} [payload.affiliate_code]  紹介コード
 * @param {string} [payload.click_id]        クリック UUID
 * @param {string} [payload.product_id]      商品 UUID
 * @param {string|number} [payload.spreadsheet_row_id] スプシ行番号
 * @returns {Object|null} - Netlify からのレスポンス、またはエラー時 null
 */
function syncToNetlify(payload) {
  const config = getConfig();

  if (!config.netlifyUrl || !config.syncSecret) {
    console.error('[line-sync] NETLIFY_URL or LINE_SYNC_SECRET is not set in Script Properties');
    return null;
  }

  const endpoint = config.netlifyUrl + '/.netlify/functions/line-sync';

  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-line-sync-secret': config.syncSecret,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,  // HTTP エラーでも例外を起こさず responseCode を返す
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    const statusCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (statusCode === 200) {
      const result = JSON.parse(responseBody);
      console.log('[line-sync] Sync succeeded:', JSON.stringify(result));
      return result;
    } else if (statusCode === 401) {
      console.error('[line-sync] Unauthorized: Check LINE_SYNC_SECRET in Script Properties');
      return null;
    } else {
      console.error('[line-sync] Sync failed, status=' + statusCode + ', body=' + responseBody);
      return null;
    }
  } catch (e) {
    console.error('[line-sync] Network error:', e.message);
    return null;
  }
}

// ============================================================
// GAS Webhook エントリーポイントへの組み込みサンプル
// ============================================================
// 以下は既存の doPost 関数への追加例です。
// 既存の doPost がある場合は「// ★ Netlify 同期追加」の行のみ追加してください。

/**
 * LINE Webhook エントリーポイント（既存関数への追加例）
 * 
 * ⚠️ 注意: これはサンプルコードです。
 *   - 既存の doPost 関数に「★ Netlify 同期追加」のブロックを追加してください。
 *   - doPost 関数を丸ごと置き換えないでください。
 */
function doPost_SAMPLE(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events || [];

    for (const event of events) {
      if (event.type === 'follow') {
        // ────────────────────────────────────
        // 既存処理（友達追加イベント）
        // ────────────────────────────────────
        const userId = event.source.userId;
        const timestamp = new Date(event.timestamp);

        // プロフィール取得（既存処理）
        const profile = getLineProfile(userId);  // 既存関数

        // スプレッドシートに保存（既存処理）
        const rowIndex = appendToSeminarSheet(userId, profile, timestamp);  // 既存関数

        // ★ Netlify 同期追加（ここから）
        const config = getConfig();
        syncToNetlify({
          line_account_type:  config.lineAccountType,  // "free_seminar" or "purchaser"
          line_user_id:       userId,
          line_display_name:  profile ? profile.displayName : null,
          status:             'registered',
          registered_at:      timestamp.toISOString(),
          spreadsheet_row_id: rowIndex,
        });
        // ★ Netlify 同期追加（ここまで）
      }

      else if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text   = event.message.text.trim();
        const timestamp = new Date(event.timestamp);

        // ────────────────────────────────────
        // メール収集ボタン処理（既存処理）
        // ────────────────────────────────────
        if (isEmail(text)) {
          // スプレッドシートのメール列を更新（既存処理）
          const rowIndex = updateEmailInSheet(userId, text);  // 既存関数

          // ★ Netlify 同期追加（メール取得後に同期）
          const config = getConfig();
          syncToNetlify({
            line_account_type: config.lineAccountType,
            line_user_id:      userId,
            email:             text,
            keyword:           'email_submitted',
            waiting_state:     'email_collected',
            spreadsheet_row_id: rowIndex,
          });
          // ★ Netlify 同期追加（ここまで）
        }

        // ────────────────────────────────────
        // キーワード応答（既存処理）
        // ────────────────────────────────────
        else {
          handleKeywordReply(userId, text, timestamp);  // 既存関数

          // ★ Netlify 同期追加（キーワード記録）
          const config = getConfig();
          syncToNetlify({
            line_account_type: config.lineAccountType,
            line_user_id:      userId,
            keyword:           text,
            last_message_at:   timestamp.toISOString(),
          });
          // ★ Netlify 同期追加（ここまで）
        }
      }
    }
  } catch (e) {
    console.error('[doPost] Error:', e.message);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 購入者LINE 専用: メール取得後の同期（purchaser アカウント）
// ============================================================
/**
 * 購入者LINE でメールアドレスが取得できた後に呼び出す。
 * 使い方: 既存の purchaser アカウント用 GAS に追加してください。
 *
 * @param {string} userId     LINE userId
 * @param {string} email      取得したメールアドレス
 * @param {number} [rowIndex] スプレッドシートの行番号
 */
function syncPurchaserEmail(userId, email, rowIndex) {
  syncToNetlify({
    line_account_type:  'purchaser',
    line_user_id:       userId,
    email:              email,
    keyword:            'email_submitted',
    waiting_state:      'email_collected',
    spreadsheet_row_id: rowIndex,
  });
}

// ============================================================
// 手動テスト用: GAS エディタから直接実行して動作確認
// ============================================================
/**
 * テスト実行用。GAS エディタから手動で呼び出して接続を確認します。
 * 実行方法: GAS エディタ → 関数を選択 → 「testLineSyncIntegration」を選択 → ▶実行
 */
function testLineSyncIntegration() {
  const config = getConfig();

  console.log('=== line-sync 接続テスト ===');
  console.log('NETLIFY_URL:', config.netlifyUrl || '（未設定）');
  console.log('LINE_SYNC_SECRET:', config.syncSecret ? '（設定済み）' : '（未設定）');

  if (!config.netlifyUrl || !config.syncSecret) {
    console.error('スクリプトプロパティが設定されていません。');
    console.error('GAS エディタ → プロジェクトの設定 → スクリプトプロパティ を確認してください。');
    return;
  }

  // テスト用のダミーデータ（実際には存在しない userId）
  const testPayload = {
    line_account_type:  config.lineAccountType || 'free_seminar',
    line_user_id:       'U_TEST_' + new Date().getTime(),
    line_display_name:  'GASテストユーザー',
    email:              'gas-test@example.com',
    status:             'registered',
    keyword:            'test',
    registered_at:      new Date().toISOString(),
    spreadsheet_row_id: '999',
  };

  console.log('送信データ:', JSON.stringify(testPayload, null, 2));

  const result = syncToNetlify(testPayload);

  if (result) {
    console.log('✅ 接続成功！');
    console.log('レスポンス:', JSON.stringify(result, null, 2));
  } else {
    console.error('❌ 接続失敗。コンソールのエラーを確認してください。');
  }
}

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * 文字列がメールアドレス形式かどうかを判定する。
 * @param {string} text
 * @returns {boolean}
 */
function isEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

/**
 * LINE ユーザープロフィールを取得する。
 * 既存 GAS に同名の関数がある場合は削除してください。
 *
 * @param {string} userId
 * @returns {Object|null} - { displayName, pictureUrl, ... } or null
 */
function getLineProfile(userId) {
  const config = getConfig();
  const channelAccessToken = PropertiesService.getScriptProperties()
    .getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '';

  if (!channelAccessToken) {
    console.warn('[getLineProfile] LINE_CHANNEL_ACCESS_TOKEN is not set');
    return null;
  }

  try {
    const url = 'https://api.line.me/v2/bot/profile/' + encodeURIComponent(userId);
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + channelAccessToken },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    }
    return null;
  } catch (e) {
    console.error('[getLineProfile] Error:', e.message);
    return null;
  }
}
