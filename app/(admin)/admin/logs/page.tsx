'use client'

import { useState, useEffect, useCallback } from 'react'

interface Patient {
  id: string
  name: string
  phone: string | null
  birthDate: string | null
}

interface Doctor {
  id: string
  name: string
  department: string
}

interface LogEntry {
  id: string
  date: string
  time: string
  status: string
  memo: string | null
  reservedAt: string
  updatedAt: string
  patient: Patient
  doctor: Doctor
}

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  })
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchName) params.set('patientName', searchName)
      if (filterStatus) params.set('status', filterStatus)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())

      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('로그 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }, [searchName, filterStatus, startDate, endDate, pagination.page, pagination.limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchLogs()
  }

  const handleStatusChange = async (logId: string, newStatus: string) => {
    if (statusUpdating) return
    setStatusUpdating(logId)
    
    try {
      const res = await fetch(`/api/admin/appointments/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      
      if (data.success) {
        setLogs((prev) =>
          prev.map((log) =>
            log.id === logId ? { ...log, status: newStatus, updatedAt: new Date().toISOString() } : log
          )
        )
      } else {
        alert(data.error || '상태 변경 실패')
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    } finally {
      setStatusUpdating(null)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'BOOKED':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'NO_SHOW':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '대기'
      case 'BOOKED':
        return '확정'
      case 'COMPLETED':
        return '완료'
      case 'CANCELLED':
        return '취소'
      case 'REJECTED':
        return '거절'
      case 'NO_SHOW':
        return '노쇼'
      default:
        return status
    }
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">예약 로그 관리</h1>
          <p className="text-sm text-[#64748B] mt-1">환자별 예약 내역을 조회하고 상태를 관리합니다</p>
        </div>
        <div className="text-sm text-[#64748B]">
          총 <span className="font-bold text-[#0066CC]">{pagination.totalCount}</span>건
        </div>
      </div>

      {/* 검색/필터 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 환자 이름 검색 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#64748B] mb-1">환자 이름</label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                placeholder="환자 이름으로 검색..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">상태</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">전체</option>
              <option value="PENDING">대기</option>
              <option value="BOOKED">확정</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
              <option value="REJECTED">거절</option>
              <option value="NO_SHOW">노쇼</option>
            </select>
          </div>

          {/* 기간 필터 */}
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">시작일</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">종료일</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#0066CC] text-white rounded-lg text-sm font-medium hover:bg-[#0052A3] transition-colors"
          >
            검색
          </button>
          <button
            onClick={() => {
              setSearchName('')
              setFilterStatus('')
              setStartDate('')
              setEndDate('')
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 bg-gray-100 text-[#64748B] rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 로그 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC]"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-[#94A3B8]">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>검색 결과가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    예약일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    환자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">
                    연락처
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    담당의
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">
                    신청일시
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">
                    수정일시
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    상태 변경
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-gray-50 ${log.status === 'PENDING' ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#1E293B]">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1E293B]">{log.time}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#1E293B]">{log.patient.name}</p>
                        {log.patient.birthDate && (
                          <p className="text-xs text-[#94A3B8]">{log.patient.birthDate}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B] hidden md:table-cell">
                      {formatPhone(log.patient.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-[#1E293B]">{log.doctor.name}</p>
                        <p className="text-xs text-[#94A3B8]">{log.doctor.department}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(log.status)}`}
                      >
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94A3B8] hidden lg:table-cell">
                      {formatDateTime(log.reservedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94A3B8] hidden lg:table-cell">
                      {formatDateTime(log.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {/* PENDING 상태: 확정/거절 */}
                        {log.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(log.id, 'BOOKED')}
                              disabled={statusUpdating === log.id}
                              className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                              확정
                            </button>
                            <button
                              onClick={() => handleStatusChange(log.id, 'REJECTED')}
                              disabled={statusUpdating === log.id}
                              className="px-2 py-1 text-xs font-medium bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                            >
                              거절
                            </button>
                          </>
                        )}
                        {/* BOOKED 상태: 완료/노쇼/취소 */}
                        {log.status === 'BOOKED' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(log.id, 'COMPLETED')}
                              disabled={statusUpdating === log.id}
                              className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              완료
                            </button>
                            <button
                              onClick={() => handleStatusChange(log.id, 'NO_SHOW')}
                              disabled={statusUpdating === log.id}
                              className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                            >
                              노쇼
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('예약을 취소하시겠습니까?')) {
                                  handleStatusChange(log.id, 'CANCELLED')
                                }
                              }}
                              disabled={statusUpdating === log.id}
                              className="px-2 py-1 text-xs font-medium bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                            >
                              취소
                            </button>
                          </>
                        )}
                        {/* 완료/취소/거절/노쇼 상태: 상태 복구 옵션 */}
                        {['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(log.status) && (
                          <select
                            className="text-xs border rounded px-2 py-1"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(log.id, e.target.value)
                                e.target.value = ''
                              }
                            }}
                            disabled={statusUpdating === log.id}
                          >
                            <option value="">변경</option>
                            <option value="PENDING">대기로</option>
                            <option value="BOOKED">확정으로</option>
                            <option value="COMPLETED">완료로</option>
                            <option value="CANCELLED">취소로</option>
                            <option value="NO_SHOW">노쇼로</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-[#64748B]">
              {pagination.page} / {pagination.totalPages} 페이지
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                이전
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




