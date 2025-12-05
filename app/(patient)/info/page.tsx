'use client'

import Link from 'next/link'

// 병원 정보
const HOSPITAL_INFO = {
  name: '일산마리아병원',
  phone: '031-123-4567',
  address: '경기도 고양시 일산동구 중앙로 1234',
  addressDetail: '마리아빌딩 3층',
  hours: [
    { day: '평일', time: '09:00 - 18:00' },
    { day: '토요일', time: '09:00 - 13:00' },
    { day: '일요일/공휴일', time: '휴진' },
  ],
  lunchTime: '13:00 - 14:00',
  parking: '건물 지하 주차장 이용 가능 (2시간 무료)',
  subway: '3호선 마두역 2번 출구 도보 5분',
  bus: '마리아병원 정류장 하차 (100, 200, 300번)',
}

// 공지사항
const notices = [
  {
    id: '1',
    title: '연말연시 진료 안내',
    date: '2024.12.20',
    isNew: true,
  },
  {
    id: '2',
    title: '12월 진료 일정 변경 안내',
    date: '2024.12.15',
    isNew: false,
  },
  {
    id: '3',
    title: '신규 의료진 소개',
    date: '2024.12.10',
    isNew: false,
  },
]

export default function HospitalInfoPage() {
  const handleCall = () => {
    window.location.href = `tel:${HOSPITAL_INFO.phone.replace(/-/g, '')}`
  }

  const handleMap = () => {
    const encodedAddress = encodeURIComponent(HOSPITAL_INFO.address)
    window.open(`https://map.kakao.com/link/search/${encodedAddress}`, '_blank')
  }

  const handleShare = async () => {
    const shareData = {
      title: HOSPITAL_INFO.name,
      text: `${HOSPITAL_INFO.address}\n📞 ${HOSPITAL_INFO.phone}`,
      url: window.location.href,
    }
    
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // 공유 취소
      }
    } else {
      await navigator.clipboard.writeText(`${HOSPITAL_INFO.name}\n${HOSPITAL_INFO.address}\n📞 ${HOSPITAL_INFO.phone}`)
      alert('병원 정보가 복사되었습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-20">
      {/* 헤더 */}
      <header className="header-gradient px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold text-[#2D3436]">병원소식</h1>
        <p className="text-sm text-[#636E72] mt-1">일산마리아병원 안내</p>
      </header>

      <main className="px-5 -mt-2">
        {/* 병원 카드 */}
        <div className="card mb-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#5B9A8B] to-[#4A8577] rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2D3436]">{HOSPITAL_INFO.name}</h2>
              <p className="text-sm text-[#636E72]">{HOSPITAL_INFO.address}</p>
            </div>
          </div>

          {/* 빠른 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCall}
              className="py-3 bg-[#E8F5F2] rounded-xl flex flex-col items-center gap-1 hover:bg-[#D0EBE4] transition-colors"
            >
              <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-xs text-[#5B9A8B] font-medium">전화</span>
            </button>
            <button
              onClick={handleMap}
              className="py-3 bg-[#E8F5F2] rounded-xl flex flex-col items-center gap-1 hover:bg-[#D0EBE4] transition-colors"
            >
              <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-[#5B9A8B] font-medium">지도</span>
            </button>
            <button
              onClick={handleShare}
              className="py-3 bg-[#E8F5F2] rounded-xl flex flex-col items-center gap-1 hover:bg-[#D0EBE4] transition-colors"
            >
              <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-xs text-[#5B9A8B] font-medium">공유</span>
            </button>
          </div>
        </div>

        {/* 공지사항 */}
        <div className="card mb-4 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">공지사항</h3>
            <button className="section-link">전체보기</button>
          </div>
          
          <div className="space-y-3">
            {notices.map((notice) => (
              <div key={notice.id} className="flex items-center justify-between py-2 border-b border-[#DFE6E9] last:border-0">
                <div className="flex items-center gap-2">
                  {notice.isNew && (
                    <span className="px-1.5 py-0.5 bg-[#E57373] text-white text-[10px] rounded">N</span>
                  )}
                  <span className="text-sm text-[#2D3436]">{notice.title}</span>
                </div>
                <span className="text-xs text-[#B2BEC3]">{notice.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 진료시간 */}
        <div className="card mb-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="section-title">진료시간</h3>
          </div>
          
          <div className="space-y-2">
            {HOSPITAL_INFO.hours.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-[#DFE6E9] last:border-0">
                <span className="text-[#636E72]">{item.day}</span>
                <span className={`font-medium ${item.time === '휴진' ? 'text-[#E57373]' : 'text-[#2D3436]'}`}>
                  {item.time}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-2 px-3 bg-[#FEF3E2] rounded-lg mt-2">
              <span className="text-[#E9B171]">점심시간</span>
              <span className="font-medium text-[#E9B171]">{HOSPITAL_INFO.lunchTime}</span>
            </div>
          </div>
        </div>

        {/* 오시는 길 */}
        <div className="card mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="section-title">오시는 길</h3>
          </div>
          
          <div className="space-y-3">
            <p className="text-[#2D3436] font-medium">{HOSPITAL_INFO.address}</p>
            <p className="text-sm text-[#636E72]">{HOSPITAL_INFO.addressDetail}</p>
            
            <button
              onClick={handleMap}
              className="w-full py-3 bg-[#FEE500] text-[#191919] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#FDD835] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오맵에서 보기
            </button>
          </div>
        </div>

        {/* 교통편 */}
        <div className="card mb-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-[#5B9A8B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h3 className="section-title">교통편</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🚇</span>
              </div>
              <div>
                <p className="font-medium text-[#2D3436] text-sm">지하철</p>
                <p className="text-sm text-[#636E72]">{HOSPITAL_INFO.subway}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🚌</span>
              </div>
              <div>
                <p className="font-medium text-[#2D3436] text-sm">버스</p>
                <p className="text-sm text-[#636E72]">{HOSPITAL_INFO.bus}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🚗</span>
              </div>
              <div>
                <p className="font-medium text-[#2D3436] text-sm">주차</p>
                <p className="text-sm text-[#636E72]">{HOSPITAL_INFO.parking}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 예약 버튼 */}
        <Link
          href="/reserve"
          className="block w-full py-4 bg-[#5B9A8B] text-white rounded-xl font-medium text-center text-lg hover:bg-[#4A8577] transition-colors animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          진료 예약하기
        </Link>
      </main>
    </div>
  )
}
