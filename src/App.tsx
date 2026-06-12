// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeTracking } from '@/utils/tracking';

// ==================== Admin Pages ====================
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminCampaigns } from '@/pages/admin/AdminCampaigns';
import { AdminAffiliates } from '@/pages/admin/AdminAffiliates';
import { AdminLeads } from '@/pages/admin/AdminLeads';
import { AdminPurchases } from '@/pages/admin/AdminPurchases';
import { AdminCommissions } from '@/pages/admin/AdminCommissions';
import { AdminSuspicious } from '@/pages/admin/AdminSuspicious';
import { AdminAnnouncements } from '@/pages/admin/AdminAnnouncements';
import { AdminRanking } from '@/pages/admin/AdminRanking';
import { AdminCsvExport } from '@/pages/admin/AdminCsvExport';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminRoles } from '@/pages/admin/AdminRoles';
import { AdminApprovals } from '@/pages/admin/AdminApprovals';
import { AdminCampaignAccess } from '@/pages/admin/AdminCampaignAccess';
// 新規追加
import { AdminAffiliateRegistrations } from '@/pages/admin/AdminAffiliateRegistrations';
import { AdminPermissions } from '@/pages/admin/AdminPermissions';

// ==================== Affiliate Pages ====================
import { AffiliateLayout } from '@/pages/affiliate/AffiliateLayout';
import { AffiliateDashboard } from '@/pages/affiliate/AffiliateDashboard';
import { AffiliateDashboardNew } from '@/pages/affiliate/AffiliateDashboardNew';
import { AffiliateLogin } from '@/pages/affiliate/AffiliateLogin';
import { AffiliateProfile } from '@/pages/affiliate/AffiliateProfile';
import { AffiliateMaterials } from '@/pages/affiliate/AffiliateMaterials';
// 新規追加
import { AffiliateRegister } from '@/pages/affiliate/AffiliateRegister';
import { AffiliateProductDetail } from '@/pages/affiliate/AffiliateProductDetail';

// ==================== Partner Pages ====================
import { PartnerLogin } from '@/pages/partner/PartnerLogin';
import { PartnerLayout } from '@/pages/partner/PartnerLayout';
import { PartnerDashboard } from '@/pages/partner/PartnerDashboard';
import { PartnerPurchases } from '@/pages/partner/PartnerPurchases';
import { PartnerAffiliates } from '@/pages/partner/PartnerAffiliates';
import { PartnerRequests } from '@/pages/partner/PartnerRequests';
import { PartnerCsvExport } from '@/pages/partner/PartnerCsvExport';
import { PartnerNotices } from '@/pages/partner/PartnerNotices';

// ==================== LP / Sales Pages ====================
// 販売ページ（新規追加）
import { LandingPageAffiliateCourse } from '@/pages/lp/LandingPageAffiliateCourse';
// 既存ページ（start-course として流用）
import { LandingPageStartCourse } from '@/pages/lp/LandingPageStartCourse';
import { LandingPageMiniCourse } from '@/pages/lp/LandingPageMiniCourse';
import { LandingPageFreeGift } from '@/pages/lp/LandingPageFreeGift';
import { LiffSeminar } from '@/pages/lp/LiffSeminar';
import { PurchaseComplete } from '@/pages/lp/PurchaseComplete';

function App() {
  useEffect(() => {
    initializeTracking();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================
            販売ページ（メインの導線）
           ======================================== */}
        {/* ルート: アフィリエイト講座ページへリダイレクト */}
        <Route path="/" element={<LandingPageAffiliateCourse />} />

        {/* AIアフィリエイト実践講座（通常¥29,800 / キャンペーン¥4,980） */}
        <Route path="/affiliate-course" element={<LandingPageAffiliateCourse />} />

        {/* AI副業1時間化スタート講座（段階価格） */}
        <Route path="/start-course" element={<LandingPageStartCourse />} />

        {/* その他既存ページ（移行期間中は維持） */}
        <Route path="/mini-course" element={<LandingPageMiniCourse />} />
        <Route path="/free-gift" element={<LandingPageFreeGift />} />
        <Route path="/seminar" element={<LiffSeminar />} />
        <Route path="/purchase-complete" element={<PurchaseComplete />} />

        {/* ========================================
            アフィリエイター向けページ
           ======================================== */}
        {/* アフィリエイター登録（スタート講座購入者のみ） */}
        <Route path="/affiliate/register" element={<AffiliateRegister />} />

        {/* アフィリエイターログイン */}
        <Route path="/affiliate/login" element={<AffiliateLogin />} />

        {/* アフィリエイターダッシュボード（認証必要） */}
        <Route path="/affiliate" element={<AffiliateLayout />}>
          <Route index element={<Navigate to="/affiliate/dashboard" replace />} />
          {/* 新版ダッシュボード: 紹介URL・権限商品のみ表示 */}
          <Route path="dashboard" element={<AffiliateDashboardNew />} />
          {/* 商品詳細ページ（紹介権限ある商品のみ表示） */}
          <Route path="products/:productId" element={<AffiliateProductDetail />} />
          <Route path="profile" element={<AffiliateProfile />} />
          <Route path="materials" element={<AffiliateMaterials />} />
        </Route>

        {/* ========================================
            管理者画面（super_admin専用）
           ======================================== */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* アフィリエイター管理 */}
          <Route path="affiliate-registrations" element={<AdminAffiliateRegistrations />} />
          <Route path="affiliates" element={<AdminAffiliates />} />
          <Route path="permissions" element={<AdminPermissions />} />
          <Route path="commissions" element={<AdminCommissions />} />

          {/* 商品・売上管理 */}
          <Route path="products" element={<AdminProducts />} />
          <Route path="purchases" element={<AdminPurchases />} />
          {/* クリック管理: 暫定でSuspiciousページを流用 */}
          <Route path="clicks" element={<AdminSuspicious />} />

          {/* パートナー管理 */}
          <Route path="roles" element={<AdminRoles />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="campaign-access" element={<AdminCampaignAccess />} />

          {/* その他 */}
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="ranking" element={<AdminRanking />} />
          <Route path="csv" element={<AdminCsvExport />} />
          <Route path="suspicious" element={<AdminSuspicious />} />
        </Route>

        {/* ========================================
            パートナー管理画面（product_owner専用）
           ======================================== */}
        <Route path="/partner/login" element={<PartnerLogin />} />
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<Navigate to="/partner/dashboard" replace />} />
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="purchases" element={<PartnerPurchases />} />
          <Route path="affiliates" element={<PartnerAffiliates />} />
          <Route path="requests" element={<PartnerRequests />} />
          <Route path="csv" element={<PartnerCsvExport />} />
          <Route path="notices" element={<PartnerNotices />} />
        </Route>

        {/* 404 → affiliate-courseへ */}
        <Route path="*" element={<Navigate to="/affiliate-course" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
