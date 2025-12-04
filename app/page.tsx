import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#E8F4FD] to-white">
      <div className="text-center max-w-md mx-auto animate-fade-in">
        {/* 로고 영역 */}
        <div className="mb-8">
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

        {/* 메뉴 버튼 */}
        <div className="space-y-4">
          <Link
            href="/reserve"
            className="block w-full btn-primary text-center text-lg py-4 rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            예약하기
          </Link>
          
          <Link
            href="/reserve/lookup"
            className="block w-full btn-secondary text-center text-lg py-4 rounded-xl"
          >
            예약 조회 / 취소
          </Link>
        </div>

        {/* 안내 문구 */}
        <p className="mt-8 text-sm text-[#64748B]">
          본 서비스는 재진 환자 전용입니다.<br />
          초진 예약은 전화로 문의해 주세요.
        </p>
        
        <p className="mt-4 text-xs text-[#94A3B8]">
          📞 031-XXX-XXXX
        </p>
      </div>

      {/* 관리자 링크 (하단) */}
      <div className="absolute bottom-8">
        <Link
          href="/admin/login"
          className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors"
        >
          직원 로그인
        </Link>
      </div>
    </div>
  )
}
