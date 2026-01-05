'use client'

import { useState, useEffect, useCallback } from 'react'

interface Doctor {
  id: string
  name: string
  department: string
  maxPatientsPerSlot: number
}

interface TimeSlotConfig {
  id?: string
  doctorId: string
  dayOfWeek: number
  time: string
  slotType: 'AVAILABLE' | 'PROCEDURE' | 'OFF'
  maxPatients: number
}

interface ScheduleTemplate {
  id: string
  doctorId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const DAY_COLORS = ['#f3f4f6', '#fef3c7', '#fef3c7', '#fef3c7', '#fef3c7', '#fef3c7', '#e5e7eb']

// 시간 슬롯 생성 (7:30 ~ 16:30, 30분 간격)
const TIME_SLOTS = [
  '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30'
]

// 점심시간 (11:30~13:30)
const LUNCH_TIMES = ['11:30', '12:00', '12:30', '13:00']

export default function ScheduleConfigPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [configs, setConfigs] = useState<TimeSlotConfig[]>([])
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([])
  const [selectedDay, setSelectedDay] = useState<number>(1) // 기본 월요일
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/schedule-config')
      const data = await res.json()
      
      if (data.success) {
        setDoctors(data.doctors)
        setConfigs(data.configs)
        setScheduleTemplates(data.scheduleTemplates)
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 특정 의사, 요일, 시간의 설정 가져오기
  const getConfig = (doctorId: string, dayOfWeek: number, time: string): TimeSlotConfig | undefined => {
    return configs.find(c => 
      c.doctorId === doctorId && 
      c.dayOfWeek === dayOfWeek && 
      c.time === time
    )
  }

  // 의사가 해당 요일에 근무하는지 확인
  const isDoctorWorkingDay = (doctorId: string, dayOfWeek: number): boolean => {
    return scheduleTemplates.some(t => 
      t.doctorId === doctorId && 
      t.dayOfWeek === dayOfWeek
    )
  }

  // 점심시간인지 확인
  const isLunchTime = (time: string): boolean => {
    return LUNCH_TIMES.includes(time)
  }

  // 셀 클릭 핸들러
  const handleCellClick = (doctorId: string, dayOfWeek: number, time: string) => {
    // 휴무일이면 무시
    if (!isDoctorWorkingDay(doctorId, dayOfWeek)) return

    const existingConfig = getConfig(doctorId, dayOfWeek, time)
    
    // 현재 상태에 따라 순환: OFF → 1 → 2 → 3 → 시술 → OFF
    let newSlotType: 'AVAILABLE' | 'PROCEDURE' | 'OFF' = 'AVAILABLE'
    let newMaxPatients = 1

    if (!existingConfig || existingConfig.slotType === 'OFF') {
      newSlotType = 'AVAILABLE'
      newMaxPatients = 1
    } else if (existingConfig.slotType === 'AVAILABLE') {
      if (existingConfig.maxPatients < 3) {
        newSlotType = 'AVAILABLE'
        newMaxPatients = existingConfig.maxPatients + 1
      } else {
        newSlotType = 'PROCEDURE'
        newMaxPatients = 0
      }
    } else if (existingConfig.slotType === 'PROCEDURE') {
      newSlotType = 'OFF'
      newMaxPatients = 0
    }

    // 설정 업데이트
    const newConfig: TimeSlotConfig = {
      doctorId,
      dayOfWeek,
      time,
      slotType: newSlotType,
      maxPatients: newMaxPatients
    }

    setConfigs(prev => {
      const filtered = prev.filter(c => 
        !(c.doctorId === doctorId && c.dayOfWeek === dayOfWeek && c.time === time)
      )
      return [...filtered, newConfig]
    })
    setHasChanges(true)
  }

  // 저장
  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // 현재 선택된 요일의 설정만 저장
      const configsToSave = configs.filter(c => c.dayOfWeek === selectedDay)
      
      const res = await fetch('/api/admin/schedule-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToSave })
      })

      const data = await res.json()
      
