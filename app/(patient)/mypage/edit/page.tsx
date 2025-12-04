'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientInfo {
  patientId: string
  name: string
  birthDate: string
  phone: string
  kakaoId?: string
}

export default function EditProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phone: ''
  })
  const [originalData, setOriginalData] = useState<PatientInfo | null>(null)

  // 로그인 상태 확인 및 환자 정보 로드
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (!data.success) {
          router.push('/login?redirect=/mypage/edit')
          return
        }
        
        setOriginalData(data.patient)
        setFormData({
          name: data.patient.name || '',
          birthDate: data.patient.birthDate || '',
          phone: data.patient.phone || ''
        })
      } catch {
        router.push('/login?redirect=/mypage/edit')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.name.length < 2) {
      setError('이름은 2자 이상 입력해주세요.')
      return
    }
    if (formData.birthDate.length !== 8) {
      setError('생년월일을 8자리로 입력해주세요.')
      return
    }
    if (formData.phone.length < 10) {
      setError('휴대폰 번호를 올바르게 입력해주세요.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/mypage')
        }, 1500)
      } else {
        setError(data.error || '저장에 실패했습니다.')
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#E8F4FD] to-white">
        <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FD] to-white">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <Link href="/mypage" className="mr-4">
            <svg className="w-6 h-6 text-[#1E293B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-[#1E293B]">프로필 수정</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit}>
          <div className="card">
            {/* 프로필 아이콘 */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto bg-[#0066CC] rounded-full flex items-center justify-center">
                <span className="text-3xl text-white font-bold">
                  {formData.name?.charAt(0) || '?'}
                </span>
              </div>
              {originalData?.kakaoId && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FEE500">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.31 4.69 6.74l-.97 3.6c-.05.19.01.39.16.5.09.07.2.1.31.1.08 0 .16-.02.24-.06l4.25-2.83c.44.04.88.06 1.32.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  <span className="text-xs text-[#64748B]">카카오 계정 연동됨</span>
                </div>
              )}
            </div>

            {/* 에러/성공 메시지 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">저장되었습니다! 마이페이지로 이동합니다...</p>
              </div>
            )}

            {/* 입력 필드 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

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
                />
                <p className="text-xs text-[#64748B] mt-1">-없이 숫자만 입력</p>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="mt-6 flex gap-3">
            <Link href="/mypage" className="btn-secondary flex-1 text-center">
              취소
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex-1"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  저장 중...
                </span>
              ) : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

