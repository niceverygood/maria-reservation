import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'k.kakaocdn.net',
      },
      {
        protocol: 'http',
        hostname: 'k.kakaocdn.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 실험적 기능
  experimental: {
    // 패키지 최적화
    optimizePackageImports: ['@prisma/client'],
  },

  // 헤더 설정 (캐싱)
  async headers() {
    return [
      {
        // API 응답 캐싱 (인증 필요없는 공개 API)
        source: '/api/patient/doctors',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
      {
        // 정적 자산 캐싱
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // 리다이렉트
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ];
  },

  // 출력 최적화
  poweredByHeader: false,
  
  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
