import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 192,
  height: 192,
};

export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
        }}
      >
        名
      </div>
    ),
    {
      ...size,
    }
  );
}
