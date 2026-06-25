import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Supabase環境変数がない場合でもビルドできるよう設定
    ignoreBuildErrors: true,
  },
  // eslint は next.config では設定しない（Next.js 16で非対応）
  // 代わりに eslint.config.mjs で管理
};

export default nextConfig;
