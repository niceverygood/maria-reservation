/**
 * 메모리 캐시 유틸리티
 * API 응답 캐싱을 위한 간단한 인메모리 캐시
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 30초마다 만료된 캐시 정리
    if (typeof window === 'undefined') {
      // 서버 사이드에서만 주기적 정리
      this.startCleanup()
    }
  }

  private startCleanup() {
    if (this.cleanupInterval) return
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 30000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    return true
  }
}

// 싱글톤 인스턴스
export const cache = new MemoryCache()

// 캐시 TTL 상수
export const CACHE_TTL = {
  SHORT: 10 * 1000,      // 10초 (자주 변경되는 데이터)
  MEDIUM: 30 * 1000,     // 30초 (기본값)
  LONG: 60 * 1000,       // 1분 (거의 변경되지 않는 데이터)
  VERY_LONG: 5 * 60 * 1000, // 5분 (정적 데이터)
}

// 캐시 키 생성 헬퍼
export function createCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  return `${prefix}:${sortedParams}`
}

