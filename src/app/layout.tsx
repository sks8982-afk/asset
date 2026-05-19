import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from './components/ServiceWorkerRegister';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '경식이의 자산 추적기',
  description:
    '개인 자산 현황을 한눈에 파악하고, 투자 성과를 분석하는 웹 애플리케이션',
  applicationName: '자산추적기',
  appleWebApp: {
    capable: true,
    title: '자산추적기',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

// FOUC 방지용 inline script — React 하이드레이션 이전에 다크 클래스 적용
const setInitialTheme = `
(function() {
  try {
    var saved = localStorage.getItem('asset-tracker-dark');
    var dark;
    if (saved === 'true') dark = true;
    else if (saved === 'false') dark = false;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) dark = true;
    else dark = true; // 디자인 의도: 기본 다크
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: setInitialTheme }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
