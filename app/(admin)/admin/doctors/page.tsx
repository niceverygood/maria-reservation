'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BlockedTime {
  id: string
  dayOfWeek: number | null
  date: string | null
  startTime: string
  endTime: string
  reason: string | null
  isActive: boolean
}

interface Doctor {
  id: string
  name: string
  department: string
  email?: string
  isActive: boolean
  sortOrder: number
  maxPatientsPerSlot: number
  blockedTimes?: BlockedTime[]
  _count: {
    scheduleTemplates: number
    appointments: number
  }
}

export default function AdminDoctorsPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    sortOrder: 0,
    email: '',
    password: '',
    maxPatientsPerSlot: 1,
  })
  const [blockedFormData, setBlockedFormData] = useState({
    dayOfWeek: '' as string,
    date: '',
    startTime: '12:00',
    endTime: '13:00',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 의사 목록 불러오기
  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/admin/doctors')
      const data = await res.json()
      if (data.success) {
        setDoctors(data.doctors)
      } else if (res.status === 401) {
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('의사 목록 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [router])

  // 의사 등록/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    
    try {
      const url = editingDoctor ? `/api/admin/doctors/${editingDoctor.id}` : '/api/admin/doctors'
      const method = editingDoctor ? 'PATCH' : 'POST'
      
      const payload: Record<string, unknown> = {
        name: formData.name,
        department: formData.department,
        sortOrder: formData.sortOrder,
        maxPatientsPerSlot: formData.maxPatientsPerSlot,
      }
      
      if (formData.email) {
        payload.email = formData.email
      }
      
      if (formData.password) {
        payload.password = formData.password
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      
      if (data.success) {
        setShowModal(false)
        setEditingDoctor(null)
        setFormData({ name: '', department: '', sortOrder: 0, email: '', password: '', maxPatientsPerSlot: 1 })
        fetchDoctors()
      } else {
        setError(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('의사 저장 오류:', error)
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 의사 활성화/비활성화 (퇴사 처리)
  const toggleActive = async (doctor: Doctor) => {
    const action = doctor.isActive ? '비활성화' : '활성화'
    const confirmMsg = doctor.isActive 
      ? `${doctor.name} 의사를 비활성화하시겠습니까?\n\n⚠️ 비활성화 시:\n- 새로운 예약 불가\n- 기존 예약은 유지됨\n- 예약 내역/로그는 보존됨`
      : `${doctor.name} 의사를 다시 활성화하시겠습니까?`
    
    if (!confirm(confirmMsg)) return
    
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !doctor.isActive }),
      })
      if (res.ok) {
        fetchDoctors()
        alert(`${doctor.name} 의사가 ${action}되었습니다.`)
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    }
  }

  // 순서 변경
  const handleSortChange = async (doctorId: string, newOrder: number) => {
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newOrder }),
      })
      if (res.ok) {
        fetchDoctors()
      }
    } catch (error) {
      console.error('순서 변경 오류:', error)
    }
  }

  // 순서 위로/아래로 이동
  const moveDoctor = async (doctorId: string, direction: 'up' | 'down') => {
    const currentIndex = doctors.findIndex(d => d.id === doctorId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= doctors.length) return
    
    const currentDoctor = doctors[currentIndex]
    const targetDoctor = doctors[newIndex]
    
    // 순서 교환
    await Promise.all([
      fetch(`/api/admin/doctors/${currentDoctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: targetDoctor.sortOrder }),
      }),
      fetch(`/api/admin/doctors/${targetDoctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: currentDoctor.sortOrder }),
      }),
    ])
    
    fetchDoctors()
  }

  // 시술시간 추가
  const handleAddBlockedTime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor) return
    
    setSaving(true)
    setError('')
    
    try {
      const payload: Record<string, unknown> = {
        doctorId: selectedDoctor.id,
        startTime: blockedFormData.startTime,
        endTime: blockedFormData.endTime,
        reason: blockedFormData.reason || null,
      }
      
      if (blockedFormData.date) {
        payload.date = blockedFormData.date
      } else if (blockedFormData.dayOfWeek !== '') {
        payload.dayOfWeek = parseInt(blockedFormData.dayOfWeek)
      }
      
      const res = await fetch(`/api/admin/doctors/${selectedDoctor.id}/blocked-times`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      
      if (data.success) {
        setBlockedFormData({ dayOfWeek: '', date: '', startTime: '12:00', endTime: '13:00', reason: '' })
        fetchDoctors()
        // 선택된 의사 정보 업데이트
        const updatedDoctor = await fetch(`/api/admin/doctors/${selectedDoctor.id}`).then(r => r.json())
        if (updatedDoctor.success) {
          setSelectedDoctor(updatedDoctor.doctor)
        }
      } else {
        setError(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('시술시간 저장 오류:', error)
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 시술시간 삭제
  const handleDeleteBlockedTime = async (blockedTimeId: string) => {
    if (!selectedDoctor) return
    if (!confirm('이 시술시간을 삭제하시겠습니까?')) return
    
    try {
      const res = await fetch(`/api/admin/doctors/${selectedDoctor.id}/blocked-times/${blockedTimeId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchDoctors()
        const updatedDoctor = await fetch(`/api/admin/doctors/${selectedDoctor.id}`).then(r => r.json())
        if (updatedDoctor.success) {
          setSelectedDoctor(updatedDoctor.doctor)
        }
      }
    } catch (error) {
      console.error('시술시간 삭제 오류:', error)
    }
  }

  // 수정 모달 열기
  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    setFormData({
      name: doctor.name,
      department: doctor.department,
      sortOrder: doctor.sortOrder,
      email: doctor.email || '',
      password: '',
      maxPatientsPerSlot: doctor.maxPatientsPerSlot || 1,
    })
    setError('')
    setShowModal(true)
  }

  // 새 등록 모달 열기
  const openNewModal = () => {
    setEditingDoctor(null)
    setFormData({
      name: '',
      department: '',
      sortOrder: doctors.length,
      email: '',
      password: '',
      maxPatientsPerSlot: 1,
    })
    setError('')
    setShowModal(true)
  }

  // 시술시간 모달 열기
  const openBlockedModal = async (doctor: Doctor) => {
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}`)
      const data = await res.json()
      if (data.success) {
        setSelectedDoctor(data.doctor)
        setShowBlockedModal(true)
      }
    } catch (error) {
      console.error('의사 정보 조회 오류:', error)
    }
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[dayOfWeek]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">의사 관리</h1>
        <button onClick={openNewModal} className="btn-primary text-sm">
          + 의사 등록
        </button>
      </div>

      {/* 안내 메시지 */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 <strong>퇴사/입사 관리:</strong> 의사 비활성화 시 새 예약은 불가하지만, 기존 예약 내역과 로그는 모두 보존됩니다.
        </p>
      </div>

      <div className="card">
        {doctors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">순서</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">이름</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">진료과</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">시간당 예약</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">스케줄</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상태</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">관리</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor, index) => (
                  <tr key={doctor.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!doctor.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-[#64748B] w-6">{doctor.sortOrder}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveDoctor(doctor.id, 'up')}
                            disabled={index === 0}
                            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDoctor(doctor.id, 'down')}
                            disabled={index === doctors.length - 1}
                            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm font-medium text-[#1E293B]">{doctor.name}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{doctor.department}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {doctor.maxPatientsPerSlot}명/시간
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{doctor._count.scheduleTemplates}개 요일</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doctor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doctor.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openEditModal(doctor)}
                          className="text-xs text-[#0066CC] hover:underline"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => openBlockedModal(doctor)}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          시술시간
                        </button>
                        <button
                          onClick={() => router.push(`/admin/doctors/${doctor.id}`)}
                          className="text-xs text-gray-600 hover:underline"
                        >
                          상세
                        </button>
                        <button
                          onClick={() => toggleActive(doctor)}
                          className={`text-xs ${doctor.isActive ? 'text-orange-600' : 'text-green-600'} hover:underline`}
                        >
                          {doctor.isActive ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#64748B]">등록된 의사가 없습니다.</div>
        )}
      </div>

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">
              {editingDoctor ? '의사 정보 수정' : '새 의사 등록'}
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">이름 *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">진료과 *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="예: 산부인과, 내과"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">정렬 순서</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">시간당 예약 *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={formData.maxPatientsPerSlot}
                    onChange={(e) => setFormData({ ...formData, maxPatientsPerSlot: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">같은 시간대 최대 예약 환자 수</p>
                </div>
              </div>
              
              <hr className="my-4" />
              
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  💡 이메일/비밀번호를 설정하면 의사가 직접 로그인하여 본인 예약을 관리할 수 있습니다.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">로그인 이메일</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="doctor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  {editingDoctor ? '비밀번호 (변경 시에만 입력)' : '비밀번호'}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingDoctor ? '변경하지 않으면 비워두세요' : '비밀번호 입력'}
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

      {/* 시술시간 설정 모달 */}
      {showBlockedModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">
              📋 {selectedDoctor.name} 시술시간 설정
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              시술, 점심시간 등 예약 불가 시간대를 설정합니다.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {/* 현재 설정된 시술시간 목록 */}
            {selectedDoctor.blockedTimes && selectedDoctor.blockedTimes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[#1E293B] mb-2">현재 설정된 시간</h3>
                <div className="space-y-2">
                  {selectedDoctor.blockedTimes.map((bt) => (
                    <div key={bt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">
                          {bt.date ? bt.date : bt.dayOfWeek !== null ? `매주 ${getDayName(bt.dayOfWeek)}요일` : '매일'}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          {bt.startTime} ~ {bt.endTime}
                        </span>
                        {bt.reason && (
                          <span className="text-xs text-gray-500 ml-2">({bt.reason})</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteBlockedTime(bt.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 새 시술시간 추가 폼 */}
            <form onSubmit={handleAddBlockedTime} className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-[#1E293B]">새 시간 추가</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">반복 요일</label>
                  <select
                    className="input-field text-sm"
                    value={blockedFormData.dayOfWeek}
                    onChange={(e) => setBlockedFormData({ ...blockedFormData, dayOfWeek: e.target.value, date: '' })}
                  >
                    <option value="">선택 안함</option>
                    <option value="0">일요일</option>
                    <option value="1">월요일</option>
                    <option value="2">화요일</option>
                    <option value="3">수요일</option>
                    <option value="4">목요일</option>
                    <option value="5">금요일</option>
                    <option value="6">토요일</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">또는 특정 날짜</label>
                  <input
                    type="date"
                    className="input-field text-sm"
                    value={blockedFormData.date}
                    onChange={(e) => setBlockedFormData({ ...blockedFormData, date: e.target.value, dayOfWeek: '' })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">시작 시간</label>
                  <input
                    type="time"
                    className="input-field text-sm"
                    value={blockedFormData.startTime}
                    onChange={(e) => setBlockedFormData({ ...blockedFormData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">종료 시간</label>
                  <input
                    type="time"
                    className="input-field text-sm"
                    value={blockedFormData.endTime}
                    onChange={(e) => setBlockedFormData({ ...blockedFormData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">사유 (선택)</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  value={blockedFormData.reason}
                  onChange={(e) => setBlockedFormData({ ...blockedFormData, reason: e.target.value })}
                  placeholder="예: 점심시간, 시술, 회의"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBlockedModal(false)} className="btn-secondary flex-1">
                  닫기
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
