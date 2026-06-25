// トラッキング ユーティリティ
// クリック情報をCookieとlocalStorageの両方に保存/取得

import type { TrackingData } from '@/types';

const TRACKING_KEY = 'affiliate_tracking';
const COOKIE_EXPIRES_DAYS = 30;

// Cookie設定
export function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Cookie取得
export function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

// Cookie削除
export function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// トラッキングデータ保存
export function saveTrackingData(data: TrackingData): void {
  const jsonData = JSON.stringify(data);
  
  // Cookie保存
  setCookie(TRACKING_KEY, jsonData, COOKIE_EXPIRES_DAYS);
  
  // localStorage保存
  try {
    localStorage.setItem(TRACKING_KEY, jsonData);
    localStorage.setItem(`${TRACKING_KEY}_expires`, 
      new Date(Date.now() + COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString()
    );
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
}

// トラッキングデータ取得 (URLパラメータ > Cookie > localStorage の優先順位)
export function getTrackingData(): TrackingData {
  // 1. URLパラメータから取得
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get('ref');
  const clickIdFromUrl = urlParams.get('click_id');
  const campaignFromUrl = urlParams.get('campaign');
  const sourceFromUrl = urlParams.get('source');
  
  if (refFromUrl || clickIdFromUrl || campaignFromUrl) {
    return {
      ref: refFromUrl || undefined,
      clickId: clickIdFromUrl || undefined,
      campaignId: campaignFromUrl || undefined,
      source: sourceFromUrl || undefined,
    };
  }

  // 2. Cookieから取得
  const cookieData = getCookie(TRACKING_KEY);
  if (cookieData) {
    try {
      return JSON.parse(cookieData);
    } catch (e) {
      console.warn('Cookie parse error:', e);
    }
  }

  // 3. localStorageから取得
  try {
    const lsData = localStorage.getItem(TRACKING_KEY);
    const lsExpires = localStorage.getItem(`${TRACKING_KEY}_expires`);
    
    if (lsData && lsExpires && new Date(lsExpires) > new Date()) {
      return JSON.parse(lsData);
    }
  } catch (e) {
    console.warn('localStorage not available:', e);
  }

  return {};
}

// トラッキングデータクリア
export function clearTrackingData(): void {
  deleteCookie(TRACKING_KEY);
  try {
    localStorage.removeItem(TRACKING_KEY);
    localStorage.removeItem(`${TRACKING_KEY}_expires`);
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
}

// ページ読み込み時のURLパラメータチェックとトラッキング保存
export function initializeTracking(): TrackingData {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  const campaign = urlParams.get('campaign');
  const source = urlParams.get('source');
  const clickId = urlParams.get('click_id');

  if (ref || campaign || source) {
    const data: TrackingData = {
      ref: ref || undefined,
      campaignId: campaign || undefined,
      source: source || undefined,
      clickId: clickId || undefined,
    };
    saveTrackingData(data);
    return data;
  }

  // 既存データを返す
  return getTrackingData();
}

// IPハッシュ生成（プライバシー保護）
export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'salt_for_privacy');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// クリック記録API呼び出し
export async function recordClick(params: {
  ref: string;
  campaignId?: string;
  productId?: string;
  landingPage?: string;
}): Promise<{ clickId: string } | null> {
  try {
    const response = await fetch('/api/record-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: params.ref,
        campaign_id: params.campaignId,
        product_id: params.productId,
        landing_page: params.landingPage || window.location.pathname,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.click_id) {
      // click_idをトラッキングデータに保存
      const existing = getTrackingData();
      saveTrackingData({ ...existing, clickId: data.click_id });
      return { clickId: data.click_id };
    }
    return null;
  } catch (e) {
    console.error('Failed to record click:', e);
    return null;
  }
}
