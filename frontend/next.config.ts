import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactMaxHeadersLength: 1000,
  // Cloud Run用にスタンドアロンモードを有効化
  output: 'standalone',
  // PWA設定は後で追加
};

export default nextConfig;
