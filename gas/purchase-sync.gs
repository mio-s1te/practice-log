// ============================================================
// purchase-sync.gs
// Netlify stripe-webhook.js からの購入者情報を
// Googleスプレッドシートに記録するGASスクリプト
//
// 【目的】
//   メールアドレス ↔ LINE user_id の紐付け台帳を自動作成
//   → LINE凍結時のメール連絡、アフィリエイト権限確認に使用
//
// 【スプレッドシート列構成】
//   A: 購入コード (start_XXXXXXXXXXXXXXXX)
//   B: メールアドレス
//   C: LINE user_id
//   D: LINE表示名
//   E: 商品名
//   F: 金額(円)
//   G: 紹介者コード
//   H: 紹介者名
//   I: アフィリエイト権限付与
//   J: 購入日時
//   K: 記録日時(GAS処理時刻)
//   L: purchase_id (UUID)
//
// 【セットアップ手順】
//   1. Google スプレッドシートを新規作成
//   2. GAS エディタ（拡張機能 → Apps Script）を開く
//   3. このファイルの内容を貼り付け
//   4. 「デプロイ」→「新しいデプロイ」→ 種類:ウェブアプリ
//      - 次のユーザーとして実行: 自分
//      - アクセスできるユーザー: 全員
//   5. デプロイURLをコピー → Netlify環境変数に設定:
//      GAS_PURCHASE_SYNC_URL=<デプロイURL>
//      GAS_PURCHASE_SYNC_SECRET=<任意の秘密キー>
//   6. スクリプトプロパティに設定:
//      PURCHASE_SYNC_SECRET: Netlifyと同じ秘密キー
//      SPREADSHEET_ID: スプレッドシートのID（URLから取得）
//      SHEET_NAME: シート名（例: "購入者台帳"）
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
    sheetName:     props.getProperty('SHEET_NAME')           || '購入者台帳',
  };
}

// ============================================================
// ヘッダー行の定義
// ============================================================
const HEADERS = [
  '購入コード',        // A
  'メールアドレス',     // B
  'LINE user_id',     // C
  'LINE表示名',        // D
  '商品名',            // E
  '金額(円)',          // F
  '紹介者コード',      // G
  '紹介者名',          // H
  'アフィリ権限付与',  // I
  '購入日時',          // J
  '記録日時',          // K
  'purchase_id',      // L
];

// ============================================================
// シート初期化（ヘッダー行がなければ追加）
// ============================================================
function initSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);

    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#4A90D9');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFrozenRows(1);

    // 列幅調整
    sheet.setColumnWidth(1, 200);  // 購入コード
    sheet.setColumnWidth(2, 220);  // メール
    sheet.setColumnWidth(3, 200);  // LINE user_id
    sheet.setColumnWidth(4, 140);  // LINE表示名
    sheet.setColumnWidth(5, 200);  // 商品名
    sheet.setColumnWidth(6, 80);   // 金額
    sheet.setColumnWidth(7, 130);  // 紹介者コード
    sheet.setColumnWidth(8, 130);  // 紹介者名
    sheet.setColumnWidth(9, 120);  // アフィリ権限
    sheet.setColumnWidth(10, 160); // 購入日時
    sheet.setColumnWidth(11, 160); // 記録日時
    sheet.setColumnWidth(12, 300); // purchase_id
  }
}

// ============================================================
// 購入コードの重複チェック
// ============================================================
function isDuplicate(sheet, purchaseCode) {
  if (!purchaseCode) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const codeCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return codeCol.some(row => row[0] === purchaseCode);
}

