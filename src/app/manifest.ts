import type { MetadataRoute } from 'next';

/**
 * PWA Manifest — /manifest.webmanifest 으로 자동 빌드됨.
 * Next.js 16 App Router의 내장 기능.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '경식이의 자산 추적기',
    short_name: '자산추적기',
    description:
      '월급 적립식 + 시장 시그널 기반 자산 관리. 감정 방어 장치 내장.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'ko',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
