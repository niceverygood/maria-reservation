'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '@/lib/firebase'

interface PhoneVerificationProps {
  phone: string
  onPhoneChange: (phone: string) => void
  onVerified: (verified: boolean) => void
  disabled?: boolean
}

export default function PhoneVerification({
  phone,
  onPhoneChange,
  onVerified,
  disabled = false,
}: PhoneVerificationProps) {
  const [step, setStep] = useState<'input' | 'verify' | 'verified'>('input')
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  // reCAPTCHA 초기화
  const initRecaptcha = useCallback(() => {
    if (recaptchaRef.current) return

    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA 성공
        },
        'expired-callback': () => {
          setError('보안 인증이 만료되었습니다. 다시 시도해주세요.')
          recaptchaRef.current = null
        },
      })
    } catch (err) {
      console.error('reCAPTCHA 초기화 오류:', err)
    }
  }, [])

  useEffect(() => {
    initRecaptcha()
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear()
        recaptchaRef.current = null
      }
    }
  }, [initRecaptcha])

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 전화번호 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onPhoneChange(formatted)
    // 전화번호 변경 시 인증 초기화
    if (step !== 'input') {
      setStep('input')
      onVerified(false)
    }
  }

  // 인증번호 발송
  const sendVerificationCode = async () => {
    const phoneNumber = phone.replace(/-/g, '')
    if (phoneNumber.length < 10) {
      setError('올바른 전화번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 한국 국가코드 추가
      const formattedPhone = `+82${phoneNumber.slice(1)}`

      if (!recaptchaRef.current) {
        initRecaptcha()
      }

      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current!)
      setConfirmationResult(result)
      setStep('verify')
      setCountdown(180) // 3분 타이머
    } catch (err: unknown) {
      console.error('인증번호 발송 오류:', err)
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/too-many-requests') {
        setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
      } else if (firebaseError.code === 'auth/invalid-phone-number') {
        setError('유효하지 않은 전화번호입니다.')
      } else {
        setError('인증번호 발송에 실패했습니다. 다시 시도해주세요.')
      }
      // reCAPTCHA 리셋
      recaptchaRef.current = null
      initRecaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  // 인증번호 확인
  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.')
      return
    }

    if (!confirmationResult) {
      setError('인증 세션이 만료되었습니다. 다시 시도해주세요.')
      setStep('input')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await confirmationResult.confirm(verificationCode)
      setStep('verified')
      onVerified(true)
    } catch (err: unknown) {
      console.error('인증 확인 오류:', err)
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/invalid-verification-code') {
        setError('인증번호가 올바르지 않습니다.')
      } else if (firebaseError.code === 'auth/code-expired') {
        setError('인증번호가 만료되었습니다. 다시 발송해주세요.')
        setStep('input')
      } else {
        setError('인증에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 재발송
  const resendCode = () => {
    setVerificationCode('')
    setStep('input')
    recaptchaRef.current = null
    initRecaptcha()
    sendVerificationCode()
  }

  return (
    <div className="space-y-3">
      {/* 전화번호 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          전화번호 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            disabled={disabled || step === 'verified'}
            className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors ${
              step === 'verified'
                ? 'bg-green-50 border-green-300'
                : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            maxLength={13}
          />
          {step === 'input' && (
            <button
              type="button"
              onClick={sendVerificationCode}
              disabled={isLoading || disabled || phone.replace(/-/g, '').length < 10}
              className="px-4 py-3 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isLoading ? '발송중...' : '인증요청'}
            </button>
          )}
          {step === 'verified' && (
            <div className="px-4 py-3 bg-green-500 text-white rounded-xl font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              인증완료
            </div>
          )}
        </div>
      </div>

      {/* 인증번호 입력 */}
      {step === 'verify' && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            인증번호 (6자리)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="numeric"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="인증번호 6자리 입력"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                maxLength={6}
              />
              {countdown > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-pink-500 font-medium">
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={verifyCode}
              disabled={isLoading || verificationCode.length !== 6}
              className="px-4 py-3 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isLoading ? '확인중...' : '확인'}
            </button>
          </div>
          <button
            type="button"
            onClick={resendCode}
            disabled={isLoading}
            className="mt-2 text-sm text-gray-500 hover:text-pink-500"
          >
            인증번호 재발송
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-sm text-red-500 animate-shake">{error}</p>
      )}

      {/* reCAPTCHA 컨테이너 (invisible) */}
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
    </div>
  )
}

