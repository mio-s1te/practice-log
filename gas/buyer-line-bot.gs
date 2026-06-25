// ============================================================
// buyer-line-bot.gs
// 購入者専用LINE Bot（GASで実装）
//
// 【フロー】
//   購入者が「start_xxxxxxxxxxxxxxxx」を送信
//     ↓
//   Netlify API で purchase_code 照合
//     ↓ 照合成功
//   スプレッドシートに購入者情報を記録（既存列構成に準拠）
//     ↓
//   サムネ付きカードメッセージ（Flex Message）を返信
//     → 講座URL・アフィリエイト登録案内
//
// 【スプレッドシート列構成（既存シートに合わせる）】
//   A: 登録日時
//   B: LINE表示名
//   C: LINEユーザーID
//   D: メールアドレス
//   E: 購入商品
//   F: Stripe決済ID
//   G: 特典送付状況（手動管理・空欄で追加）
//   H: キーワード（= purchase_code: start_xxx）
//   I: ステータス
//   J: 最終メッセージ日時
//   K: メモ（空欄）
//   L: 入力待ち（空欄）
//   M: 同意日時（空欄）
//
// 【スプレッドシートID】
//   14DQw6Zn2w3GbwtcEN8q3-95Inf7im61ENsZZNvZh7c0
//
// 【スクリプトプロパティ設定】
//   LINE_CHANNEL_ACCESS_TOKEN : 購入者LINE Messaging API アクセストークン
//   LINE_CHANNEL_SECRET       : 購入者LINE チャンネルシークレット（署名検証用）
//   NETLIFY_URL               : 例 https://monumental-sundae-32018f.netlify.app
//   SPREADSHEET_ID            : 14DQw6Zn2w3GbwtcEN8q3-95Inf7im61ENsZZNvZh7c0
//   SHEET_NAME                : シート名（既存シート名に合わせる）
//   COURSE_URL                : 講座のURL（ノーション等）
//   AFFILIATE_REGISTER_URL    : アフィリエイト登録ページのURL（任意）
//   BOT_ICON_URL              : カードメッセージのサムネ画像URL（任意）
//
// 【LINEデプロイ手順】
//   1. このスクリプトをGASプロジェクトに貼り付け
//   2. デプロイ → 新しいデプロイ → ウェブアプリ
//      （実行: 自分 / アクセス: 全員）
//   3. デプロイURLを LINE Developers → Webhook URL に設定
//   4. 「Webhookの利用」をONにする
// ============================================================

// ============================================================
// 設定取得
// ============================================================
function getConfig() {
  const p = PropertiesService.getScriptProperties();
  return {
    accessToken:     p.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '',
    channelSecret:   p.getProperty('LINE_CHANNEL_SECRET')       || '',
    netlifyUrl:      p.getProperty('NETLIFY_URL')               || '',
    spreadsheetId:   p.getProperty('SPREADSHEET_ID')            || '',
    sheetName:       p.getProperty('SHEET_NAME')                || 'Sheet1',
    courseUrl:       p.getProperty('COURSE_URL')                || '',
    affiliateRegUrl: p.getProperty('AFFILIATE_REGISTER_URL')    || '',
    botIconUrl:      p.getProperty('BOT_ICON_URL')              || '',
  };
}

