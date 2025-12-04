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

export default function AdminReservationsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // 필터
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    doctorId: '',
    status: '',
    search: '',
  })

  // 의사 목록 불러오기
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/patient/doctors')
        const data = await res.json()
        if (data.success) {
          setDoctors(data.doctors)
        }
      } catch (error) {
        console.error('의사 목록 조회 오류:', error)
      }
    }
    fetchDoctors()
  }, [])

  // 예약 목록 불러오기
  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.date) params.append('date', filters.date)
        if (filters.doctorId) params.append('doctorId', filters.doctorId)
        if (filters.status) params.append('status', filters.status)
        if (filters.search) params.append('search', filters.search)

        const res = await fetch(`/api/admin/appointments?${params.toString()}`)
        const data = await res.json()

        if (data.success) {
          setAppointments(data.appointments)
        } else if (res.status === 401) {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('예약 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [filters, router])

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
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    } finally {
      setStatusUpdating(null)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'BOOKED': return 'bg-blue-100 text-blue-700'
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600'
      case 'NO_SHOW': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
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

  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}/${date.getDate()} (${weekDays[date.getDay()]})`
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">예약 관리</h1>
        <Link href="/admin/reservations/new" className="btn-primary text-sm">
          + 새 예약
        </Link>
      </div>

      {/* 필터 */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">날짜</label>
            <input
              type="date"
              className="input-field text-sm py-2"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">의사</label>
            <select
              className="input-field text-sm py-2"
              value={filters.doctorId}
              onChange={(e) => setFilters({ ...filters, doctorId: e.target.value })}
            >
              <option value="">전체</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} ({doctor.department})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">상태</label>
            <select
              className="input-field text-sm py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">전체</option>
              <option value="BOOKED">예약</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
              <option value="NO_SHOW">노쇼</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">검색</label>
            <input
              type="text"
              className="input-field text-sm py-2"
              placeholder="환자명 또는 전화번호"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-[#64748B]">로딩 중...</p>
          </div>
        ) : appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">날짜</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">시간</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">환자명</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden md:table-cell">연락처</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden sm:table-cell">진료과</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">의사</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상태</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">작업</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-[#1E293B]">{formatDateKorean(appointment.date)}</td>
                    <td className="py-3 px-2 text-sm font-medium text-[#1E293B]">{appointment.time}</td>
                    <td className="py-3 px-2 text-sm text-[#1E293B]">{appointment.patient.name}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B] hidden md:table-cell">{formatPhone(appointment.patient.phone)}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B] hidden sm:table-cell">{appointment.doctor.department}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{appointment.doctor.name}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={appointment.status}
                        onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                        disabled={statusUpdating === appointment.id}
                      >
                        <option value="BOOKED">예약</option>
                        <option value="COMPLETED">완료</option>
                        <option value="NO_SHOW">노쇼</option>
                        <option value="CANCELLED">취소</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#64748B]">
            검색 조건에 맞는 예약이 없습니다.
          </div>
        )}

        <div className="mt-4 text-sm text-[#64748B]">
          총 {appointments.length}건
        </div>
      </div>
    </div>
  )
}
