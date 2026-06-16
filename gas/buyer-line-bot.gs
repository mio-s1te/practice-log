// ============================================================
// buyer-line-bot.gs
// 購入者専用LINE Bot（GASで実装）
//
// 【フロー】
//   購入者が「start_xxxxxxxxxxxxxxxx」を送信
//     ↓
//   Netlify API で purchase_code 照合
//     ↓ 照合成功
//   スプレッドシートに メール ↔ LINE 紐付けを記録
//     ↓
//   サムネ付きカードメッセージ（Flex Message）を返信
//     → 講座URL・アフィリエイト登録案内
//
// 【スクリプトプロパティ設定】
//   LINE_CHANNEL_ACCESS_TOKEN : 購入者LINE Messaging API アクセストークン
//   LINE_CHANNEL_SECRET       : 購入者LINE チャンネルシークレット（署名検証用）
//   NETLIFY_URL               : 例 https://your-site.netlify.app
//   PURCHASE_SYNC_SECRET      : purchase-sync.gs と同じ秘密キー
//   SPREADSHEET_ID            : 購入者台帳スプレッドシートのID
//   SHEET_NAME                : シート名（デフォルト: 購入者台帳）
//   COURSE_URL                : 講座のURL（ノーション等）
//   AFFILIATE_REGISTER_URL    : アフィリエイト登録ページのURL
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
    accessToken:        p.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '',
    channelSecret:      p.getProperty('LINE_CHANNEL_SECRET')       || '',
    netlifyUrl:         p.getProperty('NETLIFY_URL')               || '',
    purchaseSyncSecret: p.getProperty('PURCHASE_SYNC_SECRET')      || '',
    spreadsheetId:      p.getProperty('SPREADSHEET_ID')            || '',
    sheetName:          p.getProperty('SHEET_NAME')                || '購入者台帳',
    courseUrl:          p.getProperty('COURSE_URL')                || '',
    affiliateRegUrl:    p.getProperty('AFFILIATE_REGISTER_URL')    || '',
    botIconUrl:         p.getProperty('BOT_ICON_URL')              || '',
  };
}

// ============================================================
// LINE Webhook エントリーポイント
// ============================================================
function doPost(e) {
  try {
    const config = getConfig();
    const body = JSON.parse(e.postData.contents);
    const events = body.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId      = event.source.userId;
        const replyToken  = event.replyToken;
        const text        = event.message.text.trim();

        // ── start_ で始まる購入コードを検知 ──────────────────
        if (text.startsWith('start_')) {
          handlePurchaseCode(userId, replyToken, text, config);
        }
        // ── その他キーワード（必要に応じて追加）─────────────
        // else if (text === '講座') { ... }
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
    // 照合失敗 → エラーメッセージ
    replyText(replyToken, config.accessToken,
      '購入コードが確認できませんでした。\n\n' +
      'コードをもう一度ご確認の上、正確にコピーして送信してください。\n' +
      '（購入完了ページまたは購入完了メールに記載されています）'
    );
    return;
  }

  // ② LINE プロフィール取得
  const profile = getLineProfile(userId, config.accessToken);
  const displayName = profile ? profile.displayName : '';

  // ③ スプレッドシートに メール ↔ LINE 紐付けを記録
  const alreadyRecorded = recordToSpreadsheet({
    purchaseCode:    purchaseCode,
    purchaseId:      purchaseData.purchase_id      || '',
    buyerEmail:      purchaseData.buyer_email       || '',
    lineUserId:      userId,
    lineDisplayName: displayName,
    productName:     purchaseData.product_name      || '',
    amountTotal:     purchaseData.amount_total       || 0,
    affiliateCode:   purchaseData.affiliate_code    || '',
    affiliateName:   purchaseData.affiliate_name    || '',
    affiliatePermissionGranted: purchaseData.affiliate_permission_granted || false,
    purchasedAt:     purchaseData.purchased_at      || new Date().toISOString(),
  }, config);

  // ④ カード型メッセージを返信
  if (alreadyRecorded) {
    // 2回目以降の送信（重複）→ シンプルなメッセージ
    replyText(replyToken, config.accessToken,
      '✅ 購入確認済みです。\n\n' +
      '講座URLはこちらから受け取れます👇\n' +
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
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ purchase_code: purchaseCode }),
      muteHttpExceptions: true,
    });

    if (res.getResponseCode() === 200) {
      return JSON.parse(res.getContentText());
    }
    console.error('[verifyPurchaseCode] status:', res.getResponseCode(), res.getContentText());
    return null;
  } catch (e) {
    console.error('[verifyPurchaseCode] error:', e.message);
    return null;
  }
}

