'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        router.push('/admin/dashboard')
      } else {
        setError(data.error || '로그인에 실패했습니다.')
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F4FD] via-white to-[#F0FDF4] p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-[#0066CC] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">일산마리아병원</h1>
          <p className="text-[#64748B] mt-1">예약 관리 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <div className="card shadow-lg">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6 text-center">
            직원 로그인
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                이메일
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="example@maria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                비밀번호
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </span>
              ) : '로그인'}
            </button>
          </form>

          {/* 개발용 안내 */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-[#64748B] text-center">
              테스트 계정<br />
              관리자: admin@maria.com / admin123<br />
              직원: staff@maria.com / staff123
            </p>
          </div>
        </div>

        {/* 환자용 링크 */}
        <p className="text-center mt-6 text-sm text-[#64748B]">
          환자 예약은{' '}
          <a href="/" className="text-[#0066CC] hover:underline">
            여기
          </a>
          에서 진행해주세요.
        </p>
      </div>
    </div>
  )
}
