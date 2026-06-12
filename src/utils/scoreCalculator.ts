// アフィリエイトスコア計算ユーティリティ

export interface ScoreInput {
  clicks_30d: number;
  purchases_30d: number;
  active_days_30d: number;
  start_course_purchases_30d: number;
  total_purchases_30d: number;
  clicks_7d: number;
  clicks_prev_7d: number;
  purchases_7d: number;
  purchases_prev_7d: number;
}

export interface AffiliateScoreResult {
  traffic_score: number;
  conversion_score: number;
  consistency_score: number;
  product_understanding_score: number;
  improvement_score: number;
  overall_score: number;
  diagnosis_type: string;
  diagnosis_comment: string;
  recommended_actions: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateAffiliateScore(input: ScoreInput): AffiliateScoreResult {
  const {
    clicks_30d,
    purchases_30d,
    active_days_30d,
    start_course_purchases_30d,
    total_purchases_30d,
    clicks_7d,
    clicks_prev_7d,
    purchases_7d,
    purchases_prev_7d,
  } = input;

  // 1. 集客力スコア
  const traffic_score = clamp((clicks_30d / 300) * 100, 0, 100);

  // 2. 成約力スコア
  const conversion_rate_30d = clicks_30d > 0 ? purchases_30d / clicks_30d : 0;
  const conversion_score = clamp((conversion_rate_30d / 0.05) * 100, 0, 100);

  // 3. 継続力スコア
  const consistency_score = clamp((active_days_30d / 20) * 100, 0, 100);

  // 4. 商品理解力スコア
  const main_product_rate = total_purchases_30d > 0
    ? start_course_purchases_30d / total_purchases_30d
    : 0;
  const product_understanding_score = clamp((main_product_rate / 0.60) * 100, 0, 100);

  // 5. 改善力スコア
  const click_growth = (clicks_7d - clicks_prev_7d) / Math.max(clicks_prev_7d, 1);
  const purchase_growth = (purchases_7d - purchases_prev_7d) / Math.max(purchases_prev_7d, 1);

  const conversion_rate_7d = clicks_7d > 0 ? purchases_7d / clicks_7d : 0;
  const conversion_rate_prev_7d = clicks_prev_7d > 0 ? purchases_prev_7d / clicks_prev_7d : 0;
  const conversion_growth = (conversion_rate_7d - conversion_rate_prev_7d) / Math.max(conversion_rate_prev_7d, 0.001);

  const growthToScore = (growth: number): number =>
    clamp(((growth + 1) / 2) * 100, 0, 100);

  const click_growth_score = growthToScore(click_growth);
  const purchase_growth_score = growthToScore(purchase_growth);
  const conversion_growth_score = growthToScore(conversion_growth);

  const improvement_score = clamp(
    click_growth_score * 0.35 +
    purchase_growth_score * 0.40 +
    conversion_growth_score * 0.25,
    0, 100
  );

  // 総合スコア
  const overall_score = clamp(
    traffic_score * 0.20 +
    conversion_score * 0.25 +
    consistency_score * 0.15 +
    product_understanding_score * 0.20 +
    improvement_score * 0.20,
    0, 100
  );

  // 診断タイプ判定（優先順位順）
  let diagnosis_type = '通常タイプ';

  if (
    overall_score >= 80.0 &&
    traffic_score >= 60.0 &&
    conversion_score >= 60.0 &&
    consistency_score >= 60.0 &&
    product_understanding_score >= 60.0 &&
    improvement_score >= 60.0
  ) {
    diagnosis_type = 'バランス優秀タイプ';
  } else if (improvement_score >= 75.0 && overall_score < 80.0) {
    diagnosis_type = '伸び始めタイプ';
  } else if (total_purchases_30d >= 2 && product_understanding_score < 40.0) {
    diagnosis_type = '本命商品弱めタイプ';
  } else if (traffic_score >= 35.0 && conversion_score < 40.0) {
    diagnosis_type = '成約改善タイプ';
  } else if (traffic_score < 35.0) {
    diagnosis_type = 'クリック不足タイプ';
  } else if (
    traffic_score >= 60.0 &&
    conversion_score >= 50.0 &&
    consistency_score >= 60.0
  ) {
    diagnosis_type = '安定運用タイプ';
  }

  // 診断コメント
  const diagnosisComments: Record<string, string> = {
    'クリック不足タイプ': 'まずは紹介URLを見てもらう回数を増やしましょう。投稿やストーリーで、誰向けの商品かを自然に伝えるのがおすすめです。',
    '成約改善タイプ': 'クリックは集まっていますが、購入までの一押しに改善余地があります。紹介文で、商品の対象者・得られる変化・購入後の流れを具体的に伝えましょう。',
    '本命商品弱めタイプ': 'ミニ講座への興味は取れています。次は、なぜスタート講座で副業テーマ・商品・導線まで作る必要があるのかを伝えると、本命商品につながりやすくなります。',
    '安定運用タイプ': '安定して紹介活動ができています。反応が良かった投稿パターンをテンプレ化し、同じ切り口を横展開しましょう。',
    '伸び始めタイプ': '直近で数字が伸びています。今の紹介文や投稿テーマが合っている可能性が高いので、同じ方向性の投稿を増やしてみましょう。',
    'バランス優秀タイプ': '集客・成約・継続のバランスが良い状態です。次は紹介導線を増やし、さらに成果を伸ばしましょう。',
    '通常タイプ': '現在の数字を見ながら、クリック数・成約率・継続活動のどこを伸ばすかを決めて改善していきましょう。',
  };

  // 今週のおすすめアクション
  const getRecommendedActions = (type: string, scores: {
    traffic: number;
    conversion: number;
    consistency: number;
    product: number;
    improvement: number;
  }): string[] => {
    const actions: string[] = [];

    if (type === 'クリック不足タイプ') {
      actions.push('📱 毎日1投稿、紹介URLを含む発信をしましょう');
      actions.push('📸 ストーリーズで「誰向けの商品か」を伝える投稿を作りましょう');
      actions.push('🔗 プロフィールのリンクを紹介URLに変更しましょう');
      actions.push('👥 友人・知人にDMで紹介URLを直接シェアしてみましょう');
      actions.push('📝 商品のベネフィットを箇条書きにした投稿を試しましょう');
    } else if (type === '成約改善タイプ') {
      actions.push('📝 紹介文に「購入後どう変わったか」を具体的に書き加えましょう');
      actions.push('❓ よくある疑問への回答を投稿に含めましょう');
      actions.push('⏰ 購入を後押しする締め切り感を演出してみましょう');
      actions.push('💬 LPを実際に読んで、引っかかりポイントを確認しましょう');
    } else if (type === '本命商品弱めタイプ') {
      actions.push('🎯 スタート講座で「何ができるようになるか」を具体的に伝えましょう');
      actions.push('💡 副業で月収を得るためにAIが必要な理由を説明しましょう');
      actions.push('📊 スタート講座の受講者の変化を紹介する投稿を作りましょう');
      actions.push('🔄 ミニ講座からスタート講座への自然な流れを作りましょう');
    } else if (type === '安定運用タイプ') {
      actions.push('📋 過去の反応が良かった投稿パターンをリスト化しましょう');
      actions.push('🔄 同じ切り口の投稿を別のプラットフォームで横展開しましょう');
      actions.push('📈 週1回、数字を振り返って微調整を続けましょう');
      actions.push('🤝 同じ紹介者とノウハウをシェアし合いましょう');
    } else if (type === '伸び始めタイプ') {
      actions.push('📈 伸びている投稿テーマを特定して、同じ方向性の投稿を増やしましょう');
      actions.push('⚡ 今の勢いを維持するため、毎日の投稿頻度を保ちましょう');
      actions.push('🎯 反応の良い紹介文のパターンをテンプレ化しましょう');
      actions.push('📊 どの流入経路から購入が多いか確認しましょう');
    } else if (type === 'バランス優秀タイプ') {
      actions.push('🚀 紹介導線を増やし、投稿頻度をさらに上げましょう');
      actions.push('📱 新しいプラットフォームへの展開を検討しましょう');
      actions.push('🏆 成功パターンを体系化し、さらに磨きをかけましょう');
      actions.push('💡 新しい切り口の紹介文を試してA/Bテストしましょう');
    } else {
      // 通常タイプ
      if (scores.traffic < 30) {
        actions.push('📱 まずはクリック数を増やすため、投稿頻度を上げましょう');
      }
      if (scores.conversion < 40) {
        actions.push('📝 紹介文を改善し、購入率を上げましょう');
      }
      if (scores.consistency < 40) {
        actions.push('📅 毎日少しでも紹介活動を継続しましょう');
      }
      actions.push('📊 週1回、自分の数字を確認する習慣をつけましょう');
      actions.push('🎯 今週は1つの改善点に集中して取り組みましょう');
    }

    return actions.slice(0, 5);
  };

  const recommended_actions = getRecommendedActions(diagnosis_type, {
    traffic: traffic_score,
    conversion: conversion_score,
    consistency: consistency_score,
    product: product_understanding_score,
    improvement: improvement_score,
  });

  return {
    traffic_score,
    conversion_score,
    consistency_score,
    product_understanding_score,
    improvement_score,
    overall_score,
    diagnosis_type,
    diagnosis_comment: diagnosisComments[diagnosis_type] || diagnosisComments['通常タイプ'],
    recommended_actions,
  };
}

// スコアを小数第2位で表示
export function formatScore(score: number): string {
  return Number(score).toFixed(2);
}
