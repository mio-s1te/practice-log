// ============================================================
// purchase-sync.gs
// Netlify stripe-webhook.js からの購入者情報を
// Googleスプレッドシートに記録するGASスクリプト
//
// 【目的】
//   Stripe決済完了時に自動で購入者台帳へ記録
//   → LINE Bot照合前の事前記録、特典送付管理に使用
//
// 【スプレッドシート列構成（既存シートに準拠）】
//   A: 登録日時
//   B: LINE表示名（空 ← LINE連携前なので空）
//   C: LINEユーザーID（空 ← LINE連携前なので空）
//   D: メールアドレス
//   E: 購入商品
//   F: Stripe決済ID
//   G: 特典送付状況（空 ← 手動管理）
//   H: キーワード（= purchase_code: start_xxx）
//   I: ステータス
//   J: 最終メッセージ日時（空 ← LINE連携前）
//   K: メモ（空）
//   L: 入力待ち（空）
//   M: 同意日時（空）
//
// 【スプレッドシートID】
//   14DQw6Zn2w3GbwtcEN8q3-95Inf7im61ENsZZNvZh7c0
//
// 【セットアップ手順】
//   1. 対象のGoogleスプレッドシートを開く
//   2. 拡張機能 → Apps Script を開く
//   3. このファイルの内容を貼り付け
//   4. 「デプロイ」→「新しいデプロイ」→ 種類:ウェブアプリ
//      - 次のユーザーとして実行: 自分
//      - アクセスできるユーザー: 全員
//   5. デプロイURLをコピー → Netlify環境変数に設定:
//      GAS_PURCHASE_SYNC_URL=<デプロイURL>
//      GAS_PURCHASE_SYNC_SECRET=<任意の秘密キー>
//   6. スクリプトプロパティに設定:
//      PURCHASE_SYNC_SECRET: Netlifyと同じ秘密キー
//      SPREADSHEET_ID: 14DQw6Zn2w3GbwtcEN8q3-95Inf7im61ENsZZNvZh7c0
//      SHEET_NAME: 既存シート名（例: "フォームの回答 1" など）
//
// ============================================================

// ============================================================
// 設定取得
// ============================================================
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    secret:        props.getProperty('PURCHASE_SYNC_SECRET') || '',
    spreadsheetId: props.getProperty('SPREADSHEET_ID')       || '',
    sheetName:     props.getProperty('SHEET_NAME')           || 'Sheet1',
  };
}

// ============================================================
// 購入コードの重複チェック（H列=キーワード で照合）
// ============================================================
function isDuplicate(sheet, purchaseCode) {
  if (!purchaseCode) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  // H列（8番目）を取得して照合
  const hCol = sheet.getRange(2, 8, lastRow - 1, 1).getValues();
  return hCol.some(row => row[0] === purchaseCode);
}

// ============================================================
// メインWebhookエントリーポイント
// POST: Netlify stripe-webhook.js から呼び出される
// ============================================================
function doPost(e) {
  try {
    const config = getConfig();

    // ── ペイロード解析 ────────────────────────
    if (!e.postData || !e.postData.contents) {
      return buildResponse({ status: 'error', message: 'No payload' });
    }

    const payload = JSON.parse(e.postData.contents);

    // ── スプレッドシート取得 ──────────────────
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = ss.getSheetByName(config.sheetName) || ss.getSheets()[0];

    if (!sheet) {
      return buildResponse({ status: 'error', message: 'Sheet not found: ' + config.sheetName });
    }

    // ── 重複チェック（同じ purchase_code は1回だけ記録）──
    if (isDuplicate(sheet, payload.purchase_code)) {
      console.log('[purchase-sync] Duplicate purchase_code, skipping:', payload.purchase_code);
      return buildResponse({ status: 'skipped', message: 'Duplicate' });
    }

    // ── 新規行追加（既存列構成に準拠）────────────────────
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    const newRow = [
      now,                              // A: 登録日時
      '',                               // B: LINE表示名（LINE連携前は空）
      '',                               // C: LINEユーザーID（LINE連携前は空）
      payload.buyer_email    || '',     // D: メールアドレス
      payload.product_name   || '',     // E: 購入商品
      payload.stripe_session_id || payload.purchase_id || '',  // F: Stripe決済ID
      '',                               // G: 特典送付状況（手動管理）
      payload.purchase_code  || '',     // H: キーワード（= start_xxx）
      '購入完了',                        // I: ステータス
      '',                               // J: 最終メッセージ日時（LINE連携前は空）
      '',                               // K: メモ
      '',                               // L: 入力待ち
      '',                               // M: 同意日時
    ];

    sheet.appendRow(newRow);

    const newRowIndex = sheet.getLastRow();
    console.log('[purchase-sync] Recorded row', newRowIndex, ':', payload.purchase_code, payload.buyer_email);

    return buildResponse({
      status:        'ok',
      purchase_code: payload.purchase_code,
      row:           newRowIndex,
    });

  } catch (err) {
    console.error('[purchase-sync] Error:', err.message, err.stack);
    return buildResponse({ status: 'error', message: err.message });
  }
}

// ============================================================
// GETリクエスト: 動作確認用
// ============================================================
function doGet(e) {
  return buildResponse({
    status:    'ok',
    message:   'purchase-sync GAS is running',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// レスポンスビルダー
// ============================================================
function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 手動テスト用関数
// GASエディタから直接実行して動作確認
// ============================================================
function testPurchaseSync() {
  const config = getConfig();
  console.log('=== purchase-sync 動作テスト ===');
  console.log('SPREADSHEET_ID:', config.spreadsheetId || '（未設定）');
  console.log('SHEET_NAME:    ', config.sheetName);

  if (!config.spreadsheetId) {
    console.error('SPREADSHEET_ID が設定されていません。スクリプトプロパティを確認してください。');
    return;
  }

  // テスト用ダミーデータ
  const testPayload = {
    purchase_code:     'start_TestABCDEFGH1234',
    purchase_id:       'test-uuid-0000-0000-0000-000000000001',
    stripe_session_id: 'cs_test_xxxxxxxxxxxxxxxxxxxxxxxx',
    buyer_email:       'test@example.com',
    product_name:      'AI副業1時間化スタート講座',
    amount_total:      4980,
    purchased_at:      new Date().toISOString(),
  };

  // doPostをシミュレート
  const fakeEvent = {
    postData: { contents: JSON.stringify(testPayload) },
    parameter: {},
  };

  const result = doPost(fakeEvent);
  console.log('結果:', result.getContent());
}

// ============================================================
// 既存データのバックアップ用（月次実行など）
// ============================================================
function backupSheet() {
  const config = getConfig();
  if (!config.spreadsheetId) return;

  const ss    = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) return;

  const today      = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');
  const backupName = config.sheetName + '_backup_' + today;

  // 同名バックアップが既にあれば何もしない
  if (ss.getSheetByName(backupName)) return;

  sheet.copyTo(ss).setName(backupName);
  console.log('[purchase-sync] Backup created:', backupName);
}
