'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Doctor {
  id: string
  name: string
  department: string
  isActive: boolean
  sortOrder: number
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
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [formData, setFormData] = useState({ name: '', department: '', sortOrder: 0 })
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    try {
      const url = editingDoctor ? `/api/admin/doctors/${editingDoctor.id}` : '/api/admin/doctors'
      const method = editingDoctor ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      
      if (data.success) {
        setShowModal(false)
        setEditingDoctor(null)
        setFormData({ name: '', department: '', sortOrder: 0 })
        fetchDoctors()
      }
    } catch (error) {
      console.error('의사 저장 오류:', error)
    } finally {
      setSaving(false)
    }
  }

  // 의사 활성화/비활성화
  const toggleActive = async (doctor: Doctor) => {
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !doctor.isActive }),
      })
      if (res.ok) {
        fetchDoctors()
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
    }
  }

  // 수정 모달 열기
  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    setFormData({ name: doctor.name, department: doctor.department, sortOrder: doctor.sortOrder })
    setShowModal(true)
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
        <button
          onClick={() => {
            setEditingDoctor(null)
            setFormData({ name: '', department: '', sortOrder: doctors.length })
            setShowModal(true)
          }}
          className="btn-primary text-sm"
        >
          + 의사 등록
        </button>
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
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">스케줄</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상태</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">관리</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-[#64748B]">{doctor.sortOrder}</td>
                    <td className="py-3 px-2 text-sm font-medium text-[#1E293B]">{doctor.name}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{doctor.department}</td>
                    <td className="py-3 px-2 text-sm text-[#64748B]">{doctor._count.scheduleTemplates}개 요일</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doctor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doctor.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(doctor)}
                          className="text-xs text-[#0066CC] hover:underline"
                        >
                          수정
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
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">
              {editingDoctor ? '의사 정보 수정' : '새 의사 등록'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">이름</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">진료과</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="예: 산부인과, 내과"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">정렬 순서</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
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
