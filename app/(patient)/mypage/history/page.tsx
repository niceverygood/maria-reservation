'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePatientRealtime } from '@/contexts/PatientRealtimeContext'

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  memo: string | null
  doctor: {
    id: string
    name: string
    department: string
    position?: string
  }
}

export default function AppointmentHistoryPage() {
  const router = useRouter()
  const { refreshTrigger } = usePatientRealtime()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all')

  const fetchAppointments = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    try {
      const res = await fetch('/api/patient/appointments/my')
      const data = await res.json()

      if (!data.success) {
        router.push('/login?redirect=/mypage/history')
        return
      }

      setAppointments(data.appointments)
    } catch (err) {
      console.error('예약 내역 조회 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // 초기 로드
  useEffect(() => {
    fetchAppointments(true)
  }, [fetchAppointments])

  // 실시간 업데이트 시 데이터 새로고침
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAppointments(false)
    }
  }, [refreshTrigger, fetchAppointments])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${year}.${month}.${day} (${weekday})`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">승인대기</span>
      case 'BOOKED':
        return <span className="px-2 py-1 bg-[#E8F5F2] text-[#5B9A8B] text-xs rounded-full font-medium">예약완료</span>
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">진료완료</span>
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">취소됨</span>
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-50 text-red-500 text-xs rounded-full font-medium">거절됨</span>
      case 'NO_SHOW':
        return <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded-full font-medium">미방문</span>
      default:
        return null
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date)
    switch (filter) {
      case 'upcoming':
        return aptDate >= today && (apt.status === 'PENDING' || apt.status === 'BOOKED')
      case 'past':
        return aptDate < today || apt.status === 'COMPLETED'
      case 'cancelled':
        return apt.status === 'CANCELLED' || apt.status === 'REJECTED'
      default:
        return true
    }
  })

  // 날짜순 정렬 (최신 먼저)
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(a.date + 'T' + a.time)
    const dateB = new Date(b.date + 'T' + b.time)
    return dateB.getTime() - dateA.getTime()
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
        <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-24">
      {/* 헤더 */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-[#E8F5F2]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-[#5B9A8B]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[#2D3436]">예약 내역</h1>
        </div>
      </header>

      <main className="px-5 py-4">
        {/* 필터 탭 */}
        <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
          {[
            { key: 'all', label: '전체' },
            { key: 'upcoming', label: '예정' },
            { key: 'past', label: '지난예약' },
            { key: 'cancelled', label: '취소' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === tab.key
                  ? 'bg-[#5B9A8B] text-white'
                  : 'text-[#636E72]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 예약 목록 */}
        {sortedAppointments.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto bg-[#F5F9F8] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[#B2BEC3]">
              {filter === 'all' && '예약 내역이 없습니다'}
              {filter === 'upcoming' && '예정된 예약이 없습니다'}
              {filter === 'past' && '지난 예약이 없습니다'}
              {filter === 'cancelled' && '취소된 예약이 없습니다'}
            </p>
            {filter === 'all' && (
              <Link href="/reserve" className="inline-block mt-4 text-[#5B9A8B] font-medium">
                예약하러 가기 →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAppointments.map((apt) => {
              const aptDate = new Date(apt.date)
              const isPast = aptDate < today
              const isUpcoming = aptDate >= today && (apt.status === 'PENDING' || apt.status === 'BOOKED')

              return (
                <div key={apt.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-[#2D3436]">{formatDate(apt.date)}</p>
                      <p className="text-lg font-semibold text-[#5B9A8B]">{apt.time}</p>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-[#F5F9F8] rounded-xl">
                    <div className="w-10 h-10 bg-[#5B9A8B] rounded-full flex items-center justify-center text-white font-bold">
                      {apt.doctor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-[#2D3436]">
                        {apt.doctor.name} {apt.doctor.position && <span className="text-sm text-[#636E72]">({apt.doctor.position})</span>}
                      </p>
                      <p className="text-sm text-[#636E72]">{apt.doctor.department}</p>
                    </div>
                  </div>

                  {/* 예정된 예약만 버튼 표시 */}
                  {isUpcoming && (
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/reserve?reschedule=${apt.id}`}
                        className="flex-1 py-2 text-center text-sm text-[#5B9A8B] border border-[#5B9A8B] rounded-lg hover:bg-[#E8F5F2] transition-colors"
                      >
                        일정 변경
                      </Link>
                      <button
                        onClick={async () => {
                          if (!confirm('예약을 취소하시겠습니까?')) return
                          try {
                            const res = await fetch(`/api/patient/appointments/${apt.id}/cancel`, { method: 'POST' })
                            const data = await res.json()
                            if (data.success) {
                              setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'CANCELLED' } : a))
                              alert('예약이 취소되었습니다.')
                            } else {
                              alert(data.error || '취소 실패')
                            }
                          } catch {
                            alert('취소 중 오류 발생')
                          }
                        }}
                        className="flex-1 py-2 text-center text-sm text-[#E57373] border border-[#E57373] rounded-lg hover:bg-red-50 transition-colors"
                      >
                        예약 취소
                      </button>
                    </div>
                  )}

                  {/* 완료된 예약은 다시 예약 버튼 */}
                  {apt.status === 'COMPLETED' && (
                    <Link
                      href={`/reserve?doctorId=${apt.doctor.id}`}
                      className="block mt-3 py-2 text-center text-sm text-[#5B9A8B] border border-[#5B9A8B] rounded-lg hover:bg-[#E8F5F2] transition-colors"
                    >
                      같은 의사 다시 예약
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-sm text-[#B2BEC3] mt-6">
          총 {sortedAppointments.length}건
        </p>
      </main>
    </div>
  )
}

