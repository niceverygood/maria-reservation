'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Doctor {
  id: string
  name: string
  department: string
  isActive: boolean
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      } finally {
        setIsLoading(false)
      }
    }
    fetchDoctors()
  }, [])

  const filteredDoctors = selectedDepartment
    ? doctors.filter(d => d.department === selectedDepartment)
    : doctors

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-[#E8F4FD] to-white min-h-screen">
      <div className="px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#1E293B]">의료진 소개</h1>
          <p className="text-sm text-[#64748B] mt-1">일산마리아병원의 전문 의료진을 소개합니다.</p>
        </div>

        {/* 진료과 필터 */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => setSelectedDepartment(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedDepartment
                  ? 'bg-[#0066CC] text-white'
                  : 'bg-white text-[#64748B] border border-gray-200'
              }`}
            >
              전체
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedDepartment === dept
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-white text-[#64748B] border border-gray-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* 의사 목록 */}
        <div className="space-y-3">
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#64748B]">등록된 의료진이 없습니다.</p>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="card">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0066CC] to-[#0052A3] rounded-full flex items-center justify-center">
                    <span className="text-2xl text-white font-bold">
                      {doctor.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#1E293B]">
                      {doctor.name} <span className="font-normal text-base">선생님</span>
                    </h3>
                    <p className="text-sm text-[#64748B]">{doctor.department}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`w-2 h-2 rounded-full ${doctor.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-xs text-[#64748B]">
                        {doctor.isActive ? '진료 중' : '휴진'}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/reserve?doctorId=${doctor.id}`}
                    className="px-4 py-2 bg-[#0066CC] text-white rounded-lg text-sm font-medium hover:bg-[#0052A3] transition-colors"
                  >
                    예약
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 안내 문구 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-[#0066CC]">
            💡 진료 예약은 최대 4주 후까지 가능합니다.
          </p>
        </div>
      </div>
    </div>
  )
}





