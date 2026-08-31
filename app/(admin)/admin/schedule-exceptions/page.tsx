'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Doctor {
  id: string
  name: string
  department: string
}

interface ScheduleException {
  id: string
  doctorId: string
  date: string
  type: string
  customStart: string | null
  customEnd: string | null
  customInterval: number | null
  reason: string | null
  doctor: Doctor
}

export default function AdminScheduleExceptionsPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    doctorId: '',
    date: '',
    type: 'OFF',
    customStart: '09:00',
    customEnd: '12:00',
    customInterval: 15,
    reason: '',
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

  // 예외일 목록 불러오기
  const fetchExceptions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/schedule-exceptions')
      const data = await res.json()
      if (data.success) {
        setExceptions(data.exceptions)
      } else if (res.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('예외일 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExceptions()
  }, [router])

  // 예외일 추가
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/schedule-exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setFormData({
          doctorId: '',
          date: '',
          type: 'OFF',
          customStart: '09:00',
          customEnd: '12:00',
          customInterval: 15,
          reason: '',
        })
        fetchExceptions()
      }
    } catch (error) {
      console.error('예외일 저장 오류:', error)
    } finally {
      setSaving(false)
    }
  }

  // 예외일 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/admin/schedule-exceptions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchExceptions()
      }
    } catch (error) {
      console.error('예외일 삭제 오류:', error)
    }
  }

  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} (${weekDays[date.getDay()]})`
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">예외일 설정</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          + 예외일 추가
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : exceptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">날짜</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">의사</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">유형</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">사유</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">관리</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((exception) => (
                  <tr key={exception.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-[#1E293B]">{formatDateKorean(exception.date)}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{exception.doctor.name}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        exception.type === 'OFF' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {exception.type === 'OFF' ? '휴진' : '특별 스케줄'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{exception.reason || '-'}</td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => handleDelete(exception.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#64748B]">등록된 예외일이 없습니다.</div>
        )}
      </div>

      {/* 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">예외일 추가</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">의사</label>
                <select
                  className="input-field"
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  required
                >
                  <option value="">선택하세요</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">날짜</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">유형</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="OFF"
                      checked={formData.type === 'OFF'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                    <span className="text-sm">휴진</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="CUSTOM"
                      checked={formData.type === 'CUSTOM'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                    <span className="text-sm">특별 스케줄</span>
                  </label>
                </div>
              </div>
              {formData.type === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">시작 시간</label>
                    <input
                      type="time"
                      className="input-field text-sm py-2"
                      value={formData.customStart}
                      onChange={(e) => setFormData({ ...formData, customStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">종료 시간</label>
                    <input
                      type="time"
                      className="input-field text-sm py-2"
                      value={formData.customEnd}
                      onChange={(e) => setFormData({ ...formData, customEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">사유 (선택)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="예: 학회, 휴가"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  취소
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
