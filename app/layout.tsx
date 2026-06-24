import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'みお革命 実践ログ',
  description: '毎日の実践を記録し、止まっている場所と成長を見える化する専用ダッシュボード',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
