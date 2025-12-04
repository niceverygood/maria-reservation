'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/patient/Calendar'

interface Doctor {
  id: string
  name: string
  department: string
}

interface TimeSlot {
  time: string
  available: boolean
}

export default function AdminNewReservationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 의사 목록
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<string[]>([])

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phone: '',
    doctorId: '',
    date: '',
    time: '',
    memo: '',
  })

  // 시간 슬롯
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // 날짜 범위
  const dateRange = {
    minDate: new Date(),
    maxDate: (() => {
      const d = new Date()
      d.setDate(d.getDate() + 56) // 8주
      return d
    })(),
  }

  // 의사 목록 불러오기
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/patient/doctors')
        const data = await res.json()
        if (data.success) {
          setDoctors(data.doctors)
          setDepartments(data.departments)
        }
      } catch (error) {
        console.error('의사 목록 조회 오류:', error)
      }
    }
    fetchDoctors()
  }, [])

  // 시간 슬롯 불러오기
  useEffect(() => {
    if (!formData.doctorId || !formData.date) {
      setTimeSlots([])
      return
    }

    const fetchSlots = async () => {
      setSlotsLoading(true)
      setFormData((prev) => ({ ...prev, time: '' }))
      try {
        const res = await fetch('/api/patient/appointments/available-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctorId: formData.doctorId,
            date: formData.date,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setTimeSlots(data.slots)
        }
      } catch (error) {
        console.error('시간 슬롯 조회 오류:', error)
      } finally {
        setSlotsLoading(false)
      }
    }
    fetchSlots()
  }, [formData.doctorId, formData.date])

  // 예약 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || '예약 생성에 실패했습니다.')
      }
    } catch {
      setError('예약 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 선택된 의사 정보
  const selectedDoctor = doctors.find((d) => d.id === formData.doctorId)

  // 날짜 포맷 (한글)
  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  if (success) {
    return (
      <div className="animate-fade-in pb-20 md:pb-0">
        <div className="card text-center py-8">
          <div className="w-16 h-16 mx-auto bg-[#28A745] rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1E293B] mb-2">예약이 등록되었습니다</h2>
          <p className="text-sm text-[#64748B] mb-6">
            {formData.name}님, {selectedDoctor?.name} 선생님<br />
            {formData.date && formatDateKorean(formData.date)} {formData.time}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false)
                setFormData({
                  name: '',
                  birthDate: '',
                  phone: '',
                  doctorId: '',
                  date: '',
                  time: '',
                  memo: '',
                })
              }}
              className="btn-secondary"
            >
              새 예약 등록
            </button>
            <button onClick={() => router.push('/admin/dashboard')} className="btn-primary">
              대시보드로
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-[#1E293B] mb-6">새 예약 등록</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 환자 정보 */}
        <div className="card">
          <h2 className="font-semibold text-[#1E293B] mb-4">환자 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="01012345678"
                maxLength={11}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
          </div>
        </div>

        {/* 의사 선택 */}
        <div className="card">
          <h2 className="font-semibold text-[#1E293B] mb-4">의사 선택</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">진료과</label>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setFormData({ ...formData, doctorId: '', date: '', time: '' })}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      selectedDoctor?.department === dept
                        ? 'bg-[#0066CC] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                의사 <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field"
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value, date: '', time: '' })}
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
          </div>
        </div>

        {/* 날짜/시간 선택 */}
        {formData.doctorId && (
          <div className="card">
            <h2 className="font-semibold text-[#1E293B] mb-4">날짜 / 시간 선택</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  날짜 <span className="text-red-500">*</span>
                </label>
                <Calendar
                  selectedDate={formData.date}
                  onSelectDate={(date) => setFormData({ ...formData, date, time: '' })}
                  minDate={dateRange.minDate}
                  maxDate={dateRange.maxDate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  시간 <span className="text-red-500">*</span>
                </label>
                {!formData.date ? (
                  <p className="text-sm text-[#64748B]">먼저 날짜를 선택해주세요.</p>
                ) : slotsLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block w-6 h-6 border-3 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <p className="text-sm text-[#64748B]">해당 날짜에 예약 가능한 시간이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => slot.available && setFormData({ ...formData, time: slot.time })}
                        disabled={!slot.available}
                        className={`py-2 px-2 rounded text-sm font-medium transition-all ${
                          formData.time === slot.time
                            ? 'bg-[#0066CC] text-white'
                            : slot.available
                            ? 'border border-[#0066CC] text-[#0066CC] hover:bg-[#E8F4FD]'
                            : 'border border-gray-200 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 메모 */}
        <div className="card">
          <h2 className="font-semibold text-[#1E293B] mb-4">메모 (선택)</h2>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="직원용 메모를 입력하세요"
            value={formData.memo}
            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={isLoading || !formData.name || !formData.birthDate || !formData.phone || !formData.doctorId || !formData.date || !formData.time}
          >
            {isLoading ? '등록 중...' : '예약 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
