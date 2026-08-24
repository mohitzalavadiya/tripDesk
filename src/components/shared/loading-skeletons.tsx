import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-6 py-3 flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border px-6">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="py-4 flex gap-4 items-center">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="h-[200px] flex items-end justify-between gap-2 pt-6">
        {(() => {
          const heights = [40, 65, 30, 85, 50, 75, 45, 90, 60, 25, 70, 35]
          return Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-full rounded-t"
              style={{ height: `${heights[i % heights.length]}%` }}
            />
          ))
        })()}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <ChartSkeleton />
          <TableSkeleton />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
