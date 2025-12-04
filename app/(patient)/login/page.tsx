'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PatientLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // 이미 로그인되어 있는지 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (data.success) {
          // 이미 로그인됨
          if (!data.isProfileComplete) {
            router.push('/login/complete-profile')
          } else {
            router.push('/reserve')
          }
        }
      } catch {
        // 로그인 안됨
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  // URL 에러 파라미터 처리
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'kakao_denied':
          setError('카카오 로그인이 취소되었습니다.')
          break
        case 'callback_failed':
          setError('로그인 처리 중 오류가 발생했습니다.')
          break
        default:
          setError('로그인에 실패했습니다.')
      }
    }
  }, [searchParams])

  // 카카오 로그인
  const handleKakaoLogin = () => {
    setIsLoading(true)
    window.location.href = '/api/auth/kakao'
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#E8F4FD] to-white">
      <div className="w-full max-w-md animate-fade-in">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-[#0066CC] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
            일산마리아병원
          </h1>
          <p className="text-[#64748B]">
            재진 환자 전용 예약 시스템
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* 로그인 카드 */}
        <div className="card shadow-lg">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6 text-center">
            간편 로그인
          </h2>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-medium transition-all
                       bg-[#FEE500] text-[#000000] hover:bg-[#FDD835] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
            )}
            <span>카카오로 시작하기</span>
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-[#64748B]">또는</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* 비회원 예약 */}
          <Link
            href="/reserve"
            className="block w-full py-3.5 px-4 text-center rounded-xl font-medium border-2 border-gray-200 text-[#64748B] hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            비회원으로 예약하기
          </Link>

          <p className="mt-4 text-xs text-center text-[#94A3B8]">
            비회원 예약 시 매번 본인 정보를 입력해야 합니다.
          </p>
        </div>

        {/* 안내 문구 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#64748B]">
            본 서비스는 재진 환자 전용입니다.
          </p>
          <p className="mt-2 text-xs text-[#94A3B8]">
            초진 예약은 전화로 문의해 주세요. 📞 031-XXX-XXXX
          </p>
        </div>

        {/* 관리자 링크 */}
        <div className="mt-8 text-center">
          <Link
            href="/admin/login"
            className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors"
          >
            직원 로그인
          </Link>
        </div>
      </div>
    </div>
  )
}

