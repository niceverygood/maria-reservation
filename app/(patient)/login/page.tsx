'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const reasonParam = searchParams.get('reason')

    if (errorParam) {
      const reasonSuffix = reasonParam ? ` (${reasonParam})` : ''
      switch (errorParam) {
        case 'kakao_denied':
          setError('카카오 로그인이 취소되었습니다.')
          break
        case 'callback_failed':
          setError(`로그인 처리 중 오류가 발생했습니다.${reasonSuffix}`)
          break
        default:
          setError('로그인에 실패했습니다.')
      }
    }
  }, [searchParams])

  const handleKakaoLogin = () => {
    window.location.href = '/api/auth/kakao'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F5F2] to-[#F5F9F8] flex flex-col">
      {/* 헤더 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* 로고 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-wide text-[#2D3436] mb-2">
            MA<span className="text-[#5B9A8B]">R</span>IA
          </h1>
          <p className="text-[#636E72]">일산마리아병원</p>
        </div>

        {/* 환영 메시지 */}
        <div className="text-center mb-8 animate-slide-up">
          <h2 className="text-xl font-bold text-[#2D3436] mb-2">
            기적 같은 순간을 위해
          </h2>
          <p className="text-[#636E72]">
            최선을 다하겠습니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="w-full max-w-sm mb-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
            <p className="text-sm text-[#E57373] text-center">{error}</p>
          </div>
        )}

        {/* 로그인 버튼들 */}
        <div className="w-full max-w-sm space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* 카카오 로그인 */}
          <button
            onClick={handleKakaoLogin}
            className="w-full py-4 bg-[#FEE500] text-[#191919] rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-[#FDD835] transition-all shadow-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            카카오로 시작하기
          </button>

          {/* 비회원 예약 */}
          <Link
            href="/reserve"
            className="block w-full py-4 bg-white text-[#5B9A8B] rounded-xl font-medium text-center border border-[#5B9A8B] hover:bg-[#E8F5F2] transition-all"
          >
            비회원으로 예약하기
          </Link>

          {/* 예약 조회 */}
          <Link
            href="/reserve/lookup"
            className="block w-full py-4 text-[#636E72] text-center hover:text-[#5B9A8B] transition-colors"
          >
            예약 조회하기
          </Link>
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="p-6 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <p className="text-sm text-[#B2BEC3] mb-2">
          로그인 시 더 편리하게 예약을 관리할 수 있어요
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-[#B2BEC3]">
          <Link href="/info" className="hover:text-[#5B9A8B]">병원 안내</Link>
          <span>|</span>
          <button 
            onClick={() => window.location.href = 'tel:031-123-4567'}
            className="hover:text-[#5B9A8B]"
          >
            전화 문의
          </button>
          <span>|</span>
          <Link href="/admin/login" className="hover:text-[#5B9A8B]">직원 로그인</Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
        <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
