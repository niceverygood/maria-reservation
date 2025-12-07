'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/contexts/RealtimeContext'
import { formatLocalDate } from '@/lib/dateUtils'
import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/ui/Skeleton'
import { formatPhone, getStatusLabel, getStatusStyle } from '@/lib/utils'

interface Doctor {
  id: string
  name: string
  department: string
}

interface Patient {
  id: string
  name: string
  birthDate: string
  phone: string
}

interface Appointment {
  id: string
  date: string
  time: string
  status: string
  memo: string | null
  doctor: Doctor
  patient: Patient
}

interface Stats {
  total: number
  pending: number
  booked: number
  completed: number
  cancelled: number
  rejected: number
  noShow: number
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom'

// 캐시
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 30000

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  return null
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { refreshTrigger } = useRealtime()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [todayStats, setTodayStats] = useState<Stats>({ total: 0, pending: 0, booked: 0, completed: 0, cancelled: 0, rejected: 0, noShow: 0 })
  const [periodStats, setPeriodStats] = useState<Stats>({ total: 0, pending: 0, booked: 0, completed: 0, cancelled: 0, rejected: 0, noShow: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [periodLoading, setPeriodLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // 기간 선택
  const [periodType, setPeriodType] = useState<PeriodType>('daily')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // 마지막 갱신 시간
  const lastFetch = useRef<number>(0)

  // 오늘 예약 불러오기
  const fetchTodayAppointments = useCallback(async (forceRefresh = false) => {
    // 짧은 시간 내 중복 호출 방지
    if (!forceRefresh && Date.now() - lastFetch.current < 1000) return
    lastFetch.current = Date.now()

    const cacheKey = 'today-appointments'
    if (!forceRefresh) {
      const cached = getCached<{ appointments: Appointment[]; stats: Stats }>(cacheKey)
      if (cached) {
        setAppointments(cached.appointments)
        setTodayStats(cached.stats)
        setIsLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/admin/appointments/today')
      const data = await res.json()

      if (data.success) {
        setAppointments(data.appointments)
        setTodayStats(data.stats)
        setCache(cacheKey, { appointments: data.appointments, stats: data.stats })
      } else if (res.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('예약 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchTodayAppointments()
  }, [fetchTodayAppointments])

  // refreshTrigger 변경 시 (WebSocket 이벤트)
  useEffect(() => {
    if (refreshTrigger > 0) {
      cache.clear()
      fetchTodayAppointments(true)
    }
  }, [refreshTrigger, fetchTodayAppointments])

  // 기간별 통계 불러오기
  useEffect(() => {
    const fetchPeriodStats = async () => {
      setPeriodLoading(true)
      try {
        const today = new Date()
        let startDate = ''
        let endDate = formatLocalDate(today)

        switch (periodType) {
          case 'daily':
            startDate = endDate
            break
          case 'weekly':
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - 6)
            startDate = formatLocalDate(weekStart)
            break
          case 'monthly':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            startDate = formatLocalDate(monthStart)
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
            endDate = formatLocalDate(monthEnd)
            break
          case 'custom':
            if (!customStartDate || !customEndDate) {
              setPeriodLoading(false)
              return
            }
            startDate = customStartDate
            endDate = customEndDate
            break
        }

        const cacheKey = `period-stats-${startDate}-${endDate}`
        const cached = getCached<Stats>(cacheKey)
        if (cached) {
          setPeriodStats(cached)
          setPeriodLoading(false)
          return
        }

        const res = await fetch(`/api/admin/stats?startDate=${startDate}&endDate=${endDate}`)
        const data = await res.json()

        if (data.success) {
          setPeriodStats(data.stats)
          setCache(cacheKey, data.stats)
        }
      } catch (error) {
        console.error('기간별 통계 조회 오류:', error)
      } finally {
        setPeriodLoading(false)
      }
    }

    fetchPeriodStats()
  }, [periodType, customStartDate, customEndDate])

  // 상태 변경 핸들러
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setStatusUpdating(appointmentId)
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (data.success) {
        const oldApt = appointments.find(a => a.id === appointmentId)
        
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: newStatus } : apt
          )
        )
        
        // 통계 업데이트
        if (oldApt) {
          setTodayStats((prev) => {
            const newStats = { ...prev }
            // 이전 상태에서 빼기
            if (oldApt.status === 'PENDING') newStats.pending--
            else if (oldApt.status === 'BOOKED') newStats.booked--
            else if (oldApt.status === 'COMPLETED') newStats.completed--
            else if (oldApt.status === 'CANCELLED') newStats.cancelled--
            else if (oldApt.status === 'REJECTED') newStats.rejected--
            else if (oldApt.status === 'NO_SHOW') newStats.noShow--
            // 새 상태에 더하기
            if (newStatus === 'PENDING') newStats.pending++
            else if (newStatus === 'BOOKED') newStats.booked++
            else if (newStatus === 'COMPLETED') newStats.completed++
            else if (newStatus === 'CANCELLED') newStats.cancelled++
            else if (newStatus === 'REJECTED') newStats.rejected++
            else if (newStatus === 'NO_SHOW') newStats.noShow++
            
            return newStats
          })
        }
        
        cache.clear()
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  const getPeriodLabel = () => {
    const today = new Date()
    switch (periodType) {
      case 'daily': return '오늘'
      case 'weekly': return '최근 7일'
      case 'monthly': return `${today.getMonth() + 1}월`
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate} ~ ${customEndDate}`
        }
        return '기간 선택'
    }
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <div className="animate-pulse pb-20 md:pb-0">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="mb-6">
          <Skeleton className="h-6 w-24 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
          </div>
        </div>
        <div className="card">
          <Skeleton className="h-6 w-32 mb-4" />
          <table className="w-full">
            <tbody>
              {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} cols={6} />)}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">대시보드</h1>
        <p className="text-[#64748B] mt-1">{today}</p>
      </div>

      {/* 오늘의 통계 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-3">📊 오늘 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#0066CC]">{todayStats.total}</p>
            <p className="text-sm text-[#64748B] mt-1">전체 예약</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#28A745]">{todayStats.completed}</p>
            <p className="text-sm text-[#64748B] mt-1">방문 완료</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#FF9800]">{todayStats.pending + todayStats.booked}</p>
            <p className="text-sm text-[#64748B] mt-1">대기/확정</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#DC3545]">{todayStats.cancelled + todayStats.noShow + todayStats.rejected}</p>
            <p className="text-sm text-[#64748B] mt-1">취소/노쇼</p>
          </div>
        </div>
      </div>

      {/* 기간별 통계 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-[#1E293B]">📈 기간별 통계</h2>
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly', 'custom'] as PeriodType[]).map(type => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  periodType === type
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'daily' ? '일별' : type === 'weekly' ? '주별' : type === 'monthly' ? '월별' : '기간 선택'}
              </button>
            ))}
          </div>
        </div>

        {/* 기간 선택 UI */}
        {periodType === 'custom' && (
          <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
            </div>
          </div>
        )}

        <p className="text-sm text-[#64748B] mb-3">
          📅 {getPeriodLabel()} 통계
          {periodLoading && <span className="ml-2 text-xs">(로딩 중...)</span>}
        </p>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-px bg-gray-200">
            {[
              { color: 'bg-yellow-400', value: periodStats.pending, label: '대기', textColor: 'text-yellow-600' },
              { color: 'bg-blue-500', value: periodStats.booked, label: '확정', textColor: 'text-blue-600' },
              { color: 'bg-green-500', value: periodStats.completed, label: '완료', textColor: 'text-green-600' },
              { color: 'bg-gray-400', value: periodStats.cancelled, label: '취소', textColor: 'text-gray-600' },
              { color: 'bg-red-400', value: periodStats.rejected, label: '거절', textColor: 'text-red-600' },
              { color: 'bg-orange-500', value: periodStats.noShow, label: '노쇼', textColor: 'text-orange-600' },
              { color: 'bg-[#0066CC]', value: periodStats.total, label: '전체', textColor: 'text-[#0066CC]', colSpan: 'col-span-2 md:col-span-1' },
            ].map(({ color, value, label, textColor, colSpan }) => (
              <div key={label} className={`bg-white p-4 text-center ${colSpan || ''}`}>
                <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-2`}></div>
                <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 빠른 작업 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link
          href="/admin/reservations/new"
          className="card flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-[#E8F4FD] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[#1E293B]">새 예약</p>
            <p className="text-xs text-[#64748B]">전화 예약 입력</p>
          </div>
        </Link>
        <Link
          href="/admin/reservations"
          className="card flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-[#FFF3E0] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[#FF9800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[#1E293B]">예약 검색</p>
            <p className="text-xs text-[#64748B]">예약 조회/변경</p>
          </div>
        </Link>
      </div>

      {/* 오늘 예약 리스트 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1E293B]">오늘 예약 현황</h2>
          <Link
            href="/admin/reservations"
            className="text-sm text-[#0066CC] hover:underline"
          >
            전체 보기 →
          </Link>
        </div>

        {appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">시간</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">환자명</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden sm:table-cell">연락처</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">의사</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상태</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">작업</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm font-medium text-[#1E293B]">{appointment.time}</td>
                    <td className="py-3 px-2 text-sm text-[#1E293B]">{appointment.patient.name}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B] hidden sm:table-cell">{formatPhone(appointment.patient.phone)}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{appointment.doctor.name}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {(appointment.status === 'PENDING' || appointment.status === 'BOOKED') && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                            disabled={statusUpdating === appointment.id}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
                          >
                            완료
                          </button>
                          <button
                            onClick={() => handleStatusChange(appointment.id, 'NO_SHOW')}
                            disabled={statusUpdating === appointment.id}
                            className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100 disabled:opacity-50"
                          >
                            노쇼
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#64748B]">
            오늘 예약이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
