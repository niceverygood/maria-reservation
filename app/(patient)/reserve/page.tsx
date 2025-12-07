'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatLocalDate, getTodayString } from '@/lib/dateUtils'

// 타입 정의
interface Doctor {
  id: string
  name: string
  department: string
  position?: string
  availableSlots?: number
  totalSlots?: number
}

interface TimeSlot {
  time: string
  available: boolean
}

interface PatientInfo {
  patientId?: string
  name: string
  birthDate: string
  phone: string
  kakaoId?: string
}

interface AppointmentResult {
  id: string
  doctorName: string
  department: string
  date: string
  time: string
}

interface DateSlotCount {
  [date: string]: number
}

type SelectMode = 'date-first' | 'doctor-first'
type Step = 'mode' | 'calendar' | 'doctor' | 'doctor-calendar' | 'time' | 'info' | 'complete'

// =============== 전역 캐시 ===============
const globalCache = {
  doctors: null as Doctor[] | null,
  doctorsTimestamp: 0,
  dateSlots: new Map<string, { data: DateSlotCount; timestamp: number }>(),
  doctorSlots: new Map<string, { data: DateSlotCount; timestamp: number }>(),
  doctorsByDate: new Map<string, { data: Doctor[]; timestamp: number }>(),
}
const CACHE_TTL = 60000 // 1분

