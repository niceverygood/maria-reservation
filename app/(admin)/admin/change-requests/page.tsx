'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Doctor {
  id: string
  name: string
  department: string
}

interface Patient {
  name: string
  phone: string
}

interface Appointment {
  id: string
  date: string
  time: string
  patient: Patient
}

interface ChangeRequest {
  id: string
  doctorId: string
  appointmentId: string | null
  requestType: string
  originalDate: string | null
  originalTime: string | null
  newDate: string | null
  newTime: string | null
  offDate: string | null
  offReason: string | null
  reason: string | null
  status: string
  processedBy: string | null
  processedAt: string | null
  rejectReason: string | null
  createdAt: string
  doctor?: Doctor
  appointment?: Appointment
}

export default function ChangeRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/change-requests?status=${filter}`)
      const data = await res.json()

      if (data.success) {
        setRequests(data.requests)
      } else if (res.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('변경 요청 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter, router])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApprove = async (id: string) => {
    if (!confirm('이 요청을 승인하시겠습니까?')) return
    
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()

      if (data.success) {
        alert('요청이 승인되었습니다.')
        fetchRequests()
      } else {
        alert(data.error || '승인 실패')
      }
    } catch (error) {
      console.error('승인 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('거절 사유를 입력하세요 (선택사항):')
    if (reason === null) return

    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectReason: reason }),
      })
      const data = await res.json()

      if (data.success) {
        alert('요청이 거절되었습니다.')
        fetchRequests()
      } else {
        alert(data.error || '거절 실패')
      }
    } catch (error) {
      console.error('거절 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'RESCHEDULE': return '일정 변경'
      case 'CANCEL': return '예약 취소'
      case 'OFF_DAY': return '휴진 요청'
      default: return type
    }
  }

  const getRequestTypeStyle = (type: string) => {
    switch (type) {
      case 'RESCHEDULE': return 'bg-blue-100 text-blue-700'
      case 'CANCEL': return 'bg-red-100 text-red-700'
      case 'OFF_DAY': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'APPROVED': return 'bg-green-100 text-green-700'
      case 'REJECTED': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '대기 중'
      case 'APPROVED': return '승인'
      case 'REJECTED': return '거절'
      default: return status
    }
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    if (phone.length === 11) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    return phone
  }

  const pendingCount = requests.filter(r => r.status === 'PENDING').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">변경 요청 관리</h1>
          <p className="text-sm text-[#64748B] mt-1">
            의사들의 일정 변경, 예약 취소, 휴진 요청을 처리합니다
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
            ⏳ 대기 중 {pendingCount}건
          </div>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6">
        {(['PENDING', 'APPROVED', 'REJECTED', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === status
                ? 'bg-[#0066CC] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status === 'PENDING' ? '대기 중' :
             status === 'APPROVED' ? '승인됨' :
             status === 'REJECTED' ? '거절됨' : '전체'}
          </button>
        ))}
      </div>

      {/* 요청 목록 */}
      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((req) => (
            <div
              key={req.id}
              className={`card ${
                req.status === 'PENDING' ? 'border-l-4 border-l-yellow-400' :
                req.status === 'APPROVED' ? 'border-l-4 border-l-green-400' :
                'border-l-4 border-l-red-400'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* 요청 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getRequestTypeStyle(req.requestType)}`}>
                      {getRequestTypeLabel(req.requestType)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusStyle(req.status)}`}>
                      {getStatusLabel(req.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-[#1E293B]">
                      {req.doctor?.name} 선생님
                    </span>
                    <span className="text-sm text-gray-500">
                      {req.doctor?.department}
                    </span>
                  </div>

                  {req.requestType === 'OFF_DAY' ? (
                    <div className="text-sm text-gray-700">
                      <p>📅 휴진일: <span className="font-medium">{req.offDate}</span></p>
                      {req.offReason && <p>💬 사유: {req.offReason}</p>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700">
                      <p>📅 기존: <span className="font-medium">{req.originalDate} {req.originalTime}</span></p>
                      {req.newDate && (
                        <p>➡️ 변경: <span className="font-medium text-blue-600">{req.newDate} {req.newTime}</span></p>
                      )}
                      {req.appointment && (
                        <p className="mt-1">
                          👤 환자: {req.appointment.patient.name} ({formatPhone(req.appointment.patient.phone)})
                        </p>
                      )}
                    </div>
                  )}

                  {req.reason && (
                    <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                      💬 {req.reason}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    요청일시: {new Date(req.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>

                  {req.status !== 'PENDING' && req.processedAt && (
                    <p className="text-xs text-gray-400">
                      처리일시: {new Date(req.processedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}

                  {req.rejectReason && (
                    <p className="text-xs text-red-500 mt-1">
                      거절 사유: {req.rejectReason}
                    </p>
                  )}
                </div>

                {/* 액션 버튼 */}
                {req.status === 'PENDING' && (
                  <div className="flex md:flex-col gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={processing === req.id}
                      className="flex-1 md:w-24 py-2 text-sm font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      ✓ 승인
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={processing === req.id}
                      className="flex-1 md:w-24 py-2 text-sm font-bold bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50"
                    >
                      ✕ 거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12 text-gray-500">
            {filter === 'PENDING' ? '대기 중인 요청이 없습니다' :
             filter === 'APPROVED' ? '승인된 요청이 없습니다' :
             filter === 'REJECTED' ? '거절된 요청이 없습니다' :
             '변경 요청이 없습니다'}
          </div>
        )}
      </div>
    </div>
  )
}









