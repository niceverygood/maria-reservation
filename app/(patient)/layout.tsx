import BottomNav from '@/components/patient/BottomNav'

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F5F9F8]">
      {/* 메인 콘텐츠 */}
      <main className="max-w-lg mx-auto">
        {children}
      </main>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  )
}
