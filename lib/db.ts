import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Singleton
 * 
 * Supabase + PgBouncer 환경에서 안정적인 연결을 위한 설정:
 * - connection_limit=1: PgBouncer 트랜잭션 모드에서 필수
 * - connect_timeout: 연결 대기 시간 제한
 * - pool_timeout: 풀에서 연결 대기 시간 제한
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] // query 로그 제거 (성능 향상)
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 연결 테스트 함수 (디버깅용)
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('[Prisma] 연결 테스트 실패:', error)
    return false
  }
}

// 연결 종료 함수 (클린업용)
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}

export default prisma
