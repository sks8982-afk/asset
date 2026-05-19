import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const revalidate = false;
export const contentType = 'image/png';
export const size = { width: 512, height: 512 };

// Maskable: 안전 영역(80%) 내에 핵심 콘텐츠 배치 (Android 어댑티브 아이콘 호환)
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#60a5fa',
          fontWeight: 900,
          fontSize: 200,
          letterSpacing: '-0.05em',
          fontFamily: 'sans-serif',
        }}
      >
        <span>W</span>
      </div>
    ),
    { ...size },
  );
}