// ============================================================
// スプレッドシートに購入者情報を記録（purchase-sync.gs と同仕様）
// 戻り値: true = 既に記録済み（重複）/ false = 新規記録
// ============================================================
function recordToSpreadsheet(data, config) {
  if (!config.spreadsheetId) return false;

  const ss    = SpreadsheetApp.openById(config.spreadsheetId);
  let sheet   = ss.getSheetByName(config.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(config.sheetName);
    initSheetHeaders(sheet);
  } else if (sheet.getLastRow() === 0) {
    initSheetHeaders(sheet);
  }

  // 重複チェック（purchase_code + line_user_id の組み合わせ）
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); // A:購入コード, B:メール, C:LINE user_id
    const isDup = rows.some(r => r[0] === data.purchaseCode && r[2] === data.lineUserId);
    if (isDup) return true; // 重複
  }

  // LINE user_id だけ更新（同じコードで別の LINE → 上書き）
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === data.purchaseCode) {
        // purchase_code が一致 → LINE情報を更新
        const rowNum = i + 2;
        sheet.getRange(rowNum, 3).setValue(data.lineUserId);       // C: LINE user_id
        sheet.getRange(rowNum, 4).setValue(data.lineDisplayName);  // D: LINE表示名
        sheet.getRange(rowNum, 11).setValue(                        // K: LINE登録日時
          Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')
        );
        return false;
      }
    }
  }

  // 新規行追加
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  const purchasedAt = data.purchasedAt
    ? Utilities.formatDate(new Date(data.purchasedAt), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')
    : now;

  sheet.appendRow([
    data.purchaseCode,                                      // A: 購入コード
    data.buyerEmail,                                        // B: メール
    data.lineUserId,                                        // C: LINE user_id
    data.lineDisplayName,                                   // D: LINE表示名
    data.productName,                                       // E: 商品名
    data.amountTotal,                                       // F: 金額
    data.affiliateCode,                                     // G: 紹介者コード
    data.affiliateName,                                     // H: 紹介者名
    data.affiliatePermissionGranted ? '✅' : '',            // I: アフィリ権限
    purchasedAt,                                            // J: 購入日時
    now,                                                    // K: LINE登録日時
    data.purchaseId,                                        // L: purchase_id
  ]);

  return false;
}

// ============================================================
// シートヘッダー初期化
// ============================================================
function initSheetHeaders(sheet) {
  const headers = [
    '購入コード', 'メールアドレス', 'LINE user_id', 'LINE表示名',
    '商品名', '金額(円)', '紹介者コード', '紹介者名',
    'アフィリ権限', '購入日時', 'LINE登録日時', 'purchase_id',
  ];
  sheet.appendRow(headers);
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setBackground('#4A90D9');
  range.setFontColor('#FFFFFF');
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
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
        type: 'image',
        url: botIconUrl,
        size: 'full',
        aspectRatio: '20:9',
        aspectMode: 'cover',
      }
    : null;

  const flexMessage = {
    type: 'flex',
    altText: `${displayName}さん、購入確認が取れました！講座URLをお届けします`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      ...(heroBlock ? { hero: heroBlock } : {}),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '✅ 購入確認が取れました',
            weight: 'bold',
            size: 'lg',
            color: '#1a7a4a',
            wrap: true,
          },
          {
            type: 'text',
            text: `${displayName}さん、「${productName}」のご購入ありがとうございます！`,
            size: 'sm',
            color: '#555555',
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: '📚 講座を受け取る',
            weight: 'bold',
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'こちらから講座にアクセスしてください。',
            size: 'xs',
            color: '#888888',
            wrap: true,
          },
          ...(affiliateRegUrl
            ? [
                {
                  type: 'separator',
                  margin: 'md',
                },
                {
                  type: 'text',
                  text: '💰 紹介して収益を得る（任意）',
                  weight: 'bold',
                  size: 'sm',
                  margin: 'md',
                },
                {
                  type: 'text',
                  text: 'この講座を紹介するだけで報酬が発生するアフィリエイト制度があります。',
                  size: 'xs',
                  color: '#888888',
                  wrap: true,
                },
              ]
            : []),
          {
            type: 'text',
            text: `購入コード: ${purchaseCode}`,
            size: 'xxs',
            color: '#bbbbbb',
            margin: 'xl',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1a7a4a',
            action: {
              type: 'uri',
              label: '📚 講座を受け取る',
              uri: courseUrl || 'https://example.com',
            },
          },
          ...(affiliateRegUrl
            ? [
                {
                  type: 'button',
                  style: 'secondary',
                  action: {
                    type: 'uri',
                    label: '💰 アフィリエイト登録（任意）',
                    uri: affiliateRegUrl,
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
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      payload: JSON.stringify({ replyToken, messages }),
      muteHttpExceptions: true,
    });
  } catch (e) {
    console.error('[sendReply] error:', e.message);
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
        headers: { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true,
      }
    );
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
    return null;
  } catch (e) {
    console.error('[getLineProfile] error:', e.message);
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
// ============================================================
function testBot() {
  const config = getConfig();
  console.log('=== buyer-line-bot テスト ===');
  console.log('NETLIFY_URL:', config.netlifyUrl || '（未設定）');
  console.log('SPREADSHEET_ID:', config.spreadsheetId || '（未設定）');
  console.log('COURSE_URL:', config.courseUrl || '（未設定）');

  // ダミーコードで照合テスト
  const result = verifyPurchaseCode('start_TestDummyCode1234', config);
  console.log('照合結果:', JSON.stringify(result));
}