function ReserveLoading() {
  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-24">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-[#E8F5F2]">
        <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
      </header>
      <main className="px-5 py-4">
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function ReserveContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rescheduleId = searchParams.get('reschedule')
  
  const [selectMode, setSelectMode] = useState<SelectMode | null>(null)
  const [step, setStep] = useState<Step>('mode')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false) // 로딩 표시 안 함
  const [rescheduleAppointment, setRescheduleAppointment] = useState<{
    id: string; date: string; time: string; doctorName: string
  } | null>(null)

  // 선택 상태
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // 의사 먼저 선택 모드: 날짜별 슬롯 수
  const [doctorDateSlots, setDoctorDateSlots] = useState<DateSlotCount>({})
  const [doctorSlotsLoading, setDoctorSlotsLoading] = useState(false)


  // 캘린더 상태
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayStr = getTodayString()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  // 환자 정보
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '', birthDate: '', phone: ''
  })

  // 예약 결과
  const [appointmentResult, setAppointmentResult] = useState<AppointmentResult | null>(null)

  // Ref
  const isMounted = useRef(true)

  // 예약 가능 날짜 범위 (오늘 ~ 4주 후)
  const dateRange = useMemo(() => {
    const minDate = new Date(today)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 28)
    return { minDate, maxDate }
  }, [today])

  // 캘린더 데이터 (일요일 시작)
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startPadding = firstDay.getDay() // 일요일 = 0

    for (let i = 0; i < startPadding; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }
    return days
  }, [currentYear, currentMonth])

  // ============ 데이터 로드 함수들 (캐싱 적용) ============

  // 전체 의사 목록 로드
  const loadAllDoctors = useCallback(async () => {
    if (globalCache.doctors && Date.now() - globalCache.doctorsTimestamp < CACHE_TTL) {
      setAllDoctors(globalCache.doctors)
      return globalCache.doctors
    }
    try {
      const res = await fetch('/api/patient/doctors')
      const data = await res.json()
      if (data.success && isMounted.current) {
        globalCache.doctors = data.doctors
        globalCache.doctorsTimestamp = Date.now()
        setAllDoctors(data.doctors)
        return data.doctors
      }
    } catch { /* ignore */ }
    return []
  }, [])


  // 특정 날짜의 의사 목록 로드
  const loadDoctorsByDate = useCallback(async (date: string) => {
    const cached = globalCache.doctorsByDate.get(date)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setDoctors(cached.data)
      return cached.data
    }

    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/patient/doctors?date=${date}&withSlots=true`)
      const data = await res.json()
      if (data.success && isMounted.current) {
        globalCache.doctorsByDate.set(date, { data: data.doctors, timestamp: Date.now() })
        setDoctors(data.doctors)
        return data.doctors
      }
    } catch { /* ignore */ } finally {
      if (isMounted.current) setSlotsLoading(false)
    }
    return []
  }, [])

  // 의사별 날짜 슬롯 로드
  const loadDoctorSlots = useCallback(async (doctorId: string) => {
    const cached = globalCache.doctorSlots.get(doctorId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setDoctorDateSlots(cached.data)
      return cached.data
    }

    setDoctorSlotsLoading(true)
    try {
      const res = await fetch(`/api/patient/doctors/${doctorId}/slots-by-date`)
      const data = await res.json()
      if (data.success && isMounted.current) {
        globalCache.doctorSlots.set(doctorId, { data: data.slotsByDate, timestamp: Date.now() })
        setDoctorDateSlots(data.slotsByDate)
        return data.slotsByDate
      }
    } catch { /* ignore */ } finally {
      if (isMounted.current) setDoctorSlotsLoading(false)
    }
    return {}
  }, [])

  // 시간 슬롯 로드
  const loadTimeSlots = useCallback(async (doctorId: string, date: string) => {
    setSlotsLoading(true)
    setSelectedTime(null)
    try {
      const res = await fetch('/api/patient/appointments/available-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, date }),
      })
      const data = await res.json()
      if (data.success && isMounted.current) {
        setTimeSlots(data.slots)
        return data.slots
      }
    } catch { /* ignore */ } finally {
      if (isMounted.current) setSlotsLoading(false)
    }
    setTimeSlots([])
    return []
  }, [])

  // ============ 초기화 및 인증 ============

  useEffect(() => {
    isMounted.current = true
    
    // 초기 데이터 병렬 로드
    const init = async () => {
      const [, authRes] = await Promise.all([
        loadAllDoctors(),
        fetch('/api/auth/me'),
      ])
      
      if (!isMounted.current) return

      try {
        const authData = await authRes.json()
        if (authData.success && authData.patient) {
          setIsLoggedIn(true)
          setPatientInfo({
            patientId: authData.patient.patientId,
            name: authData.patient.name || '',
            birthDate: authData.patient.birthDate || '',
            phone: authData.patient.phone || '',
            kakaoId: authData.patient.kakaoId
          })
        }
      } catch { /* ignore */ }
      
      // 인증 체크 완료 (이미 화면은 표시됨)
    }
    
    init()
    return () => { isMounted.current = false }
  }, [loadAllDoctors])

  // 예약 변경 시 기존 예약 정보 로드
  useEffect(() => {
    if (!rescheduleId) return
    const load = async () => {
      try {
        const res = await fetch('/api/patient/appointments/my')
        const data = await res.json()
        if (data.success && data.appointments) {
          const apt = data.appointments.find((a: { id: string }) => a.id === rescheduleId)
          if (apt) {
            setRescheduleAppointment({
              id: apt.id, date: apt.date, time: apt.time,
              doctorName: apt.doctor?.name || ''
            })
          }
        }
      } catch { /* ignore */ }
    }
    load()
  }, [rescheduleId])


  // 날짜 선택 시 의사 목록 로드
  useEffect(() => {
    if (selectMode === 'date-first' && selectedDate) {
      loadDoctorsByDate(selectedDate)
    }
  }, [selectMode, selectedDate, loadDoctorsByDate])

  // 의사 선택 시 날짜별 슬롯 로드
  useEffect(() => {
    if (selectMode === 'doctor-first' && selectedDoctor) {
      loadDoctorSlots(selectedDoctor.id)
    }
  }, [selectMode, selectedDoctor, loadDoctorSlots])

  // 의사 + 날짜 선택 시 시간 슬롯 로드
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadTimeSlots(selectedDoctor.id, selectedDate)
    }
  }, [selectedDoctor, selectedDate, loadTimeSlots])

  // ============ 핸들러들 ============

  const handleModeSelect = useCallback((mode: SelectMode) => {
    if (!isLoggedIn) {
      router.push('/login?redirect=/reserve')
      return
    }
    
    setSelectMode(mode)
    setSelectedDate(null)
    setSelectedDoctor(null)
    setSelectedTime(null)
    setStep(mode === 'date-first' ? 'calendar' : 'doctor')
  }, [isLoggedIn, router])

  const handleDateSelectDateFirst = useCallback((date: string) => {
    setSelectedDate(date)
    setSelectedDoctor(null)
    setSelectedTime(null)
    setStep('doctor')
    // 의사 목록 미리 로드됨 (useEffect)
  }, [])

  const handleDoctorSelectDateFirst = useCallback((doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setSelectedTime(null)
    setStep('time')
  }, [])

  const handleDoctorSelectDoctorFirst = useCallback((doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep('doctor-calendar')
    // 의사 슬롯 미리 로드됨 (useEffect)
  }, [])

  const handleDateSelectDoctorFirst = useCallback((date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
    setStep('time')
  }, [])

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time)
    setStep('info')
  }, [])

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return

    // 즉시 로딩 상태로 변경
    setIsLoading(true)
    setError('')

    // 낙관적 업데이트: 즉시 결과 설정하고 마이페이지로 이동
    const optimisticResult = {
      id: 'pending',
      doctorName: selectedDoctor.name,
      department: selectedDoctor.department,
      date: selectedDate,
      time: selectedTime,
    }
    setAppointmentResult(optimisticResult)

    // 로그인된 사용자는 즉시 마이페이지로 이동
    if (isLoggedIn) {
      router.push('/mypage?reserved=true')
    }

    // 백그라운드에서 API 호출
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
          rescheduleId: rescheduleId || undefined,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        // 실패 시 에러 표시 (이미 마이페이지로 갔다면 거기서 처리)
        console.error('예약 실패:', data.error)
        if (!isLoggedIn) {
          setError(data.error || '예약 생성에 실패했습니다.')
          setAppointmentResult(null)
          setIsLoading(false)
        }
      } else {
        // 성공 시 완료 화면 (비로그인 사용자)
        if (!isLoggedIn) {
          setAppointmentResult(data.appointment)
          setStep('complete')
          setIsLoading(false)
        }
      }
    } catch {
      if (!isLoggedIn) {
        setError('예약 중 오류가 발생했습니다.')
        setAppointmentResult(null)
        setIsLoading(false)
      }
    }
  }

  const handleBack = useCallback(() => {
    if (step === 'calendar' || (step === 'doctor' && selectMode === 'doctor-first')) {
      setStep('mode')
      setSelectMode(null)
    } else if (step === 'doctor' && selectMode === 'date-first') {
      setStep('calendar')
      setSelectedDoctor(null)
    } else if (step === 'doctor-calendar') {
      setStep('doctor')
      setSelectedDate(null)
    } else if (step === 'time') {
      setStep(selectMode === 'date-first' ? 'doctor' : 'doctor-calendar')
      setSelectedTime(null)
    } else if (step === 'info') {
      setStep('time')
    }
  }, [step, selectMode])

  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  const isDateInRange = useCallback((date: Date) => {
    return date >= dateRange.minDate && date <= dateRange.maxDate
  }, [dateRange])

  const canSubmit = patientInfo.name.length >= 2 && 
                   patientInfo.birthDate.length === 8 && 
                   patientInfo.phone.length >= 10

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  // 화면 즉시 표시 (인증 체크는 백그라운드)

  return (
    <div className="min-h-screen bg-[#F5F9F8] pb-24">
      {/* 헤더 */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-[#E8F5F2]">
        <div className="flex items-center gap-3">
          {step !== 'mode' && step !== 'complete' && (
            <button onClick={handleBack} className="p-2 -ml-2 text-[#5B9A8B]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-[#2D3436]">
              {step === 'mode' && '예약하기'}
              {step === 'calendar' && '날짜 선택'}
              {step === 'doctor' && '의사 선택'}
              {step === 'doctor-calendar' && '날짜 선택'}
              {step === 'time' && '시간 선택'}
              {step === 'info' && '예약자 정보'}
              {step === 'complete' && '예약 완료'}
            </h1>
            {selectedDoctor && step !== 'mode' && step !== 'doctor' && step !== 'complete' && (
              <p className="text-sm text-[#5B9A8B] mt-0.5">
                {selectedDoctor.name} {selectedDoctor.position && `(${selectedDoctor.position})`}
                {selectedDate && ` · ${formatDateKorean(selectedDate)}`}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-[#E57373]">{error}</p>
          </div>
        )}

        {/* 모드 선택 */}
        {step === 'mode' && (
          <div className="space-y-4">
            {rescheduleAppointment && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4">
                <p className="text-sm font-medium text-orange-800 mb-1">📋 예약 변경 모드</p>
                <p className="text-xs text-orange-600">
                  기존 예약: {rescheduleAppointment.date} {rescheduleAppointment.time} - {rescheduleAppointment.doctorName}
                </p>
              </div>
            )}
            
            <p className="text-sm text-[#636E72] mb-4">
              {rescheduleAppointment ? '새로운 예약 방식을 선택해주세요' : '예약 방식을 선택해주세요'}
            </p>

            {[
              { mode: 'date-first' as const, icon: '📅', title: '날짜 먼저 선택', desc: '원하는 날짜를 먼저 선택하고, 해당 날짜에 진료 가능한 의사를 선택합니다.' },
              { mode: 'doctor-first' as const, icon: '👨‍⚕️', title: '의사 먼저 선택', desc: '원하는 의사를 먼저 선택하고, 해당 의사의 예약 가능한 날짜와 시간을 확인합니다.' },
            ].map(({ mode, icon, title, desc }) => (
              <button
                key={mode}
                onClick={() => handleModeSelect(mode)}
                className="w-full card p-5 text-left hover:border-[#5B9A8B] hover:border transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-2xl flex items-center justify-center text-white text-2xl shadow-md">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-[#2D3436] text-lg">{title}</span>
                    <p className="text-sm text-[#636E72] mt-0.5">{desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 캘린더 (날짜 먼저 모드) */}
        {step === 'calendar' && selectMode === 'date-first' && (
          <div className="card relative">
            <p className="text-sm text-[#636E72] mb-4">예약을 원하시는 날짜를 선택해주세요.</p>
            
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="text-lg font-bold text-[#2D3436]">{currentYear}년 {monthNames[currentMonth]}</h3>
              <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {dayNames.map((day, idx) => (
                <div key={day} className={`text-center text-sm font-medium py-2 ${idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-600'}`}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="h-12" />
                const dateStr = formatLocalDate(date)
                const isInRange = isDateInRange(date)
                const isSunday = date.getDay() === 0
                const isAvailable = isInRange && !isSunday
                const isToday = dateStr === todayStr
                const isSaturday = date.getDay() === 6

                return (
                  <button
                    key={dateStr}
                    onClick={() => isAvailable && handleDateSelectDateFirst(dateStr)}
                    disabled={!isAvailable}
                    className="h-14 flex flex-col items-center justify-center transition-all active:scale-95"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isAvailable ? 'bg-[#E8F5F2] hover:bg-[#5B9A8B] hover:text-white' : ''}
                      ${isToday && isAvailable ? 'ring-2 ring-[#5B9A8B] ring-offset-1' : ''}
                    `}>
                      <span className={`text-sm font-medium ${
                        !isInRange ? 'text-gray-300' : 
                        isSunday ? 'text-gray-300' :
                        isSaturday ? 'text-blue-500' : 'text-[#2D8B6F]'
                      }`}>{date.getDate()}</span>
                    </div>
                  </button>
                )
              })}
            </div>

          </div>
        )}

        {/* 의사 선택 (날짜 먼저) */}
        {step === 'doctor' && selectMode === 'date-first' && (
          <div className="space-y-3">
            <p className="text-sm text-[#636E72]">{formatDateKorean(selectedDate!)} 진료 가능한 의사</p>
            
            {slotsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2"><div className="h-5 w-24 bg-gray-200 rounded" /><div className="h-4 w-32 bg-gray-200 rounded" /></div>
                  </div>
                </div>
              ))}</div>
            ) : doctors.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-[#B2BEC3]">해당 날짜에 진료 가능한 의사가 없습니다.</p>
                <button onClick={() => setStep('calendar')} className="mt-4 text-sm text-[#5B9A8B] hover:underline">다른 날짜 선택하기</button>
              </div>
            ) : (
              doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => doctor.availableSlots !== 0 && handleDoctorSelectDateFirst(doctor)}
                  disabled={doctor.availableSlots === 0}
                  className={`w-full card p-4 text-left transition-all active:scale-[0.98] ${doctor.availableSlots === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#5B9A8B] hover:border'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">{doctor.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2D3436] text-lg">{doctor.name}</span>
                        {doctor.position && <span className="text-xs px-2 py-0.5 bg-[#E8F5F2] text-[#5B9A8B] rounded-full">{doctor.position}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-[#636E72]">{doctor.department}</p>
                        {doctor.availableSlots !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doctor.availableSlots === 0 ? 'bg-gray-100 text-gray-400' : doctor.availableSlots <= 5 ? 'bg-orange-100 text-orange-600' : 'bg-[#E8F5F2] text-[#5B9A8B]'}`}>
                            {doctor.availableSlots === 0 ? '마감' : `${doctor.availableSlots}개 남음`}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 의사 선택 (의사 먼저) */}
        {step === 'doctor' && selectMode === 'doctor-first' && (
          <div className="space-y-3">
            <p className="text-sm text-[#636E72]">진료를 원하시는 의사를 선택해주세요</p>
            {allDoctors.length === 0 ? (
              <div className="space-y-3">{[1,2,3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2"><div className="h-5 w-24 bg-gray-200 rounded" /><div className="h-4 w-32 bg-gray-200 rounded" /></div>
                  </div>
                </div>
              ))}</div>
            ) : (
              allDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => handleDoctorSelectDoctorFirst(doctor)}
                  className="w-full card p-4 text-left hover:border-[#5B9A8B] hover:border transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">{doctor.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2D3436] text-lg">{doctor.name}</span>
                        {doctor.position && <span className="text-xs px-2 py-0.5 bg-[#E8F5F2] text-[#5B9A8B] rounded-full">{doctor.position}</span>}
                      </div>
                      <p className="text-sm text-[#636E72] mt-0.5">{doctor.department}</p>
                    </div>
                    <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 캘린더 (의사 먼저) */}
        {step === 'doctor-calendar' && selectMode === 'doctor-first' && selectedDoctor && (
          <div className="card relative">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8F5F2]">
              <div className="w-12 h-12 bg-[#5B9A8B] rounded-full flex items-center justify-center text-white font-bold">{selectedDoctor.name.charAt(0)}</div>
              <div>
                <p className="font-semibold text-[#2D3436]">{selectedDoctor.name} {selectedDoctor.position}</p>
                <p className="text-sm text-[#636E72]">{selectedDoctor.department}</p>
              </div>
            </div>

            <p className="text-sm text-[#636E72] mb-4">예약 가능한 날짜를 선택해주세요.</p>

            {doctorSlotsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-[#636E72]">예약 가능 날짜를 불러오는 중...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h3 className="text-lg font-bold text-[#2D3436]">{currentYear}년 {monthNames[currentMonth]}</h3>
                  <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((day, idx) => (
                    <div key={day} className={`text-center text-sm font-medium py-2 ${idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-600'}`}>{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="h-16" />
                    const dateStr = formatLocalDate(date)
                    const isInRange = isDateInRange(date)
                    const slotCount = doctorDateSlots[dateStr] || 0
                    const hasSlots = slotCount > 0
                    const isToday = dateStr === todayStr
                    const isSaturday = idx % 7 === 5
                    const isSunday = idx % 7 === 6
                    const isClickable = isInRange && hasSlots

                    return (
                      <button
                        key={dateStr}
                        onClick={() => isClickable && handleDateSelectDoctorFirst(dateStr)}
                        disabled={!isClickable}
                        className={`h-16 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95
                          ${!isClickable ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#E8F5F2]'}
                          ${isToday ? 'ring-2 ring-[#5B9A8B]' : ''}
                        `}
                      >
                        <span className={`text-sm font-medium ${isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-700'}`}>{date.getDate()}</span>
                        {isInRange && (
                          <span className={`text-[10px] mt-0.5 font-medium ${hasSlots ? (slotCount <= 5 ? 'text-orange-500' : 'text-[#5B9A8B]') : 'text-gray-300'}`}>
                            {hasSlots ? `${slotCount}개` : '-'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* 시간 선택 */}
        {step === 'time' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8F5F2]">
              <div className="w-10 h-10 bg-[#5B9A8B] rounded-full flex items-center justify-center text-white font-bold">{selectedDoctor?.name.charAt(0)}</div>
              <div>
                <p className="font-semibold text-[#2D3436]">{selectedDoctor?.name} {selectedDoctor?.position}</p>
                <p className="text-sm text-[#636E72]">{selectedDoctor?.department} · {formatDateKorean(selectedDate!)}</p>
              </div>
            </div>

            {slotsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-[#636E72]">시간을 불러오는 중...</p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#B2BEC3]">예약 가능한 시간이 없습니다.</p>
                <button onClick={handleBack} className="mt-4 text-sm text-[#5B9A8B] hover:underline">다른 날짜/의사 선택하기</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#636E72] mb-3">원하시는 시간을 선택해주세요.</p>
                {['오전', '오후'].map(period => {
                  const slots = timeSlots.filter(s => period === '오전' ? parseInt(s.time.split(':')[0]) < 12 : parseInt(s.time.split(':')[0]) >= 12)
                  if (slots.length === 0) return null
                  return (
                    <div key={period} className="mb-4">
                      <p className="text-xs font-medium text-[#5B9A8B] mb-2">{period}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && handleTimeSelect(slot.time)}
                            disabled={!slot.available}
                            className={`py-3 rounded-xl text-sm font-medium transition-all active:scale-95
                              ${slot.available ? 'border border-[#5B9A8B] text-[#5B9A8B] hover:bg-[#5B9A8B] hover:text-white' : 'border border-[#DFE6E9] text-[#B2BEC3] cursor-not-allowed bg-[#F5F9F8]'}
                            `}
                          >{slot.time}</button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* 예약자 정보 */}
        {step === 'info' && (
          <div className="space-y-4">
            <div className="card bg-[#E8F5F2]">
              <p className="text-sm font-medium text-[#5B9A8B] mb-2">예약 정보</p>
              <div className="text-sm text-[#2D3436] space-y-1">
                <p>📅 {formatDateKorean(selectedDate!)} {selectedTime}</p>
                <p>👨‍⚕️ {selectedDoctor?.name} {selectedDoctor?.position} ({selectedDoctor?.department})</p>
              </div>
            </div>

            <div className="card space-y-4">
              {isLoggedIn && patientInfo.kakaoId && (
                <div className="p-3 bg-[#FEE500]/20 rounded-xl flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919"><path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>
                  <span className="text-sm text-[#2D3436]">카카오 정보가 자동 입력되었습니다.</span>
                </div>
              )}

              {[
                { label: '이름', placeholder: '홍길동', key: 'name' as const, maxLength: 20 },
                { label: '생년월일', placeholder: '19900101', key: 'birthDate' as const, maxLength: 8, hint: '숫자 8자리 (예: 19900101)' },
                { label: '휴대폰 번호', placeholder: '01012345678', key: 'phone' as const, maxLength: 11, hint: '-없이 숫자만 입력' },
              ].map(({ label, placeholder, key, maxLength, hint }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#2D3436] mb-2">{label} <span className="text-[#E57373]">*</span></label>
                  <input
                    type={key === 'phone' ? 'tel' : 'text'}
                    className="input-field"
                    placeholder={placeholder}
                    maxLength={maxLength}
                    value={patientInfo[key]}
                    onChange={(e) => setPatientInfo({ ...patientInfo, [key]: key === 'name' ? e.target.value : e.target.value.replace(/\D/g, '') })}
                  />
                  {hint && <p className="text-xs text-[#B2BEC3] mt-1">{hint}</p>}
                </div>
              ))}

              <button onClick={handleSubmit} className="btn-primary w-full mt-4" disabled={!canSubmit || isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    예약 중...
                  </span>
                ) : '예약 신청하기'}
              </button>
            </div>
          </div>
        )}

        {/* 예약 완료 */}
        {step === 'complete' && appointmentResult && (
          <div className="card text-center py-6">
            <div className="w-20 h-20 mx-auto bg-[#5B9A8B] rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[#2D3436] mb-2">예약이 완료되었습니다!</h2>
            <p className="text-sm text-[#636E72]">예약 내역은 마이페이지에서 확인하세요.</p>
            
            <div className="mt-6 p-4 bg-[#F5F9F8] rounded-xl text-left">
              <div className="space-y-3 text-sm">
                {[
                  { label: '환자명', value: patientInfo.name },
                  { label: '예약일시', value: `${formatDateKorean(appointmentResult.date)} ${appointmentResult.time}` },
                  { label: '담당의', value: appointmentResult.doctorName },
                  { label: '진료과', value: appointmentResult.department },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#636E72]">{label}</span>
                    <span className="text-[#2D3436] font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/mypage" className="btn-outline flex-1 text-center">마이페이지</Link>
              <button 
                onClick={() => { setStep('mode'); setSelectMode(null); setSelectedDate(null); setSelectedDoctor(null); setSelectedTime(null); setAppointmentResult(null) }}
                className="btn-primary flex-1"
              >새 예약하기</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function ReservePage() {
  return (
    <Suspense fallback={<ReserveLoading />}>
      <ReserveContent />
    </Suspense>
  )
}
