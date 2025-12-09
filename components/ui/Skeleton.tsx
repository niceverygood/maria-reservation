'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  )
}

// 카드 스켈레톤
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('card', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  )
}

// 테이블 행 스켈레톤
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="py-3 px-2">
          <Skeleton className="h-4 w-16" />
        </td>
      ))}
    </tr>
  )
}

// 예약 카드 스켈레톤
export function AppointmentCardSkeleton() {
  return (
    <div className="p-4 bg-gray-50 rounded-xl animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div>
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-40 mt-2" />
    </div>
  )
}

// 통계 카드 스켈레톤
export function StatCardSkeleton() {
  return (
    <div className="card text-center animate-pulse">
      <Skeleton className="h-8 w-12 mx-auto mb-2" />
      <Skeleton className="h-4 w-16 mx-auto" />
    </div>
  )
}

// 캘린더 스켈레톤
export function CalendarSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array(7).fill(0).map((_, i) => (
          <Skeleton key={`day-${i}`} className="h-6 w-6 mx-auto" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {Array(35).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// 폼 스켈레톤
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="card space-y-4 animate-pulse">
      {Array(fields).fill(0).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-lg mt-4" />
    </div>
  )
}

// 리스트 스켈레톤
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array(items).fill(0).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// 전체 페이지 로딩 스켈레톤
export function PageSkeleton() {
  return (
    <div className="animate-pulse p-5">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array(4).fill(0).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <ListSkeleton items={5} />
    </div>
  )
}