// ============================================================
// LINE Webhook エントリーポイント
// ============================================================
function doPost(e) {
  try {
    const config = getConfig();
    const body   = JSON.parse(e.postData.contents);
    const events = body.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId     = event.source.userId;
        const replyToken = event.replyToken;
        const text       = event.message.text.trim();

        // ── start_ で始まる購入コードを検知 ──────────────────
        if (text.startsWith('start_')) {
          handlePurchaseCode(userId, replyToken, text, config);
        }
      }
    }
  } catch (err) {
    console.error('[buyer-line-bot] doPost error:', err.message);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 購入コード処理のメイン
// ============================================================
function handlePurchaseCode(userId, replyToken, purchaseCode, config) {
  // ① Netlify APIで purchase_code を照合
  const purchaseData = verifyPurchaseCode(purchaseCode, config);

  if (!purchaseData || !purchaseData.found) {
    replyText(replyToken, config.accessToken,
      '購入コードが確認できませんでした。\n\n' +
      'コードをもう一度ご確認の上、正確にコピーして送信してください。\n' +
      '（購入完了ページまたは購入完了メールに記載されています）'
    );
    return;
  }

  // ② LINE プロフィール取得
  const profile     = getLineProfile(userId, config.accessToken);
  const displayName = profile ? profile.displayName : '';

  // ③ スプレッドシートに記録（既存列構成に準拠）
  const alreadyRecorded = recordToSpreadsheet({
    purchaseCode:    purchaseCode,
    stripeSessionId: purchaseData.stripe_session_id  || purchaseData.purchase_id || '',
    buyerEmail:      purchaseData.buyer_email         || '',
    lineUserId:      userId,
    lineDisplayName: displayName,
    productName:     purchaseData.product_name        || '',
  }, config);

  // ④ 返信メッセージ
  if (alreadyRecorded) {
    // 2回目以降（重複） → シンプルなメッセージ
    replyText(replyToken, config.accessToken,
      '✅ 購入確認済みです。\n\n' +
      '講座URLはこちらです👇\n' +
      config.courseUrl
    );
  } else {
    // 初回 → フルカードメッセージ
    replyFlexCard(replyToken, config.accessToken, {
      displayName,
      purchaseCode,
      courseUrl:       config.courseUrl,
      affiliateRegUrl: config.affiliateRegUrl,
      botIconUrl:      config.botIconUrl,
      productName:     purchaseData.product_name || 'AI副業1時間化スタート講座',
    });
  }
}

// ============================================================
// Netlify API: purchase_code 照合
// POST /api/affiliate-api/purchase/verify-code
// ============================================================
function verifyPurchaseCode(purchaseCode, config) {
  if (!config.netlifyUrl) {
    console.error('[verifyPurchaseCode] NETLIFY_URL not set');
    return null;
  }

  const url = config.netlifyUrl + '/api/affiliate-api/purchase/verify-code';
  try {
    const res = UrlFetchApp.fetch(url, {
      method:            'post',
      contentType:       'application/json',
      payload:           JSON.stringify({ purchase_code: purchaseCode }),
      muteHttpExceptions: true,
    });

    if (res.getResponseCode() === 200) {
      return JSON.parse(res.getContentText());
    }
    console.error('[verifyPurchaseCode] status:', res.getResponseCode(), res.getContentText());
    return null;
  } catch (err) {
    console.error('[verifyPurchaseCode] error:', err.message);
    return null;
  }
}

// ============================================================
// スプレッドシートに購入者情報を記録
//
// 【列構成（既存スプシに準拠）】
//   A: 登録日時
//   B: LINE表示名
//   C: LINEユーザーID
//   D: メールアドレス
//   E: 購入商品
//   F: Stripe決済ID
//   G: 特典送付状況（空）
//   H: キーワード（= purchase_code）
//   I: ステータス
//   J: 最終メッセージ日時
//   K: メモ（空）
//   L: 入力待ち（空）
//   M: 同意日時（空）
//
// 戻り値: true = 既に記録済み（重複）/ false = 新規記録
// ============================================================
function recordToSpreadsheet(data, config) {
  if (!config.spreadsheetId) {
    console.error('[recordToSpreadsheet] SPREADSHEET_ID not set');
    return false;
  }

  const ss    = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName(config.sheetName) || ss.getSheets()[0];

  if (!sheet) {
    console.error('[recordToSpreadsheet] Sheet not found:', config.sheetName);
    return false;
  }

  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  // ── 重複チェック（H列=キーワード + C列=LINEユーザーID）──────
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    // H列(8番目)とC列(3番目)を取得して照合
    const hCol = sheet.getRange(2, 8, lastRow - 1, 1).getValues(); // H: キーワード
    const cCol = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // C: LINEユーザーID
    for (let i = 0; i < hCol.length; i++) {
      if (hCol[i][0] === data.purchaseCode && cCol[i][0] === data.lineUserId) {
        console.log('[recordToSpreadsheet] Duplicate:', data.purchaseCode, data.lineUserId);
        return true; // 重複
      }
    }

    // ── 同じキーワードで別LINEアカウント → LINE情報を上書き ──
    for (let i = 0; i < hCol.length; i++) {
      if (hCol[i][0] === data.purchaseCode) {
        const rowNum = i + 2;
        sheet.getRange(rowNum, 2).setValue(data.lineDisplayName); // B: LINE表示名
        sheet.getRange(rowNum, 3).setValue(data.lineUserId);      // C: LINEユーザーID
        sheet.getRange(rowNum, 10).setValue(now);                  // J: 最終メッセージ日時
        console.log('[recordToSpreadsheet] Updated LINE info for row:', rowNum);
        return false;
      }
    }
  }

  // ── 新規行追加 ────────────────────────────────────────────
  sheet.appendRow([
    now,                       // A: 登録日時
    data.lineDisplayName,      // B: LINE表示名
    data.lineUserId,           // C: LINEユーザーID
    data.buyerEmail,           // D: メールアドレス
    data.productName,          // E: 購入商品
    data.stripeSessionId,      // F: Stripe決済ID
    '',                        // G: 特典送付状況（手動管理）
    data.purchaseCode,         // H: キーワード（= start_xxx）
    '購入確認済み',             // I: ステータス
    now,                       // J: 最終メッセージ日時
    '',                        // K: メモ
    '',                        // L: 入力待ち
    '',                        // M: 同意日時
  ]);

  console.log('[recordToSpreadsheet] New row added:', data.purchaseCode, data.buyerEmail);
  return false;
}

