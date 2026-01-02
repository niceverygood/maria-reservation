'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NotificationSettings {
  notification_enabled: string
  confirm_enabled: string
  cancel_enabled: string
  reject_enabled: string
  reminder_1day_enabled: string
  reminder_1day_time: string
  reminder_today_enabled: string
  reminder_today_time: string
}

interface NotificationLog {
  id: string
  type: string
  channel: string
  recipientPhone: string
  recipientName: string
  status: string
  sentAt: string | null
  createdAt: string
  errorMessage: string | null
}

interface Stats {
  total: number
  sent: number
  failed: number
  pending: number
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings')
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 설정 불러오기
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings()
    } else {
      fetchLogs()
    }
  }, [activeTab, page])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/notifications/settings')
      const data = await res.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications/logs?page=${page}&limit=15`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs)
        setStats(data.stats)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('로그 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const data = await res.json()
      if (data.success) {
        alert('설정이 저장되었습니다.')
      } else {
        alert(data.error || '저장 실패')
      }
    } catch (error) {
      console.error('설정 저장 실패:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestSend = async () => {
    if (!testPhone) {
      alert('전화번호를 입력해주세요.')
      return
    }
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      })
      const data = await res.json()
      setTestResult({ success: data.success, message: data.message || data.error })
    } catch (error) {
      console.error('테스트 발송 실패:', error)
      setTestResult({ success: false, message: '테스트 발송 중 오류가 발생했습니다.' })
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: string) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CONFIRM: '예약 확정',
      CANCEL: '예약 취소',
      REMINDER_1DAY: '1일전 리마인더',
      REMINDER_TODAY: '당일 리마인더',
      STATUS_CHANGE: '상태 변경',
      RESCHEDULE: '예약 변경',
      REJECTED: '예약 거절',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">발송완료</span>
      case 'FAILED':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">발송실패</span>
      case 'PENDING':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">대기중</span>
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{status}</span>
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
    }
    return phone
  }

  if (isLoading && !settings && !logs.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-[#64748B]">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-20 md:pb-0">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">알림 관리</h1>
        <p className="text-[#64748B] mt-1">카카오 알림톡 설정 및 발송 이력</p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-[#0066CC] text-[#0066CC]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          알림 설정
        </button>
        <button
          onClick={() => { setActiveTab('logs'); setPage(1); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-[#0066CC] text-[#0066CC]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          발송 이력
        </button>
      </div>

      {/* 설정 탭 */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* 전체 알림 */}
          <div className="card">
            <h2 className="font-semibold text-[#1E293B] mb-4">🔔 전체 알림</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1E293B]">알림톡 발송</p>
                <p className="text-sm text-[#64748B]">알림톡 발송 기능을 활성화/비활성화 합니다.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notification_enabled === 'true'}
                  onChange={(e) => updateSetting('notification_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066CC]"></div>
              </label>
            </div>
          </div>

          {/* 예약 알림 */}
          <div className="card">
            <h2 className="font-semibold text-[#1E293B] mb-4">📅 예약 알림</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-[#1E293B]">예약 확정 알림</p>
                  <p className="text-sm text-[#64748B]">예약이 확정되면 환자에게 알림 발송</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.confirm_enabled === 'true'}
                    onChange={(e) => updateSetting('confirm_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066CC]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-[#1E293B]">예약 취소 알림</p>
                  <p className="text-sm text-[#64748B]">예약이 취소되면 환자에게 알림 발송</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cancel_enabled === 'true'}
                    onChange={(e) => updateSetting('cancel_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066CC]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-[#1E293B]">예약 거절 알림</p>
                  <p className="text-sm text-[#64748B]">예약이 거절되면 환자에게 알림 발송</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.reject_enabled === 'true'}
                    onChange={(e) => updateSetting('reject_enabled', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066CC]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 리마인더 */}
          <div className="card">
            <h2 className="font-semibold text-[#1E293B] mb-4">⏰ 예약 리마인더</h2>
            <div className="space-y-4">
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-[#1E293B]">1일 전 리마인더</p>
                    <p className="text-sm text-[#64748B]">예약 전날 환자에게 알림 발송</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reminder_1day_enabled === 'true'}
                      onChange={(e) => updateSetting('reminder_1day_enabled', e.target.checked ? 'true' : 'false')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066CC]"></div>
                  </label>
                </div>
                {settings.reminder_1day_enabled === 'true' && (
                  <div className="flex items-center gap-2 ml-0">
                    <span className="text-sm text-[#64748B]">발송 시간:</span>
                    <input
                      type="time"
                      value={settings.reminder_1day_time}
                      onChange={(e) => updateSetting('reminder_1day_time', e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                    />
                  </div>
                )}
              </div>

              <div className="py-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-[#1E293B]">당일 리마인더</p>
                    <p className="text-sm text-[#64748B]">예약 당일 아침 환자에게 알림 발송</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reminder_today_enabled === 'true'}
                      onChange={(e) => updateSetting('reminder_today_enabled', e.target.checked ? 'true' : 'false')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0066CC]"></div>
                  </label>
                </div>
                {settings.reminder_today_enabled === 'true' && (
                  <div className="flex items-center gap-2 ml-0">
                    <span className="text-sm text-[#64748B]">발송 시간:</span>
                    <input
                      type="time"
                      value={settings.reminder_today_time}
                      onChange={(e) => updateSetting('reminder_today_time', e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 테스트 발송 */}
          <div className="card">
            <h2 className="font-semibold text-[#1E293B] mb-4">🧪 테스트 발송</h2>
            <p className="text-sm text-[#64748B] mb-4">알림톡이 정상적으로 발송되는지 테스트합니다.</p>
            <div className="flex gap-3">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01012345678"
                maxLength={11}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
              <button
                onClick={handleTestSend}
                className="px-4 py-2 bg-[#0066CC] text-white text-sm font-medium rounded-lg hover:bg-[#0052A3] transition-colors"
              >
                테스트 발송
              </button>
            </div>
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#0066CC] text-white font-medium rounded-lg hover:bg-[#0052A3] transition-colors disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      )}

      {/* 발송 이력 탭 */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* 통계 */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center">
                <p className="text-2xl font-bold text-[#0066CC]">{stats.total}</p>
                <p className="text-sm text-[#64748B]">전체</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                <p className="text-sm text-[#64748B]">발송완료</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-sm text-[#64748B]">발송실패</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-sm text-[#64748B]">대기중</p>
              </div>
            </div>
          )}

          {/* 로그 테이블 */}
          <div className="card">
            <h2 className="font-semibold text-[#1E293B] mb-4">발송 이력</h2>
            
            {logs.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">유형</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">수신자</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B] hidden sm:table-cell">연락처</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">상태</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-[#64748B]">일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-2 text-sm text-[#1E293B]">{getTypeLabel(log.type)}</td>
                          <td className="py-3 px-2 text-sm text-[#1E293B]">{log.recipientName}</td>
                          <td className="py-3 px-2 text-sm text-[#64748B] hidden sm:table-cell">{formatPhone(log.recipientPhone)}</td>
                          <td className="py-3 px-2">
                            {getStatusBadge(log.status)}
                            {log.errorMessage && (
                              <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm text-[#64748B]">{formatDate(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      이전
                    </button>
                    <span className="px-3 py-1.5 text-sm text-[#64748B]">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-[#64748B]">
                <p>발송 이력이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}







