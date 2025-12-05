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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
        <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-20">
      {/* 헤더 */}
      <header className="header-gradient px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold text-[#2D3436]">진료 예약</h1>
        <p className="text-sm text-[#636E72] mt-1">{stepTitles[currentStep]}</p>
      </header>

      <main className="px-5 -mt-2">
        {/* 진행 표시 */}
        <div className="card mb-4 animate-fade-in">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step, idx) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step === currentStep
                      ? 'bg-[#5B9A8B] text-white'
                      : step < currentStep
                      ? 'bg-[#5B9A8B] text-white'
                      : 'bg-[#DFE6E9] text-[#B2BEC3]'
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
                {idx < 4 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step < currentStep ? 'bg-[#5B9A8B]' : 'bg-[#DFE6E9]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
            <p className="text-sm text-[#E57373]">{error}</p>
          </div>
        )}

        {/* 스텝별 콘텐츠 */}
        <div className="card animate-slide-up">
          {/* Step 1: 날짜 선택 */}
          {currentStep === 1 && (
            <div>
              <p className="text-sm text-[#636E72] mb-4">
                예약을 원하시는 날짜를 선택해주세요.
              </p>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                minDate={dateRange.minDate}
                maxDate={dateRange.maxDate}
              />
              {selectedDate && (
                <div className="mt-4 p-3 bg-[#E8F5F2] rounded-xl text-center">
                  <p className="text-[#5B9A8B] font-medium">
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
              <div className="p-3 bg-[#F5F9F8] rounded-xl">
                <p className="text-sm text-[#636E72]">선택한 날짜</p>
                <p className="font-medium text-[#2D3436]">
                  {selectedDate && formatDateKorean(selectedDate)}
                </p>
              </div>

              {/* 진료과 선택 */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-2">
                  진료과 선택
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDepartment(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      !selectedDepartment
                        ? 'bg-[#5B9A8B] text-white'
                        : 'bg-white border border-[#DFE6E9] text-[#636E72]'
                    }`}
                  >
                    전체
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDepartment(dept)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedDepartment === dept
                          ? 'bg-[#5B9A8B] text-white'
                          : 'bg-white border border-[#DFE6E9] text-[#636E72]'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* 의사 선택 */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-2">
                  담당 의사 선택 <span className="text-[#E57373]">*</span>
                </label>
                <div className="space-y-2">
                  {filteredDoctors.length === 0 ? (
                    <p className="text-center py-4 text-[#B2BEC3]">등록된 의사가 없습니다.</p>
                  ) : (
                    filteredDoctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        onClick={() => setSelectedDoctor(doctor)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedDoctor?.id === doctor.id
                            ? 'border-[#5B9A8B] bg-[#E8F5F2]'
                            : 'border-[#DFE6E9] hover:border-[#5B9A8B]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#5B9A8B] rounded-full flex items-center justify-center text-white font-bold">
                            {doctor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#2D3436]">{doctor.name} 선생님</p>
                            <p className="text-sm text-[#636E72]">{doctor.department}</p>
                          </div>
                        </div>
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
              <div className="p-3 bg-[#F5F9F8] rounded-xl mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#636E72]">날짜</span>
                  <span className="text-[#2D3436] font-medium">
                    {selectedDate && formatDateKorean(selectedDate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#636E72]">담당의</span>
                  <span className="text-[#2D3436] font-medium">
                    {selectedDoctor?.name} 선생님
                  </span>
                </div>
              </div>

              {slotsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-2 text-sm text-[#636E72]">시간을 불러오는 중...</p>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#B2BEC3]">해당 날짜에 예약 가능한 시간이 없습니다.</p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="mt-4 text-sm text-[#5B9A8B] hover:underline"
                  >
                    다른 날짜 선택하기
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#636E72] mb-3">원하시는 시간을 선택해주세요.</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`
                          py-3 px-2 rounded-xl text-sm font-medium transition-all
                          ${selectedTime === slot.time
                            ? 'bg-[#5B9A8B] text-white'
                            : slot.available
                            ? 'border border-[#5B9A8B] text-[#5B9A8B] hover:bg-[#E8F5F2]'
                            : 'border border-[#DFE6E9] text-[#B2BEC3] cursor-not-allowed bg-[#F5F9F8]'
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
              <div className="p-4 bg-[#E8F5F2] rounded-xl">
                <p className="text-sm font-medium text-[#5B9A8B] mb-2">예약 정보</p>
                <div className="text-sm text-[#2D3436] space-y-1">
                  <p>• 날짜: {selectedDate && formatDateKorean(selectedDate)}</p>
                  <p>• 담당의: {selectedDoctor?.name} 선생님 ({selectedDoctor?.department})</p>
                  <p>• 시간: {selectedTime}</p>
                </div>
              </div>

              {isLoggedIn && patientInfo.kakaoId && (
                <div className="p-3 bg-[#FEE500]/20 rounded-xl flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  <span className="text-sm text-[#2D3436]">카카오 로그인 정보가 자동으로 입력되었습니다.</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-2">
                  이름 <span className="text-[#E57373]">*</span>
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
                <label className="block text-sm font-medium text-[#2D3436] mb-2">
                  생년월일 <span className="text-[#E57373]">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="19900101"
                  maxLength={8}
                  value={patientInfo.birthDate}
                  onChange={(e) => setPatientInfo({ ...patientInfo, birthDate: e.target.value.replace(/\D/g, '') })}
                />
                <p className="text-xs text-[#B2BEC3] mt-1">숫자 8자리 (예: 19900101)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-2">
                  휴대폰 번호 <span className="text-[#E57373]">*</span>
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="01012345678"
                  maxLength={11}
                  value={patientInfo.phone}
                  onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '') })}
                />
                <p className="text-xs text-[#B2BEC3] mt-1">-없이 숫자만 입력</p>
              </div>
            </div>
          )}

          {/* Step 5: 예약 완료 */}
          {currentStep === 5 && appointmentResult && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-[#5B9A8B] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#2D3436] mb-2">
                예약이 완료되었습니다!
              </h2>
              
              <div className="mt-6 p-4 bg-[#F5F9F8] rounded-xl text-left">
                <h3 className="text-sm font-semibold text-[#636E72] mb-3">예약 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#636E72]">환자명</span>
                    <span className="text-[#2D3436] font-medium">{patientInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#636E72]">진료과</span>
                    <span className="text-[#2D3436] font-medium">{appointmentResult.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#636E72]">담당의</span>
                    <span className="text-[#2D3436] font-medium">{appointmentResult.doctorName} 선생님</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#636E72]">예약일시</span>
                    <span className="text-[#2D3436] font-medium">
                      {formatDateKorean(appointmentResult.date)} {appointmentResult.time}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-[#636E72]">
                예약 내역은 마이페이지에서 확인하실 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="mt-6 flex gap-3">
          {currentStep > 1 && currentStep < 5 && (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as ReservationStep)}
              className="btn-outline flex-1"
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
              ) : '예약 완료'}
            </button>
          )}

          {currentStep === 5 && (
            <div className="flex gap-3 w-full">
              <Link href="/mypage" className="btn-outline flex-1 text-center">
                마이페이지
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
              className="text-sm text-[#5B9A8B] hover:underline"
            >
              기존 예약 조회/취소하기 →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
