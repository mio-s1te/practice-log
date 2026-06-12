// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeTracking } from '@/utils/tracking';

// Admin Pages
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

// Affiliate Pages
import { AffiliateLayout } from '@/pages/affiliate/AffiliateLayout';
import { AffiliateDashboard } from '@/pages/affiliate/AffiliateDashboard';
import { AffiliateLogin } from '@/pages/affiliate/AffiliateLogin';
import { AffiliateProfile } from '@/pages/affiliate/AffiliateProfile';
import { AffiliateMaterials } from '@/pages/affiliate/AffiliateMaterials';

// LP Pages
import { LandingPageStartCourse } from '@/pages/lp/LandingPageStartCourse';
import { LandingPageMiniCourse } from '@/pages/lp/LandingPageMiniCourse';
import { LandingPageFreeGift } from '@/pages/lp/LandingPageFreeGift';
import { LiffSeminar } from '@/pages/lp/LiffSeminar';
import { PurchaseComplete } from '@/pages/lp/PurchaseComplete';

function App() {
  useEffect(() => {
    // ページ読み込み時にトラッキング初期化
    initializeTracking();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* LP Routes */}
        <Route path="/" element={<LandingPageFreeGift />} />
        <Route path="/start-course" element={<LandingPageStartCourse />} />
        <Route path="/mini-course" element={<LandingPageMiniCourse />} />
        <Route path="/free-gift" element={<LandingPageFreeGift />} />
        <Route path="/seminar" element={<LiffSeminar />} />
        <Route path="/purchase-complete" element={<PurchaseComplete />} />
        
        {/* Affiliate Routes */}
        <Route path="/affiliate/login" element={<AffiliateLogin />} />
        <Route path="/affiliate" element={<AffiliateLayout />}>
          <Route index element={<Navigate to="/affiliate/dashboard" replace />} />
          <Route path="dashboard" element={<AffiliateDashboard />} />
          <Route path="profile" element={<AffiliateProfile />} />
          <Route path="materials" element={<AffiliateMaterials />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="affiliates" element={<AdminAffiliates />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="purchases" element={<AdminPurchases />} />
          <Route path="commissions" element={<AdminCommissions />} />
          <Route path="suspicious" element={<AdminSuspicious />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="ranking" element={<AdminRanking />} />
          <Route path="csv" element={<AdminCsvExport />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
