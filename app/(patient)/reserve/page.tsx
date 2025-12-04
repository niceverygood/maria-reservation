'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Calendar from '@/components/patient/Calendar'

// 예약 스텝 타입
type ReservationStep = 1 | 2 | 3 | 4 | 5

// 의사 타입
interface Doctor {
  id: string
  name: string
  department: string
}

// 슬롯 타입
interface TimeSlot {
  time: string
  available: boolean
}

// 예약 결과 타입
interface AppointmentResult {
  id: string
  doctorName: string
  department: string
  date: string
  time: string
}

// 환자 정보 타입
interface PatientInfo {
  patientId?: string
  name: string
  birthDate: string
  phone: string
  kakaoId?: string
}

export default function ReservePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<ReservationStep>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // 환자 정보
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    birthDate: '',
    phone: ''
  })

  // 의사/진료과 선택
  const [departments, setDepartments] = useState<string[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  // 날짜/시간 선택
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // 예약 결과
  const [appointmentResult, setAppointmentResult] = useState<AppointmentResult | null>(null)

  // 예약 가능 날짜 범위 (오늘 ~ 4주 후)
  const dateRange = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 28)
    return { minDate: today, maxDate }
  }, [])

  // 스텝 제목
  const stepTitles: Record<ReservationStep, string> = {
    1: '날짜 선택',
    2: '의사 선택',
    3: '시간 선택',
    4: '본인 정보 확인',
    5: '예약 완료'
  }

  // 로그인 상태 확인 및 환자 정보 로드
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (data.success && data.patient) {
          setIsLoggedIn(true)
          setPatientInfo({
            patientId: data.patient.patientId,
            name: data.patient.name || '',
            birthDate: data.patient.birthDate || '',
            phone: data.patient.phone || '',
            kakaoId: data.patient.kakaoId
          })
        }
      } catch {
        // 로그인 안됨 - 비회원으로 진행
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  // 의사 목록 로드
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/patient/doctors')
        const data = await res.json()
        if (data.success) {
          setDoctors(data.doctors)
          setDepartments(data.departments)
        }
      } catch (err) {
        console.error('의사 목록 로드 실패:', err)
      }
    }
    fetchDoctors()
  }, [])

  // 날짜 + 의사 선택 시 시간 슬롯 로드
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setTimeSlots([])
      return
    }

    const fetchSlots = async () => {
      setSlotsLoading(true)
      setSelectedTime(null)
      try {
        const res = await fetch('/api/patient/appointments/available-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctorId: selectedDoctor.id,
            date: selectedDate,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setTimeSlots(data.slots)
        } else {
          setTimeSlots([])
        }
      } catch (err) {
        console.error('시간 슬롯 로드 실패:', err)
        setTimeSlots([])
      } finally {
        setSlotsLoading(false)
      }
    }
    fetchSlots()
  }, [selectedDoctor, selectedDate])

  // 진료과별 의사 필터
  const filteredDoctors = useMemo(() => {
    if (!selectedDepartment) return doctors
    return doctors.filter((d) => d.department === selectedDepartment)
  }, [doctors, selectedDepartment])

  // 예약 생성
  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientInfo.name,
          birthDate: patientInfo.birthDate,
          phone: patientInfo.phone,
          doctorId: selectedDoctor.id,
          date: selectedDate,
          time: selectedTime,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setAppointmentResult(data.appointment)
        setCurrentStep(5)
      } else {
        setError(data.error || '예약 생성에 실패했습니다.')
      }
    } catch (err) {
      setError('예약 중 오류가 발생했습니다.')
      console.error('예약 생성 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 다음 단계로 이동 가능 여부
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!selectedDate
      case 2:
        return !!selectedDoctor
      case 3:
        return !!selectedTime
      case 4:
        return patientInfo.name.length >= 2 && 
               patientInfo.birthDate.length === 8 && 
               patientInfo.phone.length >= 10
      default:
        return true
    }
  }

  // 날짜 포맷 (한글)
  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FD] to-white">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#0066CC]">
            일산마리아병원
          </Link>
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#64748B]">{patientInfo.name}님</span>
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/login')
                }}
                className="text-sm text-[#94A3B8] hover:text-[#64748B]"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm text-[#0066CC] hover:underline">
              로그인
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
        {/* 진행 표시 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === currentStep
                    ? 'bg-[#0066CC] text-white'
                    : step < currentStep
                    ? 'bg-[#28A745] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step < currentStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
            ))}
          </div>
          <div className="h-1 bg-gray-200 rounded">
            <div
              className="h-full bg-[#0066CC] rounded transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* 스텝 제목 */}
        <h1 className="text-xl font-bold text-[#1E293B] mb-4">
          {stepTitles[currentStep]}
        </h1>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 스텝별 콘텐츠 */}
        <div className="card">
          {/* Step 1: 날짜 선택 */}
          {currentStep === 1 && (
            <div>
              <p className="text-sm text-[#64748B] mb-4">
                예약을 원하시는 날짜를 선택해주세요.
              </p>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                minDate={dateRange.minDate}
                maxDate={dateRange.maxDate}
              />
              {selectedDate && (
                <div className="mt-4 p-3 bg-[#E8F4FD] rounded-lg text-center">
                  <p className="text-[#0066CC] font-medium">
                    {formatDateKorean(selectedDate)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: 의사 선택 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* 선택된 날짜 표시 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-[#64748B]">선택한 날짜</p>
                <p className="font-medium text-[#1E293B]">
                  {selectedDate && formatDateKorean(selectedDate)}
                </p>
              </div>

              {/* 진료과 선택 */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  진료과 선택
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDepartment(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      !selectedDepartment
                        ? 'bg-[#0066CC] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    전체
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDepartment(dept)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedDepartment === dept
                          ? 'bg-[#0066CC] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* 의사 선택 */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  담당 의사 선택 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {filteredDoctors.length === 0 ? (
                    <p className="text-center py-4 text-[#64748B]">등록된 의사가 없습니다.</p>
                  ) : (
                    filteredDoctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        onClick={() => setSelectedDoctor(doctor)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          selectedDoctor?.id === doctor.id
                            ? 'border-[#0066CC] bg-[#E8F4FD]'
                            : 'border-gray-200 hover:border-[#0066CC] hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-semibold text-[#1E293B]">{doctor.name} 선생님</p>
                        <p className="text-sm text-[#64748B]">{doctor.department}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 시간 선택 */}
          {currentStep === 3 && (
            <div>
              {/* 선택 정보 표시 */}
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">날짜</span>
                  <span className="text-[#1E293B] font-medium">
                    {selectedDate && formatDateKorean(selectedDate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#64748B]">담당의</span>
                  <span className="text-[#1E293B] font-medium">
                    {selectedDoctor?.name} 선생님
                  </span>
                </div>
              </div>

              {slotsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-2 text-sm text-[#64748B]">시간을 불러오는 중...</p>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#64748B]">해당 날짜에 예약 가능한 시간이 없습니다.</p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="mt-4 text-sm text-[#0066CC] hover:underline"
                  >
                    다른 날짜 선택하기
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#64748B] mb-3">원하시는 시간을 선택해주세요.</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`
                          py-3 px-2 rounded-lg text-sm font-medium transition-all
                          ${selectedTime === slot.time
                            ? 'bg-[#0066CC] text-white'
                            : slot.available
                            ? 'border border-[#0066CC] text-[#0066CC] hover:bg-[#E8F4FD]'
                            : 'border border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                          }
                        `}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: 본인 정보 입력 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* 예약 정보 요약 */}
              <div className="p-4 bg-[#E8F4FD] rounded-lg">
                <p className="text-sm font-medium text-[#0066CC] mb-2">예약 정보</p>
                <div className="text-sm text-[#1E293B] space-y-1">
                  <p>• 날짜: {selectedDate && formatDateKorean(selectedDate)}</p>
                  <p>• 담당의: {selectedDoctor?.name} 선생님 ({selectedDoctor?.department})</p>
                  <p>• 시간: {selectedTime}</p>
                </div>
              </div>

              {isLoggedIn && patientInfo.kakaoId && (
                <div className="p-3 bg-[#FEE500]/20 rounded-lg flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  <span className="text-sm text-[#1E293B]">카카오 로그인 정보가 자동으로 입력되었습니다.</span>
                </div>
              )}

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
            </div>
          )}

          {/* Step 5: 예약 완료 */}
          {currentStep === 5 && appointmentResult && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-[#28A745] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1E293B] mb-2">
                예약이 완료되었습니다!
              </h2>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-[#64748B] mb-3">예약 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">환자명</span>
                    <span className="text-[#1E293B] font-medium">{patientInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">진료과</span>
                    <span className="text-[#1E293B] font-medium">{appointmentResult.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">담당의</span>
                    <span className="text-[#1E293B] font-medium">{appointmentResult.doctorName} 선생님</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">예약일시</span>
                    <span className="text-[#1E293B] font-medium">
                      {formatDateKorean(appointmentResult.date)} {appointmentResult.time}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-[#64748B]">
                예약 내역은 [예약 조회] 메뉴에서 확인하실 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="mt-6 flex gap-3">
          {currentStep > 1 && currentStep < 5 && (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as ReservationStep)}
              className="btn-secondary flex-1"
            >
              이전
            </button>
          )}
          
          {currentStep < 4 && (
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) as ReservationStep)}
              className="btn-primary flex-1"
              disabled={!canProceed()}
            >
              다음
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  예약 중...
                </span>
              ) : '예약하기'}
            </button>
          )}

          {currentStep === 5 && (
            <div className="flex gap-3 w-full">
              <Link href="/reserve/lookup" className="btn-secondary flex-1 text-center">
                예약 조회
              </Link>
              <Link href="/" className="btn-primary flex-1 text-center">
                홈으로
              </Link>
            </div>
          )}
        </div>

        {/* 예약 조회 링크 (첫 페이지에서만) */}
        {currentStep === 1 && (
          <div className="mt-6 text-center">
            <Link
              href="/reserve/lookup"
              className="text-sm text-[#0066CC] hover:underline"
            >
              기존 예약 조회/취소하기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
