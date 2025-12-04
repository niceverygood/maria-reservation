'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Doctor {
  id: string
  name: string
  department: string
}

interface ScheduleTemplate {
  id: string
  doctorId: string
  dayOfWeek: number
  dayStartTime: string
  dayEndTime: string
  slotIntervalMinutes: number
  dailyMaxAppointments: number | null
  isActive: boolean
  doctor: Doctor
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function AdminScheduleTemplatesPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 폼 상태 (요일별)
  const [scheduleForm, setScheduleForm] = useState<Record<number, {
    enabled: boolean
    startTime: string
    endTime: string
    interval: number
    maxAppointments: string
  }>>({})

  // 의사 목록 불러오기
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/patient/doctors')
        const data = await res.json()
        if (data.success) {
          setDoctors(data.doctors)
          if (data.doctors.length > 0) {
            setSelectedDoctorId(data.doctors[0].id)
          }
        }
      } catch (error) {
        console.error('의사 목록 조회 오류:', error)
      }
    }
    fetchDoctors()
  }, [])

  // 스케줄 템플릿 불러오기
  useEffect(() => {
    if (!selectedDoctorId) return

    const fetchTemplates = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/schedule-templates?doctorId=${selectedDoctorId}`)
        const data = await res.json()
        
        if (data.success) {
          setTemplates(data.templates)
          
          // 폼 초기화
          const newForm: typeof scheduleForm = {}
          for (let i = 0; i < 7; i++) {
            const template = data.templates.find((t: ScheduleTemplate) => t.dayOfWeek === i)
            newForm[i] = {
              enabled: !!template?.isActive,
              startTime: template?.dayStartTime || '09:00',
              endTime: template?.dayEndTime || '12:00',
              interval: template?.slotIntervalMinutes || 15,
              maxAppointments: template?.dailyMaxAppointments?.toString() || '',
            }
          }
          setScheduleForm(newForm)
        } else if (res.status === 401) {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('스케줄 템플릿 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTemplates()
  }, [selectedDoctorId, router])

  // 저장
  const handleSave = async () => {
    setSaving(true)
    try {
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const form = scheduleForm[dayOfWeek]
        if (!form) continue

        if (form.enabled) {
          await fetch('/api/admin/schedule-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctorId: selectedDoctorId,
              dayOfWeek,
              dayStartTime: form.startTime,
              dayEndTime: form.endTime,
              slotIntervalMinutes: form.interval,
              dailyMaxAppointments: form.maxAppointments ? parseInt(form.maxAppointments) : null,
            }),
          })
        } else {
          // 비활성화
          const existing = templates.find((t) => t.dayOfWeek === dayOfWeek)
          if (existing) {
            await fetch(`/api/admin/schedule-templates/${existing.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            })
          }
        }
      }
      alert('저장되었습니다.')
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (dayOfWeek: number, field: string, value: string | number | boolean) => {
    setScheduleForm((prev) => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value },
    }))
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-[#1E293B] mb-6">스케줄 템플릿</h1>

      {/* 의사 선택 */}
      <div className="card mb-6">
        <label className="block text-sm font-medium text-[#1E293B] mb-2">의사 선택</label>
        <select
          className="input-field"
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
        >
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.department})
            </option>
          ))}
        </select>
      </div>

      {/* 요일별 스케줄 */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => (
            <div key={dayOfWeek} className="card">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scheduleForm[dayOfWeek]?.enabled || false}
                    onChange={(e) => updateForm(dayOfWeek, 'enabled', e.target.checked)}
                    className="w-5 h-5 text-[#0066CC] rounded"
                  />
                  <span className={`font-semibold ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-[#1E293B]'}`}>
                    {WEEKDAYS[dayOfWeek]}요일
                  </span>
                </label>
              </div>

              {scheduleForm[dayOfWeek]?.enabled && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">시작 시간</label>
                    <input
                      type="time"
                      className="input-field text-sm py-2"
                      value={scheduleForm[dayOfWeek]?.startTime || '09:00'}
                      onChange={(e) => updateForm(dayOfWeek, 'startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">종료 시간</label>
                    <input
                      type="time"
                      className="input-field text-sm py-2"
                      value={scheduleForm[dayOfWeek]?.endTime || '12:00'}
                      onChange={(e) => updateForm(dayOfWeek, 'endTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">예약 간격(분)</label>
                    <select
                      className="input-field text-sm py-2"
                      value={scheduleForm[dayOfWeek]?.interval || 15}
                      onChange={(e) => updateForm(dayOfWeek, 'interval', parseInt(e.target.value))}
                    >
                      <option value={10}>10분</option>
                      <option value={15}>15분</option>
                      <option value={20}>20분</option>
                      <option value={30}>30분</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">최대 예약 수</label>
                    <input
                      type="number"
                      className="input-field text-sm py-2"
                      placeholder="제한 없음"
                      value={scheduleForm[dayOfWeek]?.maxAppointments || ''}
                      onChange={(e) => updateForm(dayOfWeek, 'maxAppointments', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={handleSave} className="btn-primary w-full" disabled={saving}>
            {saving ? '저장 중...' : '스케줄 저장'}
          </button>
        </div>
      )}
    </div>
  )
}
