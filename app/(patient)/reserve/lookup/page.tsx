'use client'

import { useState } from 'react'
import Link from 'next/link'

// 예약 타입
interface Appointment {
  id: string
  doctorName: string
  department: string
  date: string
  time: string
  status: string
  reservedAt: string
}

export default function ReservationLookupPage() {
  const [isSearched, setIsSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    birthDate: '',
    phone: ''
  })

  // 검색 핸들러
  const handleSearch = async () => {
    if (!patientInfo.name || !patientInfo.birthDate || !patientInfo.phone) {
      setError('모든 정보를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/patient/appointments/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientInfo),
      })
      const data = await res.json()

      if (data.success) {
        setAppointments(data.appointments)
        setIsSearched(true)
      } else {
        setError(data.error || '예약 조회에 실패했습니다.')
      }
    } catch (err) {
      setError('예약 조회 중 오류가 발생했습니다.')
      console.error('예약 조회 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 취소 핸들러
  const handleCancel = async (appointmentId: string) => {
    if (!confirm('정말 예약을 취소하시겠습니까?')) return

    setCancellingId(appointmentId)
    setError('')

    try {
      const res = await fetch('/api/patient/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          ...patientInfo,
        }),
      })
      const data = await res.json()

      if (data.success) {
        // 목록에서 취소된 예약 제거
        setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId))
        alert('예약이 취소되었습니다.')
      } else {
        setError(data.error || '예약 취소에 실패했습니다.')
      }
    } catch (err) {
      setError('예약 취소 중 오류가 발생했습니다.')
      console.error('예약 취소 실패:', err)
    } finally {
      setCancellingId(null)
    }
  }

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return <span className="px-2 py-1 text-xs font-medium bg-[#E8F4FD] text-[#0066CC] rounded-full">예약완료</span>
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">방문완료</span>
      case 'CANCELLED':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">취소됨</span>
      case 'NO_SHOW':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">노쇼</span>
      default:
        return null
    }
  }

  // 날짜 포맷 (한글)
  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  // 다시 검색
  const handleReset = () => {
    setIsSearched(false)
    setAppointments([])
    setError('')
  }

  return (
    <div className="px-4 py-6 animate-fade-in">
      <h1 className="text-xl font-bold text-[#1E293B] mb-6">
        예약 조회 / 취소
      </h1>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 검색 폼 */}
      {!isSearched ? (
        <div className="card mb-6">
          <p className="text-sm text-[#64748B] mb-4">
            예약 시 입력한 정보로 본인의 예약을 조회할 수 있습니다.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="홍길동"
                value={patientInfo.name}
                onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                생년월일 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="19900101"
                maxLength={8}
                value={patientInfo.birthDate}
                onChange={(e) => setPatientInfo({ ...patientInfo, birthDate: e.target.value.replace(/\D/g, '') })}
              />
              <p className="text-xs text-[#64748B] mt-1">숫자 8자리 (예: 19900101)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="01012345678"
                maxLength={11}
                value={patientInfo.phone}
                onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '') })}
              />
              <p className="text-xs text-[#64748B] mt-1">-없이 숫자만 입력</p>
            </div>
            <button
              onClick={handleSearch}
              className="btn-primary w-full"
              disabled={!patientInfo.name || !patientInfo.birthDate || !patientInfo.phone || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  조회 중...
                </span>
              ) : '예약 조회'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 검색 결과 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[#64748B]">
                <span className="font-medium text-[#1E293B]">{patientInfo.name}</span>님의 예약 내역
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-[#0066CC] hover:underline"
            >
              다시 검색
            </button>
          </div>

          {/* 검색 결과 */}
          <div className="animate-slide-up">
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-[#1E293B]">
                          {appointment.department} - {appointment.doctorName} 선생님
                        </p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[#64748B] mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDateKorean(appointment.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{appointment.time}</span>
                      </div>
                    </div>

                    {appointment.status === 'BOOKED' && (
                      <button
                        className="w-full py-2 text-sm font-medium text-[#DC3545] border border-[#DC3545] rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        onClick={() => handleCancel(appointment.id)}
                        disabled={cancellingId === appointment.id}
                      >
                        {cancellingId === appointment.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            취소 중...
                          </span>
                        ) : '예약 취소'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[#64748B]">예약 내역이 없습니다.</p>
                <Link
                  href="/reserve"
                  className="inline-block mt-4 text-sm text-[#0066CC] hover:underline"
                >
                  새 예약하기 →
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* 새 예약 링크 */}
      {!isSearched && (
        <div className="mt-6 text-center">
          <Link
            href="/reserve"
            className="text-sm text-[#0066CC] hover:underline"
          >
            새 예약하기 →
          </Link>
        </div>
      )}
    </div>
  )
}
