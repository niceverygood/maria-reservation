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
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-[#FEE500] text-[#000000] text-center text-lg py-4 rounded-xl shadow-md hover:bg-[#FDD835] transition-all font-medium"
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오로 시작하기
            </span>
          </Link>
          
          <Link
            href="/reserve"
            className="block w-full btn-primary text-center text-lg py-4 rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            예약하기
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/mypage"
              className="block w-full btn-secondary text-center py-3 rounded-xl"
            >
              마이페이지
            </Link>
            <Link
              href="/reserve/lookup"
              className="block w-full btn-secondary text-center py-3 rounded-xl"
            >
              예약 조회
            </Link>
          </div>
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
