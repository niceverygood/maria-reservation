'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  booked: number
  completed: number
  cancelled: number
  noShow: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, booked: 0, completed: 0, cancelled: 0, noShow: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // 오늘 예약 불러오기
  useEffect(() => {
    const fetchTodayAppointments = async () => {
      try {
        const res = await fetch('/api/admin/appointments/today')
        const data = await res.json()

        if (data.success) {
          setAppointments(data.appointments)
          setStats(data.stats)
        } else if (res.status === 401) {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('예약 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTodayAppointments()
  }, [router])

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
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: newStatus } : apt
          )
        )
        // 통계 업데이트
        setStats((prev) => {
          const oldApt = appointments.find((a) => a.id === appointmentId)
          if (!oldApt) return prev
          
          const newStats = { ...prev }
          // 이전 상태에서 빼기
          if (oldApt.status === 'BOOKED') newStats.booked--
          else if (oldApt.status === 'COMPLETED') newStats.completed--
          else if (oldApt.status === 'CANCELLED') newStats.cancelled--
          else if (oldApt.status === 'NO_SHOW') newStats.noShow--
          // 새 상태에 더하기
          if (newStatus === 'BOOKED') newStats.booked++
          else if (newStatus === 'COMPLETED') newStats.completed++
          else if (newStatus === 'CANCELLED') newStats.cancelled++
          else if (newStatus === 'NO_SHOW') newStats.noShow++
          
          return newStats
        })
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-100 text-blue-700'
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600'
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'BOOKED': return '예약'
      case 'COMPLETED': return '완료'
      case 'CANCELLED': return '취소'
      case 'NO_SHOW': return '노쇼'
      default: return status
    }
  }

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    }
    return phone
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-[#64748B]">로딩 중...</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#0066CC]">{stats.total}</p>
          <p className="text-sm text-[#64748B] mt-1">전체 예약</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#28A745]">{stats.completed}</p>
          <p className="text-sm text-[#64748B] mt-1">방문 완료</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#FF9800]">{stats.booked}</p>
          <p className="text-sm text-[#64748B] mt-1">대기 중</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#DC3545]">{stats.cancelled + stats.noShow}</p>
          <p className="text-sm text-[#64748B] mt-1">취소/노쇼</p>
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
                      {appointment.status === 'BOOKED' && (
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
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
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
