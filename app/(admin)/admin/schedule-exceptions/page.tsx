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

interface BlockedTime {
  id: string
  doctorId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  doctor: Doctor
}

/** 예외일과 차단 시간을 한 목록에서 함께 보여주기 위한 행 */
interface Row {
  kind: 'exception' | 'block'
  id: string
  date: string
  doctorName: string
  label: string
  labelClass: string
  timeLabel: string
  reason: string | null
}

const EMPTY_FORM = {
  doctorId: '',
  date: '',
  type: 'OFF',
  customStart: '09:00',
  customEnd: '12:00',
  customInterval: 15,
  reason: '',
}

export default function AdminScheduleExceptionsPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState(EMPTY_FORM)

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

  // 예외일 + 차단 시간 목록 불러오기
  const fetchAll = async () => {
    setIsLoading(true)
    try {
      const [exceptionRes, blockedRes] = await Promise.all([
        fetch('/api/admin/schedule-exceptions'),
        fetch('/api/admin/blocked-times'),
      ])

      if (exceptionRes.status === 401 || blockedRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const exceptionData = await exceptionRes.json()
      const blockedData = await blockedRes.json()

      if (exceptionData.success) setExceptions(exceptionData.exceptions)
      if (blockedData.success) setBlockedTimes(blockedData.blockedTimes)
    } catch (error) {
      console.error('예외일 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [router])

  // 저장 (유형에 따라 저장되는 곳이 다름)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage('')

    try {
      const isBlock = formData.type === 'BLOCK'

      if (isBlock && formData.customStart >= formData.customEnd) {
        setErrorMessage('종료 시간은 시작 시간보다 늦어야 합니다.')
        return
      }

      const res = isBlock
        ? await fetch('/api/admin/blocked-times', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctorId: formData.doctorId,
              date: formData.date,
              startTime: formData.customStart,
              endTime: formData.customEnd,
              reason: formData.reason,
            }),
          })
        : await fetch('/api/admin/schedule-exceptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })

      const data = await res.json()

      if (data.success) {
        setShowModal(false)
        setFormData(EMPTY_FORM)
        fetchAll()
      } else {
        setErrorMessage(data.error || '저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('예외일 저장 오류:', error)
      setErrorMessage('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 삭제
  const handleDelete = async (row: Row) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const url =
      row.kind === 'block'
        ? `/api/admin/blocked-times/${row.id}`
        : `/api/admin/schedule-exceptions/${row.id}`

    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        fetchAll()
      }
    } catch (error) {
      console.error('삭제 오류:', error)
    }
  }

  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} (${weekDays[date.getDay()]})`
  }

  // 두 목록을 하나로 합쳐 날짜 내림차순 정렬
  const rows: Row[] = [
    ...exceptions.map<Row>((exception) => ({
      kind: 'exception',
      id: exception.id,
      date: exception.date,
      doctorName: exception.doctor.name,
      label: exception.type === 'OFF' ? '휴진' : '특별 스케줄',
      labelClass:
        exception.type === 'OFF' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
      timeLabel:
        exception.type === 'CUSTOM' && exception.customStart && exception.customEnd
          ? `${exception.customStart} ~ ${exception.customEnd}`
          : '종일',
      reason: exception.reason,
    })),
    ...blockedTimes.map<Row>((blocked) => ({
      kind: 'block',
      id: blocked.id,
      date: blocked.date,
      doctorName: blocked.doctor.name,
      label: '시간대 차단',
      labelClass: 'bg-amber-100 text-amber-700',
      timeLabel: `${blocked.startTime} ~ ${blocked.endTime}`,
      reason: blocked.reason,
    })),
  ].sort((a, b) => (a.date === b.date ? a.timeLabel.localeCompare(b.timeLabel) : b.date.localeCompare(a.date)))

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
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">날짜</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">의사</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">유형</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">시간</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">사유</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-[#1E293B]">{formatDateKorean(row.date)}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{row.doctorName}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.labelClass}`}>
                        {row.label}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-[#64748B] tabular-nums">{row.timeLabel}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{row.reason || '-'}</td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => handleDelete(row)}
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
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
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
                <div className="flex flex-wrap gap-4">
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
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="BLOCK"
                      checked={formData.type === 'BLOCK'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                    <span className="text-sm">시간대 차단</span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-[#64748B]">
                  {formData.type === 'OFF' && '하루 전체를 휴진 처리합니다. 날짜당 1건만 등록됩니다.'}
                  {formData.type === 'CUSTOM' &&
                    '그날 진료 시간을 지정한 범위로 대체합니다. 날짜당 1건만 등록됩니다.'}
                  {formData.type === 'BLOCK' &&
                    '지정한 시간대만 예약을 막습니다. 같은 날짜에 여러 건 추가할 수 있습니다.'}
                </p>
              </div>
              {(formData.type === 'CUSTOM' || formData.type === 'BLOCK') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">시작 시간</label>
                    <input
                      type="time"
                      className="input-field text-sm py-2"
                      value={formData.customStart}
                      onChange={(e) => setFormData({ ...formData, customStart: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-1">종료 시간</label>
                    <input
                      type="time"
                      className="input-field text-sm py-2"
                      value={formData.customEnd}
                      onChange={(e) => setFormData({ ...formData, customEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">사유 (선택)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="예: 학회, 휴가, 시술"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setErrorMessage('')
                  }}
                  className="btn-secondary flex-1"
                >
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