// ============================================================
// Flex Message（サムネ付きカード型）を送信
// ============================================================
function replyFlexCard(replyToken, accessToken, opts) {
  const {
    displayName,
    purchaseCode,
    courseUrl,
    affiliateRegUrl,
    botIconUrl,
    productName,
  } = opts;

  const heroBlock = botIconUrl
    ? {
        type:        'image',
        url:         botIconUrl,
        size:        'full',
        aspectRatio: '20:9',
        aspectMode:  'cover',
      }
    : null;

  const flexMessage = {
    type:    'flex',
    altText: `${displayName}さん、購入確認が取れました！講座URLをお届けします`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      ...(heroBlock ? { hero: heroBlock } : {}),
      body: {
        type:    'box',
        layout:  'vertical',
        spacing: 'md',
        contents: [
          {
            type:   'text',
            text:   '✅ 購入確認が取れました',
            weight: 'bold',
            size:   'lg',
            color:  '#1a7a4a',
            wrap:   true,
          },
          {
            type:  'text',
            text:  `${displayName}さん、「${productName}」のご購入ありがとうございます！`,
            size:  'sm',
            color: '#555555',
            wrap:  true,
          },
          {
            type:   'separator',
            margin: 'md',
          },
          {
            type:   'text',
            text:   '📚 講座を受け取る',
            weight: 'bold',
            size:   'sm',
            margin: 'md',
          },
          {
            type:  'text',
            text:  'こちらから講座にアクセスしてください。',
            size:  'xs',
            color: '#888888',
            wrap:  true,
          },
          ...(affiliateRegUrl
            ? [
                {
                  type:   'separator',
                  margin: 'md',
                },
                {
                  type:   'text',
                  text:   '💰 紹介して収益を得る（任意）',
                  weight: 'bold',
                  size:   'sm',
                  margin: 'md',
                },
                {
                  type:  'text',
                  text:  'この講座を紹介するだけで報酬が発生するアフィリエイト制度があります。',
                  size:  'xs',
                  color: '#888888',
                  wrap:  true,
                },
              ]
            : []),
          {
            type:   'text',
            text:   `購入コード: ${purchaseCode}`,
            size:   'xxs',
            color:  '#bbbbbb',
            margin: 'xl',
            wrap:   true,
          },
        ],
      },
      footer: {
        type:    'box',
        layout:  'vertical',
        spacing: 'sm',
        contents: [
          {
            type:  'button',
            style: 'primary',
            color: '#1a7a4a',
            action: {
              type:  'uri',
              label: '📚 講座を受け取る',
              uri:   courseUrl || 'https://example.com',
            },
          },
          ...(affiliateRegUrl
            ? [
                {
                  type:  'button',
                  style: 'secondary',
                  action: {
                    type:  'uri',
                    label: '💰 アフィリエイト登録（任意）',
                    uri:   affiliateRegUrl,
                  },
                },
              ]
            : []),
        ],
      },
    },
  };

  sendReply(replyToken, accessToken, [flexMessage]);
}

// ============================================================
// テキスト返信（シンプル版）
// ============================================================
function replyText(replyToken, accessToken, text) {
  sendReply(replyToken, accessToken, [
    { type: 'text', text },
  ]);
}

// ============================================================
// LINE Reply API 呼び出し
// ============================================================
function sendReply(replyToken, accessToken, messages) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  try {
    UrlFetchApp.fetch(url, {
      method:            'post',
      contentType:       'application/json',
      headers:           { 'Authorization': 'Bearer ' + accessToken },
      payload:           JSON.stringify({ replyToken, messages }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('[sendReply] error:', err.message);
  }
}

// ============================================================
// LINE プロフィール取得
// ============================================================
function getLineProfile(userId, accessToken) {
  try {
    const res = UrlFetchApp.fetch(
      'https://api.line.me/v2/bot/profile/' + encodeURIComponent(userId),
      {
        headers:            { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true,
      }
    );
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
    return null;
  } catch (err) {
    console.error('[getLineProfile] error:', err.message);
    return null;
  }
}

// ============================================================
// GET: 死活確認
// ============================================================
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'buyer-line-bot is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 手動テスト用
// GASエディタから直接実行して動作確認
// ============================================================
function testBot() {
  const config = getConfig();
  console.log('=== buyer-line-bot テスト ===');
  console.log('NETLIFY_URL:    ', config.netlifyUrl    || '（未設定）');
  console.log('SPREADSHEET_ID: ', config.spreadsheetId || '（未設定）');
  console.log('SHEET_NAME:     ', config.sheetName);
  console.log('COURSE_URL:     ', config.courseUrl     || '（未設定）');

  // ダミーコードで照合テスト
  const result = verifyPurchaseCode('start_TestDummyCode1234', config);
  console.log('照合結果:', JSON.stringify(result));
}
