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
    minimumCacheTTL: 60 * 60 * 24, // 24시간 이미지 캐시
  },

  // 실험적 기능 & 번들 최적화
  experimental: {
    // 패키지 최적화 (트리 쉐이킹 개선)
    optimizePackageImports: [
      '@prisma/client',
      'clsx',
      'tailwind-merge',
      'firebase',
      '@supabase/supabase-js',
    ],
  },

  // 모듈 트랜스파일 (번들 크기 최적화)
  transpilePackages: ['firebase'],

  // 번들 분석기 (개발 시에만)
  ...(process.env.ANALYZE === 'true' && {
    experimental: {
      bundlePagesRouterDependencies: true,
    },
  }),

  // 헤더 설정 (캐싱 최적화)
  async headers() {
    return [
      // 공개 API 캐싱 (의사 목록)
      {
        source: '/api/patient/doctors',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      // 슬롯 요약 API 캐싱
      {
        source: '/api/patient/slots/summary',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      // 날짜별 슬롯 카운트 캐싱
      {
        source: '/api/patient/slots/count-by-date',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=60' },
        ],
      },
      // 정적 자산 영구 캐싱
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // JS/CSS 파일 캐싱
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // 보안 헤더
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
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