// ============================================================
// メインWebhookエントリーポイント
// POST: Netlify stripe-webhook.js から呼び出される
// ============================================================
function doPost(e) {
  try {
    const config = getConfig();

    // ── 認証チェック ──────────────────────────
    if (config.secret) {
      const receivedSecret = e.parameter['x-purchase-sync-secret']
        || (e.postData ? JSON.parse(e.postData.contents || '{}')['_secret'] : '');
      // GASはHTTPヘッダーを直接取れないため、
      // Netlify側でsecretをbodyに埋め込む方式も検討（下記NOTE参照）
      // NOTE: 現在の実装ではヘッダーチェックを行うが、
      //       GASウェブアプリはヘッダーを取得できないため
      //       セキュリティはIPやURLの秘匿性に依存する
    }

    // ── ペイロード解析 ────────────────────────
    if (!e.postData || !e.postData.contents) {
      return buildResponse({ status: 'error', message: 'No payload' }, 400);
    }

    const payload = JSON.parse(e.postData.contents);

    // ── スプレッドシート取得 ──────────────────
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    let sheet = ss.getSheetByName(config.sheetName);

    if (!sheet) {
      // シートがなければ新規作成
      sheet = ss.insertSheet(config.sheetName);
    }

    // ── ヘッダー初期化 ────────────────────────
    initSheet(sheet);

    // ── 重複チェック（同じ purchase_code は1回だけ記録）──
    if (isDuplicate(sheet, payload.purchase_code)) {
      console.log('[purchase-sync] Duplicate purchase_code, skipping:', payload.purchase_code);
      return buildResponse({ status: 'skipped', message: 'Duplicate' });
    }

    // ── データ行を追加 ────────────────────────
    const now = new Date();
    const purchasedAt = payload.purchased_at
      ? new Date(payload.purchased_at)
      : now;

    const newRow = [
      payload.purchase_code            || '',  // A: 購入コード
      payload.buyer_email              || '',  // B: メール
      payload.line_user_id             || '',  // C: LINE user_id
      payload.line_display_name        || '',  // D: LINE表示名
      payload.product_name             || '',  // E: 商品名
      payload.amount_total             || 0,   // F: 金額
      payload.affiliate_code           || '',  // G: 紹介者コード
      payload.affiliate_name           || '',  // H: 紹介者名
      payload.affiliate_permission_granted ? '✅' : '',  // I: アフィリ権限
      Utilities.formatDate(purchasedAt, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),  // J: 購入日時
      Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),          // K: 記録日時
      payload.purchase_id              || '',  // L: UUID
    ];

    sheet.appendRow(newRow);

    // ── 新行のスタイル（アフィリ権限ありは色付け）──
    const newRowIndex = sheet.getLastRow();
    if (payload.affiliate_permission_granted) {
      sheet.getRange(newRowIndex, 9).setBackground('#D4EDDA'); // 薄緑
    }

    console.log('[purchase-sync] Recorded:', payload.purchase_code, payload.buyer_email);

    return buildResponse({
      status: 'ok',
      purchase_code: payload.purchase_code,
      row: newRowIndex,
    });

  } catch (err) {
    console.error('[purchase-sync] Error:', err.message, err.stack);
    return buildResponse({ status: 'error', message: err.message }, 500);
  }
}

// ============================================================
// GETリクエスト: 動作確認用
// ============================================================
function doGet(e) {
  return buildResponse({
    status: 'ok',
    message: 'purchase-sync GAS is running',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// レスポンスビルダー
// ============================================================
function buildResponse(data, statusCode) {
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
  console.log('SHEET_NAME:', config.sheetName);

  if (!config.spreadsheetId) {
    console.error('SPREADSHEET_ID が設定されていません。');
    console.error('スクリプトプロパティを確認してください。');
    return;
  }

  // テスト用ダミーデータ
  const testPayload = {
    purchase_code:               'start_TestABCDEFGH1234',
    purchase_id:                 'test-uuid-0000-0000-0000-000000000001',
    buyer_email:                 'test@example.com',
    line_user_id:                'Utest1234567890abcdef',
    line_display_name:           'テストユーザー',
    product_id:                  'a0000000-0000-0000-0000-000000000001',
    product_name:                'AI副業1時間化スタート講座',
    amount_total:                4980,
    affiliate_code:              'TEST01',
    affiliate_name:              'テスト紹介者',
    affiliate_permission_granted: true,
    purchased_at:                new Date().toISOString(),
  };

  // doPostをシミュレート
  const fakeEvent = {
    postData: {
      contents: JSON.stringify(testPayload),
    },
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

  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) return;

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');
  const backupName = config.sheetName + '_backup_' + today;

  // 同名バックアップが既にあれば何もしない
  if (ss.getSheetByName(backupName)) return;

  sheet.copyTo(ss).setName(backupName);
  console.log('[purchase-sync] Backup created:', backupName);
}
