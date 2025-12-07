'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PatientInfo {
  id: string
  name: string
  kakaoProfile: string | null
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    birthDate: '',
    phone: '',
  })

  // 현재 사용자 정보 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (!data.success) {
          router.push('/login')
          return
        }

        if (data.isProfileComplete) {
          router.push('/reserve')
          return
        }

        setPatient(data.patient)
      } catch {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (data.success) {
        router.push('/reserve')
      } else {
        setError(data.error || '정보 저장에 실패했습니다.')
      }
    } catch {
      setError('정보 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 animate-fade-in">
      <div className="max-w-md mx-auto">
        {/* 프로필 이미지 */}
        <div className="text-center mb-6">
          {patient?.kakaoProfile ? (
            <img
              src={patient.kakaoProfile}
              alt="프로필"
              className="w-20 h-20 mx-auto rounded-full border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 mx-auto bg-[#0066CC] rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <h2 className="mt-4 text-xl font-bold text-[#1E293B]">
            {patient?.name}님, 환영합니다!
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            예약을 위해 추가 정보를 입력해주세요.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                생년월일 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="19900101"
                maxLength={8}
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value.replace(/\D/g, '') })}
                required
              />
              <p className="text-xs text-[#64748B] mt-1">숫자 8자리 (예: 19900101)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="01012345678"
                maxLength={11}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                required
              />
              <p className="text-xs text-[#64748B] mt-1">-없이 숫자만 입력</p>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-6"
            disabled={isSaving || formData.birthDate.length !== 8 || formData.phone.length < 10}
          >
            {isSaving ? '저장 중...' : '완료하고 예약하기'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-[#94A3B8]">
          입력하신 정보는 예약 확인 및 안내에만 사용됩니다.
        </p>
      </div>
    </div>
  )
}