      if (data.success) {
        alert(`${data.count}개의 설정이 저장되었습니다.`)
        setHasChanges(false)
      } else {
        alert('저장 실패: ' + data.error)
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 전체 저장 (모든 요일)
  const handleSaveAll = async () => {
    try {
      setIsSaving(true)
      
      const res = await fetch('/api/admin/schedule-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs })
      })

      const data = await res.json()
      
      if (data.success) {
        alert(`${data.count}개의 설정이 저장되었습니다.`)
        setHasChanges(false)
      } else {
        alert('저장 실패: ' + data.error)
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 셀 렌더링
  const renderCell = (doctorId: string, dayOfWeek: number, time: string) => {
    const config = getConfig(doctorId, dayOfWeek, time)
    const isWorking = isDoctorWorkingDay(doctorId, dayOfWeek)
    const isLunch = isLunchTime(time)
    
    if (!isWorking) {
      return (
        <td 
          key={`${doctorId}-${dayOfWeek}-${time}`}
          className="border border-gray-200 bg-gray-100 text-center text-xs text-gray-400 p-1 w-10"
        >
          휴무
        </td>
      )
    }

    let bgColor = 'bg-white'
    let textColor = 'text-gray-900'
    let content = ''

    if (config) {
      if (config.slotType === 'PROCEDURE') {
        bgColor = 'bg-orange-400'
        textColor = 'text-white font-bold'
        content = '시술'
      } else if (config.slotType === 'OFF') {
        bgColor = 'bg-gray-200'
        textColor = 'text-gray-500'
        content = ''
      } else {
        bgColor = config.maxPatients >= 3 ? 'bg-green-100' : 
                  config.maxPatients >= 2 ? 'bg-yellow-100' : 'bg-white'
        content = config.maxPatients.toString()
      }
    }

    // 점심시간 기본 스타일
    if (isLunch && !config) {
      bgColor = 'bg-gray-50'
    }

    return (
      <td 
        key={`${doctorId}-${dayOfWeek}-${time}`}
        className={`border border-gray-300 text-center text-xs p-1 w-10 cursor-pointer hover:bg-blue-100 transition-colors ${bgColor} ${textColor}`}
        onClick={() => handleCellClick(doctorId, dayOfWeek, time)}
        title={`${doctors.find(d => d.id === doctorId)?.name} - ${DAYS[dayOfWeek]} ${time}`}
      >
        {content}
      </td>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예약 스케줄 설정</h1>
          <p className="text-sm text-gray-500 mt-1">의사별, 요일별, 시간대별 예약 가능 인원을 설정합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : `${DAYS[selectedDay]}요일 저장`}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '전체 저장'}
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-4 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gray-300 bg-white flex items-center justify-center text-xs">1</div>
          <span className="text-sm">예약 1명</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gray-300 bg-yellow-100 flex items-center justify-center text-xs">2</div>
          <span className="text-sm">예약 2명</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gray-300 bg-green-100 flex items-center justify-center text-xs">3</div>
          <span className="text-sm">예약 3명</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gray-300 bg-orange-400 flex items-center justify-center text-xs text-white font-bold">시술</div>
          <span className="text-sm">시술 (예약불가)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gray-300 bg-gray-200"></div>
          <span className="text-sm">빈칸 (예약불가)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-gray-300 bg-gray-100 flex items-center justify-center text-xs text-gray-400">휴무</div>
          <span className="text-sm">휴무일</span>
        </div>
      </div>

      {/* 요일 선택 탭 */}
      <div className="flex gap-1 border-b">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`px-6 py-3 font-medium transition-colors ${
              selectedDay === idx
                ? 'bg-blue-600 text-white rounded-t-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-t-lg'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* 스케줄 테이블 - 선택된 요일만 표시 */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-2 font-medium text-left w-20">시간</th>
              {doctors.map(doctor => (
                <th 
                  key={doctor.id}
                  className="border border-gray-300 p-2 font-medium text-center min-w-[60px]"
                  style={{ backgroundColor: DAY_COLORS[selectedDay] }}
                >
                  {doctor.name.charAt(0)}
                  <div className="text-xs font-normal text-gray-500">{doctor.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time} className={isLunchTime(time) ? 'bg-amber-50' : ''}>
                <td className="border border-gray-300 p-2 font-medium text-gray-700">
                  {time}
                  {time === '11:30' && <span className="text-xs text-gray-400 ml-1">(점심)</span>}
                </td>
                {doctors.map(doctor => renderCell(doctor.id, selectedDay, time))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 전체 요일 요약 보기 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">📅 전체 요일 요약</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2">시간</th>
                {DAYS.slice(1, 7).map((day, idx) => (
                  <th 
                    key={day} 
                    colSpan={doctors.length}
                    className="border border-gray-300 p-1 text-center"
                    style={{ backgroundColor: DAY_COLORS[idx + 1] }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-1"></th>
                {DAYS.slice(1, 7).map(() => (
                  doctors.map(doctor => (
                    <th key={`header-${doctor.id}`} className="border border-gray-200 p-1 text-center font-normal">
                      {doctor.name.charAt(0)}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.filter((_, i) => i % 2 === 0).map(time => (
                <tr key={`summary-${time}`}>
                  <td className="border border-gray-300 p-1 font-medium">{time}</td>
                  {DAYS.slice(1, 7).map((_, dayIdx) => (
                    doctors.map(doctor => {
                      const config = getConfig(doctor.id, dayIdx + 1, time)
                      const isWorking = isDoctorWorkingDay(doctor.id, dayIdx + 1)
                      
                      if (!isWorking) {
                        return <td key={`${doctor.id}-${dayIdx+1}-${time}`} className="border border-gray-200 bg-gray-100 text-center text-gray-400 p-0.5"></td>
                      }
                      
                      let bg = ''
                      let text = ''
                      if (config?.slotType === 'PROCEDURE') {
                        bg = 'bg-orange-400'
                        text = '시'
                      } else if (config?.slotType === 'AVAILABLE') {
                        bg = config.maxPatients >= 2 ? 'bg-yellow-100' : ''
                        text = config.maxPatients.toString()
                      }
                      
                      return (
                        <td 
                          key={`${doctor.id}-${dayIdx+1}-${time}`}
                          className={`border border-gray-200 text-center p-0.5 ${bg} ${config?.slotType === 'PROCEDURE' ? 'text-white text-[10px]' : ''}`}
                        >
                          {text}
                        </td>
                      )
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 사용법 안내 */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <h4 className="font-semibold mb-2">💡 사용법</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>셀을 클릭하면 예약 인원이 순환됩니다: 1명 → 2명 → 3명 → 시술 → 빈칸</li>
          <li>시술 시간대는 환자가 예약할 수 없습니다</li>
          <li>휴무일은 스케줄 템플릿에서 설정된 근무일 기준입니다</li>
          <li>변경 후 반드시 저장 버튼을 클릭해주세요</li>
        </ul>
      </div>
    </div>
  )
}

