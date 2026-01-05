'use client'

import { useState } from 'react'

interface GuideItem {
  id: string
  category: string
  title: string
  description: string
  icon: string
}

const guideCategories = [
  { id: 'all', label: '전체' },
  { id: 'reservation', label: '예약안내' },
  { id: 'treatment', label: '진료안내' },
  { id: 'facility', label: '시설안내' },
]

const guideItems: GuideItem[] = [
  {
    id: '1',
    category: 'reservation',
    title: '예약 방법',
    description: '앱, 전화, 카카오톡을 통해 간편하게 예약하실 수 있습니다.',
    icon: '📅',
  },
  {
    id: '2',
    category: 'reservation',
    title: '예약 변경/취소',
    description: '예약 변경 및 취소는 진료 1일 전까지 가능합니다.',
    icon: '🔄',
  },
  {
    id: '3',
    category: 'treatment',
    title: '진료 순서',
    description: '접수 → 상담 → 진료 → 수납 순으로 진행됩니다.',
    icon: '📋',
  },
  {
    id: '4',
    category: 'treatment',
    title: '준비물 안내',
    description: '신분증과 의료보험증을 지참해 주세요.',
    icon: '📝',
  },
  {
    id: '5',
    category: 'facility',
    title: '주차 안내',
    description: '지하 1~2층 주차장 이용 (2시간 무료)',
    icon: '🚗',
  },
  {
    id: '6',
    category: 'facility',
    title: '오시는 길',
    description: '3호선 마두역 2번 출구 도보 5분',
    icon: '🚇',
  },
]

export default function GuidePage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredItems = selectedCategory === 'all'
    ? guideItems
    : guideItems.filter(item => item.category === selectedCategory)

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-20">
      {/* 헤더 */}
      <header className="header-gradient px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold text-[#2D3436]">가이드</h1>
        <p className="text-sm text-[#636E72] mt-1">일산마리아병원 이용 안내</p>
      </header>

      <main className="px-5 -mt-2">
        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-5 px-5">
          {guideCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#5B9A8B] text-white'
                  : 'bg-white text-[#636E72] border border-[#DFE6E9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 가이드 목록 */}
        <div className="space-y-3">
          {filteredItems.map((item, idx) => (
            <div 
              key={item.id} 
              className="card animate-slide-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#E8F5F2] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#2D3436] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#636E72]">{item.description}</p>
                </div>
                <svg className="w-5 h-5 text-[#B2BEC3] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ 섹션 */}
        <div className="mt-8">
          <h2 className="section-title mb-4">자주 묻는 질문</h2>
          
          <div className="space-y-3">
            <details className="card group">
              <summary className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#2D3436]">예약 없이 방문해도 되나요?</span>
                <svg className="w-5 h-5 text-[#B2BEC3] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-sm text-[#636E72] mt-3 pt-3 border-t border-[#DFE6E9]">
                예약 환자 우선 진료이므로, 예약 후 방문하시면 대기 시간을 줄일 수 있습니다.
              </p>
            </details>

            <details className="card group">
              <summary className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#2D3436]">진료비는 어떻게 되나요?</span>
                <svg className="w-5 h-5 text-[#B2BEC3] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-sm text-[#636E72] mt-3 pt-3 border-t border-[#DFE6E9]">
                진료 내용에 따라 다르며, 건강보험 적용 여부에 따라 달라집니다. 자세한 내용은 전화 문의 부탁드립니다.
              </p>
            </details>

            <details className="card group">
              <summary className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#2D3436]">주말 진료도 하나요?</span>
                <svg className="w-5 h-5 text-[#B2BEC3] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-sm text-[#636E72] mt-3 pt-3 border-t border-[#DFE6E9]">
                토요일은 오전 진료(09:00~13:00)를 운영하며, 일요일과 공휴일은 휴진입니다.
              </p>
            </details>
          </div>
        </div>

        {/* 문의 안내 */}
        <div className="mt-8 card bg-[#5B9A8B] text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold">더 궁금한 점이 있으신가요?</p>
              <p className="text-sm text-white/80">전화 상담으로 친절히 안내해 드립니다.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = 'tel:031-123-4567'}
            className="mt-4 w-full py-3 bg-white text-[#5B9A8B] rounded-xl font-medium"
          >
            031-123-4567 전화하기
          </button>
        </div>
      </main>
    </div>
  )
}










