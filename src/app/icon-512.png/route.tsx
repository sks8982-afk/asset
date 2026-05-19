import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const revalidate = false;
export const contentType = 'image/png';
export const size = { width: 512, height: 512 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          fontSize: 220,
          letterSpacing: '-0.05em',
          fontFamily: 'sans-serif',
          borderRadius: 88,
        }}
      >
        <span style={{ color: '#60a5fa' }}>W</span>
      </div>
    ),
    { ...size },
  );
}
