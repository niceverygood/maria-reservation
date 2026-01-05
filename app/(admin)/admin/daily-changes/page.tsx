'use client'

import { useState, useEffect, useCallback } from 'react'

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  changeCount: number
  originalDate?: string
  originalTime?: string
  lastChangedAt?: string
  emrSynced: boolean
  doctor: {
    id: string
    name: string
    department: string
  }
  patient: {
    id: string
    name: string
    birthDate?: string
    phone?: string
  }
}

interface DailyChangesData {
  date: string
  summary: {
    newCount: number
    changedCount: number
    cancelledCount: number
    unsyncedCount: number
  }
  newAppointments: Appointment[]
  changedAppointments: Appointment[]
  cancelledAppointments: Appointment[]
  unsyncedAppointments: Appointment[]
}

export default function DailyChangesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  })
  const [data, setData] = useState<DailyChangesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/admin/daily-changes?date=${selectedDate}`)
      const result = await res.json()
      
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // EMR 등록 처리
  const handleEmrSync = async (appointmentId: string) => {
    try {
      setSyncingIds(prev => new Set(prev).add(appointmentId))
      
      const res = await fetch(`/api/admin/appointments/${appointmentId}/emr-sync`, {
        method: 'POST'
      })
      
      const result = await res.json()
      
      if (result.success) {
        // 데이터 새로고침
        loadData()
      } else {
        alert('EMR 등록 실패: ' + result.error)
      }
    } catch (error) {
      console.error('EMR 등록 실패:', error)
      alert('EMR 등록 중 오류가 발생했습니다.')
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev)
        next.delete(appointmentId)
        return next
      })
    }
  }

  // 전체 EMR 등록
  const handleEmrSyncAll = async (appointments: Appointment[]) => {
    if (!confirm(`${appointments.length}개의 예약을 EMR에 등록하시겠습니까?`)) return
    
    for (const apt of appointments) {
      if (!apt.emrSynced) {
        await handleEmrSync(apt.id)
      }
    }
  }

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`
  }

  // 전화번호 포맷
  const formatPhone = (phone?: string) => {
    if (!phone) return '-'
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }

  // 생년월일 포맷
  const formatBirthDate = (bd?: string) => {
    if (!bd) return '-'
    if (bd.length === 8) {
      return `${bd.slice(0, 4)}.${bd.slice(4, 6)}.${bd.slice(6, 8)}`
    }
    return bd
  }

  // 예약 테이블 렌더링
  const renderAppointmentTable = (
    appointments: Appointment[],
    title: string,
    bgColor: string,
    showOriginal: boolean = false,
    showEmrSync: boolean = false
  ) => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className={`${bgColor} px-4 py-3 flex items-center justify-between`}>
        <h3 className="font-semibold text-white">{title} ({appointments.length}건)</h3>
        {showEmrSync && appointments.length > 0 && (
          <button
            onClick={() => handleEmrSyncAll(appointments)}
            className="text-white/80 hover:text-white text-sm underline"
          >
            전체 EMR 등록
          </button>
        )}
      </div>
      
      {appointments.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          해당 항목이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">예약일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">시간</th>
                {showOriginal && (
                  <th className="px-4 py-3 text-left font-medium text-gray-600">변경 전</th>
                )}
                <th className="px-4 py-3 text-left font-medium text-gray-600">담당의</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">환자명</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">생년월일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">연락처</th>
                {showEmrSync && (
                  <th className="px-4 py-3 text-center font-medium text-gray-600">EMR</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map(apt => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(apt.date)}</td>
                  <td className="px-4 py-3 font-medium">{apt.time}</td>
                  {showOriginal && (
                    <td className="px-4 py-3 text-gray-500">
                      {apt.originalDate && apt.originalTime
                        ? `${formatDate(apt.originalDate)} ${apt.originalTime}`
                        : '-'}
                    </td>
                  )}
                  <td className="px-4 py-3">{apt.doctor.name}</td>
                  <td className="px-4 py-3 font-medium">{apt.patient.name}</td>
                  <td className="px-4 py-3">{formatBirthDate(apt.patient.birthDate)}</td>
                  <td className="px-4 py-3">{formatPhone(apt.patient.phone)}</td>
                  {showEmrSync && (
                    <td className="px-4 py-3 text-center">
                      {apt.emrSynced ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ 완료
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEmrSync(apt.id)}
                          disabled={syncingIds.has(apt.id)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                        >
                          {syncingIds.has(apt.id) ? '처리중...' : 'EMR 등록'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 전일 변경사항</h1>
          <p className="text-sm text-gray-500 mt-1">EMR 입력용 - 확정/변경/취소된 예약 목록</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">조회 날짜:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              setSelectedDate(yesterday.toISOString().split('T')[0])
            }}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            어제
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            오늘
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">{data.summary.newCount}</div>
            <div className="text-sm text-green-700">신규 예약</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">{data.summary.changedCount}</div>
            <div className="text-sm text-blue-700">변경된 예약</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{data.summary.cancelledCount}</div>
            <div className="text-sm text-red-700">취소된 예약</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-600">{data.summary.unsyncedCount}</div>
            <div className="text-sm text-yellow-700">EMR 미등록</div>
          </div>
        </div>
      )}

      {/* 예약 목록들 */}
      {data && (
        <div className="space-y-6">
          {renderAppointmentTable(
            data.newAppointments,
            '✅ 신규 확정 예약',
            'bg-green-600',
            false,
            true
          )}
          
          {renderAppointmentTable(
            data.changedAppointments,
            '🔄 변경된 예약',
            'bg-blue-600',
            true,
            true
          )}
          
          {renderAppointmentTable(
            data.cancelledAppointments,
            '❌ 취소된 예약',
            'bg-red-600',
            false,
            false
          )}
          
          {data.unsyncedAppointments.length > 0 && (
            renderAppointmentTable(
              data.unsyncedAppointments,
              '⚠️ EMR 미등록 예약 (이전 날짜)',
              'bg-yellow-600',
              false,
              true
            )
          )}
        </div>
      )}

      {/* 안내 */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <h4 className="font-semibold mb-2">💡 사용 안내</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>신규 확정 예약</strong>: 해당 날짜에 새로 생성된 예약입니다.</li>
          <li><strong>변경된 예약</strong>: 해당 날짜에 일정이 변경된 예약입니다. 변경 전 일정도 함께 표시됩니다.</li>
          <li><strong>취소된 예약</strong>: 해당 날짜에 취소된 예약입니다.</li>
          <li><strong>EMR 등록</strong>: 예약 정보를 EMR에 입력한 후 &apos;EMR 등록&apos; 버튼을 클릭하세요.</li>
        </ul>
      </div>
    </div>
  )
}

