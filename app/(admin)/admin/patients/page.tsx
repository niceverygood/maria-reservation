'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  phone: string | null
  birthDate: string | null
  kakaoId: string | null
  appointmentCount: number
  createdAt: string
}

interface PatientDetail extends Patient {
  kakaoEmail: string | null
  appointments: {
    id: string
    date: string
    time: string
    status: string
    doctorName: string
    department: string
    memo: string | null
  }[]
}

export default function AdminPatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 상세 모달
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // 새 환자 등록 모달
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', birthDate: '' })
  const [addError, setAddError] = useState('')

  // 환자 목록 조회
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        params.append('page', page.toString())

        const res = await fetch(`/api/admin/patients?${params.toString()}`)
        const data = await res.json()

        if (data.success) {
          setPatients(data.patients)
          setTotalPages(data.totalPages)
          setTotal(data.total)
        } else if (res.status === 401) {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('환자 목록 조회 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchPatients, 300)
    return () => clearTimeout(debounce)
  }, [search, page, router])

  // 환자 상세 조회
  const handlePatientClick = async (patientId: string) => {
    setIsDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/patients/${patientId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedPatient(data.patient)
      }
    } catch (error) {
      console.error('환자 상세 조회 오류:', error)
    } finally {
      setIsDetailLoading(false)
    }
  }

  // 새 환자 등록
  const handleAddPatient = async () => {
    if (!newPatient.name) {
      setAddError('이름을 입력해주세요.')
      return
    }

    try {
      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      })
      const data = await res.json()

      if (data.success) {
        setShowAddModal(false)
        setNewPatient({ name: '', phone: '', birthDate: '' })
        setAddError('')
        // 목록 새로고침
        setPage(1)
        setSearch('')
      } else {
        setAddError(data.error)
      }
    } catch (error) {
      console.error('환자 등록 오류:', error)
      setAddError('환자 등록 중 오류가 발생했습니다.')
    }
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    }
    return phone
  }

  const formatBirthDate = (birthDate: string | null) => {
    if (!birthDate) return '-'
    if (birthDate.length === 8) {
      return `${birthDate.slice(0, 4)}.${birthDate.slice(4, 6)}.${birthDate.slice(6)}`
    }
    return birthDate
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'BOOKED': return 'bg-blue-100 text-blue-700'
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600'
      case 'NO_SHOW': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'BOOKED': return '예약'
      case 'COMPLETED': return '완료'
      case 'CANCELLED': return '취소'
      case 'NO_SHOW': return '노쇼'
      default: return status
    }
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">환자 관리</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-sm"
        >
          + 새 환자 등록
        </button>
      </div>

      {/* 검색 */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              className="input-field"
              placeholder="환자명, 전화번호, 생년월일로 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </div>

      {/* 환자 목록 */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : patients.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">이름</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">전화번호</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden md:table-cell">생년월일</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">예약 수</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden md:table-cell">가입경로</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm font-medium text-[#1E293B]">{patient.name}</td>
                      <td className="py-3 px-2 text-sm text-[#64748B]">{formatPhone(patient.phone)}</td>
                      <td className="py-3 px-2 text-sm text-[#64748B] hidden md:table-cell">{formatBirthDate(patient.birthDate)}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {patient.appointmentCount}건
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-[#64748B] hidden md:table-cell">
                        {patient.kakaoId ? (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">카카오</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">일반</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handlePatientClick(patient.id)}
                          className="text-[#0066CC] hover:underline text-sm"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-[#64748B]">총 {total}명</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-[#64748B]">
            {search ? '검색 결과가 없습니다.' : '등록된 환자가 없습니다.'}
          </div>
        )}
      </div>

      {/* 환자 상세 모달 */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">환자 상세 정보</h2>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isDetailLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="p-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-500">이름</label>
                    <p className="font-medium">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">전화번호</label>
                    <p className="font-medium">{formatPhone(selectedPatient.phone)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">생년월일</label>
                    <p className="font-medium">{formatBirthDate(selectedPatient.birthDate)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">가입경로</label>
                    <p className="font-medium">
                      {selectedPatient.kakaoId ? `카카오 (${selectedPatient.kakaoEmail || '-'})` : '일반 가입'}
                    </p>
                  </div>
                </div>

                {/* 예약 내역 */}
                <div>
                  <h3 className="font-bold mb-3">예약 내역 ({selectedPatient.appointments.length}건)</h3>
                  {selectedPatient.appointments.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedPatient.appointments.map((apt) => (
                        <div key={apt.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium">{apt.date} {apt.time}</p>
                            <p className="text-sm text-gray-500">{apt.doctorName} · {apt.department}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(apt.status)}`}>
                            {getStatusLabel(apt.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">예약 내역이 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 새 환자 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">새 환자 등록</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{addError}</div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">이름 *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="홍길동"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">전화번호</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="01012345678"
                  maxLength={11}
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">생년월일</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="19900101"
                  maxLength={8}
                  value={newPatient.birthDate}
                  onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleAddPatient}
                  className="flex-1 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0055AA]"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




