'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
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

function ReserveLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
      <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [rescheduleAppointment, setRescheduleAppointment] = useState<{
    id: string
    date: string
    time: string
    doctorName: string
  } | null>(null)

  // 선택 상태
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // 의사 먼저 선택 모드: 날짜별 슬롯 수
  const [doctorDateSlots, setDoctorDateSlots] = useState<DateSlotCount>({})
  const [doctorSlotsLoading, setDoctorSlotsLoading] = useState(false)

  // 날짜 먼저 선택 모드: 날짜별 예약 가능 여부
  const [dateAvailability, setDateAvailability] = useState<DateSlotCount>({})
  const [dateAvailabilityLoading, setDateAvailabilityLoading] = useState(false)

  // 캘린더 상태
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = getTodayString()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  // 환자 정보
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    birthDate: '',
    phone: ''
  })

  // 예약 결과
  const [appointmentResult, setAppointmentResult] = useState<AppointmentResult | null>(null)

  // 예약 가능 날짜 범위 (오늘 ~ 4주 후)
  const dateRange = useMemo(() => {
    const minDate = new Date(today)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 28)
    return { minDate, maxDate }
  }, [])

  // 캘린더 데이터
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startPadding = (firstDay.getDay() + 6) % 7 // 월요일 시작

    for (let i = 0; i < startPadding; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }
    return days
  }, [currentYear, currentMonth])

  // 로그인 상태 확인 및 변경할 예약 정보 로드
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
        // 비회원
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  // 예약 변경 시 기존 예약 정보 로드
  useEffect(() => {
    console.log('[예약변경] rescheduleId:', rescheduleId)
    if (!rescheduleId) return

    const loadRescheduleInfo = async () => {
      try {
        const res = await fetch('/api/patient/appointments/my')
        const data = await res.json()
        console.log('[예약변경] 내 예약 목록:', data)
        if (data.success && data.appointments) {
          const apt = data.appointments.find((a: { id: string }) => a.id === rescheduleId)
          console.log('[예약변경] 찾은 예약:', apt)
          if (apt) {
            setRescheduleAppointment({
              id: apt.id,
              date: apt.date,
              time: apt.time,
              doctorName: apt.doctor?.name || ''
            })
          }
        }
      } catch (err) {
        console.error('예약 정보 로드 실패:', err)
      }
    }
    loadRescheduleInfo()
  }, [rescheduleId])

  // 전체 의사 목록 로드 (의사 먼저 선택 모드용)
  useEffect(() => {
    const fetchAllDoctors = async () => {
      try {
        const res = await fetch('/api/patient/doctors')
        const data = await res.json()
        if (data.success) {
          setAllDoctors(data.doctors)
        }
      } catch (err) {
        console.error('의사 목록 로드 실패:', err)
      }
    }
    fetchAllDoctors()
  }, [])

  // 날짜별 예약 가능 여부 로드 (캘린더 표시용)
  useEffect(() => {
    if (selectMode !== 'date-first' || step !== 'calendar') return

    const fetchDateAvailability = async () => {
      setDateAvailabilityLoading(true)
      try {
        // 현재 월의 시작일과 종료일
        const startDate = formatLocalDate(new Date(currentYear, currentMonth, 1))
        const endDate = formatLocalDate(new Date(currentYear, currentMonth + 1, 0))
        
        const res = await fetch(`/api/patient/slots/count-by-date?startDate=${startDate}&endDate=${endDate}`)
        const data = await res.json()
        if (data.success) {
          setDateAvailability(data.counts)
        }
      } catch (err) {
        console.error('날짜별 슬롯 정보 로드 실패:', err)
      } finally {
        setDateAvailabilityLoading(false)
      }
    }
    fetchDateAvailability()
  }, [selectMode, step, currentYear, currentMonth])

  // 날짜 선택 시 해당 날짜에 예약 가능한 의사 목록 로드 (날짜 먼저 선택 모드)
  useEffect(() => {
    if (selectMode !== 'date-first' || !selectedDate) {
      setDoctors([])
      return
    }

    const fetchDoctors = async () => {
      setSlotsLoading(true)
      try {
        const res = await fetch(`/api/patient/doctors?date=${selectedDate}&withSlots=true`)
        const data = await res.json()
        if (data.success) {
          setDoctors(data.doctors)
        }
      } catch (err) {
        console.error('의사 목록 로드 실패:', err)
      } finally {
        setSlotsLoading(false)
      }
    }
    fetchDoctors()
  }, [selectedDate, selectMode])

  // 의사 선택 시 해당 의사의 날짜별 슬롯 수 로드 (의사 먼저 선택 모드)
  useEffect(() => {
    if (selectMode !== 'doctor-first' || !selectedDoctor) {
      setDoctorDateSlots({})
      return
    }

    const fetchDoctorSlots = async () => {
      setDoctorSlotsLoading(true)
      try {
        const res = await fetch(`/api/patient/doctors/${selectedDoctor.id}/slots-by-date`)
        const data = await res.json()
        if (data.success) {
          setDoctorDateSlots(data.slotsByDate)
        }
      } catch (err) {
        console.error('날짜별 슬롯 로드 실패:', err)
      } finally {
        setDoctorSlotsLoading(false)
      }
    }
    fetchDoctorSlots()
  }, [selectedDoctor, selectMode])

  // 의사 + 날짜 선택 시 시간 슬롯 로드
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

  // 모드 선택 핸들러
  const handleModeSelect = (mode: SelectMode) => {
    // 로그인하지 않은 상태면 로그인 페이지로 이동
    if (!isLoggedIn) {
      router.push('/login?redirect=/reserve')
      return
    }
    
    setSelectMode(mode)
    setSelectedDate(null)
    setSelectedDoctor(null)
    setSelectedTime(null)
    if (mode === 'date-first') {
      setStep('calendar')
    } else {
      setStep('doctor')
    }
  }

  // 날짜 선택 핸들러 (날짜 먼저)
  const handleDateSelectDateFirst = (date: string) => {
    setSelectedDate(date)
    setSelectedDoctor(null)
    setSelectedTime(null)
    setStep('doctor')
  }

  // 의사 선택 핸들러 (날짜 먼저)
  const handleDoctorSelectDateFirst = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setSelectedTime(null)
    setStep('time')
  }

  // 의사 선택 핸들러 (의사 먼저)
  const handleDoctorSelectDoctorFirst = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep('doctor-calendar')
  }

  // 날짜 선택 핸들러 (의사 먼저)
  const handleDateSelectDoctorFirst = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
    setStep('time')
  }

  // 시간 선택 핸들러
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('info')
  }

  // 예약 생성
  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return

    setIsLoading(true)
    setError('')

    try {
      const requestBody = {
        name: patientInfo.name,
        birthDate: patientInfo.birthDate,
        phone: patientInfo.phone,
        doctorId: selectedDoctor.id,
        date: selectedDate,
        time: selectedTime,
        rescheduleId: rescheduleId || undefined, // 예약 변경 시 기존 예약 ID
      }
      console.log('[예약요청] 전송 데이터:', requestBody)
      
      const res = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = await res.json()

      if (data.success) {
        setAppointmentResult(data.appointment)
        // 로그인된 사용자는 마이페이지로 바로 이동
        if (isLoggedIn) {
          router.push('/mypage?reserved=true')
        } else {
          setStep('complete')
        }
      } else {
        setError(data.error || '예약 생성에 실패했습니다.')
      }
    } catch {
      setError('예약 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (step === 'calendar' || step === 'doctor' && selectMode === 'doctor-first') {
      setStep('mode')
      setSelectMode(null)
    } else if (step === 'doctor' && selectMode === 'date-first') {
      setStep('calendar')
      setSelectedDoctor(null)
    } else if (step === 'doctor-calendar') {
      setStep('doctor')
      setSelectedDate(null)
    } else if (step === 'time') {
      if (selectMode === 'date-first') {
        setStep('doctor')
      } else {
        setStep('doctor-calendar')
      }
      setSelectedTime(null)
    } else if (step === 'info') {
      setStep('time')
    }
  }

  // 날짜 포맷
  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`
  }

  // 날짜가 범위 내인지 체크
  const isDateInRange = (date: Date) => {
    return date >= dateRange.minDate && date <= dateRange.maxDate
  }

  // 정보 입력 가능 여부
  const canSubmit = patientInfo.name.length >= 2 && 
                   patientInfo.birthDate.length === 8 && 
                   patientInfo.phone.length >= 10

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['월', '화', '수', '목', '금', '토', '일']

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9F8]">
        <div className="w-8 h-8 border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

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
              {step === 'doctor' && (selectMode === 'date-first' ? '의사 선택' : '의사 선택')}
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
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-[#E57373]">{error}</p>
          </div>
        )}

        {/* 모드 선택 */}
        {step === 'mode' && (
          <div className="space-y-4">
            {/* 예약 변경 안내 */}
            {rescheduleAppointment && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4">
                <p className="text-sm font-medium text-orange-800 mb-1">📋 예약 변경 모드</p>
                <p className="text-xs text-orange-600">
                  기존 예약: {rescheduleAppointment.date} {rescheduleAppointment.time} - {rescheduleAppointment.doctorName}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  새 일정을 선택하시면 기존 예약이 취소되고 새 예약이 생성됩니다.
                </p>
              </div>
            )}
            
            <p className="text-sm text-[#636E72] mb-4">
              {rescheduleAppointment ? '새로운 예약 방식을 선택해주세요' : '예약 방식을 선택해주세요'}
            </p>

            <button
              onClick={() => handleModeSelect('date-first')}
              className="w-full card p-5 text-left hover:border-[#5B9A8B] hover:border transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-2xl flex items-center justify-center text-white text-2xl shadow-md">
                  📅
                </div>
                <div className="flex-1">
                  <span className="font-bold text-[#2D3436] text-lg">날짜 먼저 선택</span>
                  <p className="text-sm text-[#636E72] mt-0.5">원하는 날짜를 먼저 선택하고, 해당 날짜에 진료 가능한 의사를 선택합니다.</p>
                </div>
                <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => handleModeSelect('doctor-first')}
              className="w-full card p-5 text-left hover:border-[#5B9A8B] hover:border transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-2xl flex items-center justify-center text-white text-2xl shadow-md">
                  👨‍⚕️
                </div>
                <div className="flex-1">
                  <span className="font-bold text-[#2D3436] text-lg">의사 먼저 선택</span>
                  <p className="text-sm text-[#636E72] mt-0.5">원하는 의사를 먼저 선택하고, 해당 의사의 예약 가능한 날짜와 시간을 확인합니다.</p>
                </div>
                <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* 날짜 선택 (날짜 먼저 모드) */}
        {step === 'calendar' && selectMode === 'date-first' && (
          <div className="card">
            <p className="text-sm text-[#636E72] mb-4">
              예약을 원하시는 날짜를 선택해주세요.
            </p>
            
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11)
                    setCurrentYear(currentYear - 1)
                  } else {
                    setCurrentMonth(currentMonth - 1)
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-bold text-[#2D3436]">
                {currentYear}년 {monthNames[currentMonth]}
              </h3>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0)
                    setCurrentYear(currentYear + 1)
                  } else {
                    setCurrentMonth(currentMonth + 1)
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map((day, idx) => (
                <div key={day} className={`text-center text-sm font-medium py-2 ${
                  idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-600'
                }`}>
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="h-12" />
                }

                const dateStr = formatLocalDate(date)
                const isInRange = isDateInRange(date)
                const slotCount = dateAvailability[dateStr] || 0
                const hasSlots = slotCount > 0
                const isAvailable = isInRange && hasSlots
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const isSaturday = date.getDay() === 6
                const isSunday = date.getDay() === 0

                return (
                  <button
                    key={dateStr}
                    onClick={() => isAvailable && handleDateSelectDateFirst(dateStr)}
                    disabled={!isAvailable}
                    className="h-14 flex flex-col items-center justify-center transition-all"
                  >
                    {/* 예약 가능한 날: 원형 배경 */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isSelected 
                        ? 'bg-[#2D8B6F] text-white' 
                        : isAvailable 
                          ? 'bg-[#E8F5F2] hover:bg-[#5B9A8B] hover:text-white' 
                          : ''
                      }
                      ${isToday && !isSelected && isAvailable ? 'ring-2 ring-[#5B9A8B] ring-offset-1' : ''}
                    `}>
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-white' :
                        !isInRange ? 'text-gray-300' :
                        !hasSlots ? 'text-gray-400' :
                        isSunday ? 'text-red-500' :
                        isSaturday ? 'text-blue-500' : 
                        'text-[#2D8B6F]'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 로딩 표시 */}
            {dateAvailabilityLoading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
                <div className="w-6 h-6 border-2 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}

        {/* 의사 선택 (날짜 먼저 모드) */}
        {step === 'doctor' && selectMode === 'date-first' && (
          <div className="space-y-3">
            <p className="text-sm text-[#636E72]">
              {formatDateKorean(selectedDate!)} 진료 가능한 의사
            </p>
            
            {slotsLoading ? (
              <div className="card text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-[#636E72]">의사 목록을 불러오는 중...</p>
              </div>
            ) : doctors.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-[#B2BEC3]">해당 날짜에 진료 가능한 의사가 없습니다.</p>
                <button
                  onClick={() => setStep('calendar')}
                  className="mt-4 text-sm text-[#5B9A8B] hover:underline"
                >
                  다른 날짜 선택하기
                </button>
              </div>
            ) : (
              doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => doctor.availableSlots !== 0 && handleDoctorSelectDateFirst(doctor)}
                  disabled={doctor.availableSlots === 0}
                  className={`w-full card p-4 text-left transition-all ${
                    doctor.availableSlots === 0 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:border-[#5B9A8B] hover:border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                      {doctor.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2D3436] text-lg">{doctor.name}</span>
                        {doctor.position && (
                          <span className="text-xs px-2 py-0.5 bg-[#E8F5F2] text-[#5B9A8B] rounded-full">
                            {doctor.position}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-[#636E72]">{doctor.department}</p>
                        {doctor.availableSlots !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            doctor.availableSlots === 0 
                              ? 'bg-gray-100 text-gray-400' 
                              : doctor.availableSlots <= 5 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'bg-[#E8F5F2] text-[#5B9A8B]'
                          }`}>
                            {doctor.availableSlots === 0 ? '마감' : `${doctor.availableSlots}개 남음`}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 의사 선택 (의사 먼저 모드) */}
        {step === 'doctor' && selectMode === 'doctor-first' && (
          <div className="space-y-3">
            <p className="text-sm text-[#636E72]">
              진료를 원하시는 의사를 선택해주세요
            </p>
            
            {allDoctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => handleDoctorSelectDoctorFirst(doctor)}
                className="w-full card p-4 text-left hover:border-[#5B9A8B] hover:border transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#5B9A8B] to-[#4A8B7C] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                    {doctor.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#2D3436] text-lg">{doctor.name}</span>
                      {doctor.position && (
                        <span className="text-xs px-2 py-0.5 bg-[#E8F5F2] text-[#5B9A8B] rounded-full">
                          {doctor.position}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#636E72] mt-0.5">{doctor.department}</p>
                  </div>
                  <svg className="w-5 h-5 text-[#B2BEC3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 날짜 선택 (의사 먼저 모드) - 의사별 슬롯 표시 */}
        {step === 'doctor-calendar' && selectMode === 'doctor-first' && selectedDoctor && (
          <div className="card">
            {/* 선택된 의사 정보 */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8F5F2]">
              <div className="w-12 h-12 bg-[#5B9A8B] rounded-full flex items-center justify-center text-white font-bold">
                {selectedDoctor.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-[#2D3436]">{selectedDoctor.name} {selectedDoctor.position}</p>
                <p className="text-sm text-[#636E72]">{selectedDoctor.department}</p>
              </div>
            </div>

            <p className="text-sm text-[#636E72] mb-4">
              예약 가능한 날짜를 선택해주세요.
            </p>
            
            {doctorSlotsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-[#636E72]">예약 가능 날짜를 불러오는 중...</p>
              </div>
            ) : (
              <>
                {/* 캘린더 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      if (currentMonth === 0) {
                        setCurrentMonth(11)
                        setCurrentYear(currentYear - 1)
                      } else {
                        setCurrentMonth(currentMonth - 1)
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-bold text-[#2D3436]">
                    {currentYear}년 {monthNames[currentMonth]}
                  </h3>
                  <button
                    onClick={() => {
                      if (currentMonth === 11) {
                        setCurrentMonth(0)
                        setCurrentYear(currentYear + 1)
                      } else {
                        setCurrentMonth(currentMonth + 1)
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((day, idx) => (
                    <div key={day} className={`text-center text-sm font-medium py-2 ${
                      idx === 5 ? 'text-blue-500' : idx === 6 ? 'text-red-500' : 'text-gray-600'
                    }`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                    if (!date) {
                      return <div key={`empty-${idx}`} className="h-16" />
                    }

                    const dateStr = formatLocalDate(date)
                    const isInRange = isDateInRange(date)
                    const slotCount = doctorDateSlots[dateStr] || 0
                    const hasSlots = slotCount > 0
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === selectedDate
                    const isSaturday = idx % 7 === 5
                    const isSunday = idx % 7 === 6
                    const isClickable = isInRange && hasSlots

                    return (
                      <button
                        key={dateStr}
                        onClick={() => isClickable && handleDateSelectDoctorFirst(dateStr)}
                        disabled={!isClickable}
                        className={`
                          h-16 rounded-lg flex flex-col items-center justify-center transition-all
                          ${!isClickable ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#E8F5F2]'}
                          ${isSelected ? 'bg-[#5B9A8B] text-white' : ''}
                          ${isToday && !isSelected ? 'ring-2 ring-[#5B9A8B]' : ''}
                        `}
                      >
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-white' :
                          isSunday ? 'text-red-500' :
                          isSaturday ? 'text-blue-500' : 'text-gray-700'
                        }`}>
                          {date.getDate()}
                        </span>
                        {isInRange && (
                          <span className={`text-[10px] mt-0.5 font-medium ${
                            isSelected ? 'text-white/80' :
                            hasSlots ? (slotCount <= 5 ? 'text-orange-500' : 'text-[#5B9A8B]') : 'text-gray-300'
                          }`}>
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
            {/* 선택 정보 */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8F5F2]">
              <div className="w-10 h-10 bg-[#5B9A8B] rounded-full flex items-center justify-center text-white font-bold">
                {selectedDoctor?.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-[#2D3436]">{selectedDoctor?.name} {selectedDoctor?.position}</p>
                <p className="text-sm text-[#636E72]">{selectedDoctor?.department} · {formatDateKorean(selectedDate!)}</p>
              </div>
            </div>

            {slotsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-[#5B9A8B] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-[#636E72]">시간을 불러오는 중...</p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#B2BEC3]">예약 가능한 시간이 없습니다.</p>
                <button
                  onClick={handleBack}
                  className="mt-4 text-sm text-[#5B9A8B] hover:underline"
                >
                  다른 날짜/의사 선택하기
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#636E72] mb-3">원하시는 시간을 선택해주세요.</p>
                
                {/* 오전 시간 */}
                {timeSlots.filter(s => parseInt(s.time.split(':')[0]) < 12).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-[#5B9A8B] mb-2">오전</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots
                        .filter(s => parseInt(s.time.split(':')[0]) < 12)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && handleTimeSelect(slot.time)}
                            disabled={!slot.available}
                            className={`
                              py-3 rounded-xl text-sm font-medium transition-all
                              ${slot.available
                                ? 'border border-[#5B9A8B] text-[#5B9A8B] hover:bg-[#5B9A8B] hover:text-white'
                                : 'border border-[#DFE6E9] text-[#B2BEC3] cursor-not-allowed bg-[#F5F9F8]'
                              }
                            `}
                          >
                            {slot.time}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* 오후 시간 */}
                {timeSlots.filter(s => parseInt(s.time.split(':')[0]) >= 12).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#5B9A8B] mb-2">오후</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots
                        .filter(s => parseInt(s.time.split(':')[0]) >= 12)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && handleTimeSelect(slot.time)}
                            disabled={!slot.available}
                            className={`
                              py-3 rounded-xl text-sm font-medium transition-all
                              ${slot.available
                                ? 'border border-[#5B9A8B] text-[#5B9A8B] hover:bg-[#5B9A8B] hover:text-white'
                                : 'border border-[#DFE6E9] text-[#B2BEC3] cursor-not-allowed bg-[#F5F9F8]'
                              }
                            `}
                          >
                            {slot.time}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 예약자 정보 입력 */}
        {step === 'info' && (
          <div className="space-y-4">
            {/* 예약 정보 요약 */}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  <span className="text-sm text-[#2D3436]">카카오 정보가 자동 입력되었습니다.</span>
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

              <button
                onClick={handleSubmit}
                className="btn-primary w-full mt-4"
                disabled={!canSubmit || isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
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
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#2D3436] mb-2">
              예약이 완료되었습니다!
            </h2>
            <p className="text-sm text-[#636E72]">예약 내역은 마이페이지에서 확인하세요.</p>
            
            <div className="mt-6 p-4 bg-[#F5F9F8] rounded-xl text-left">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#636E72]">환자명</span>
                  <span className="text-[#2D3436] font-medium">{patientInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#636E72]">예약일시</span>
                  <span className="text-[#2D3436] font-medium">
                    {formatDateKorean(appointmentResult.date)} {appointmentResult.time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#636E72]">담당의</span>
                  <span className="text-[#2D3436] font-medium">{appointmentResult.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#636E72]">진료과</span>
                  <span className="text-[#2D3436] font-medium">{appointmentResult.department}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/mypage" className="btn-outline flex-1 text-center">
                마이페이지
              </Link>
              <button 
                onClick={() => {
                  setStep('mode')
                  setSelectMode(null)
                  setSelectedDate(null)
                  setSelectedDoctor(null)
                  setSelectedTime(null)
                  setAppointmentResult(null)
                }}
                className="btn-primary flex-1"
              >
                새 예약하기
              </button>
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
