import { cn } from '../../lib/cn';

/** Placeholder block shown while data loads. Only pulses when the user allows motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-md bg-slate-200/80 motion-safe:animate-pulse', className)} />;
}

export function StudentCardSkeleton() {
  return (
    <div className="card space-y-4 p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="card space-y-4 p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

/** Announces loading state to assistive tech while the visual skeletons render. */
export function LoadingGrid({ count = 6, label = 'Loading…', columns = 'sm:grid-cols-2 xl:grid-cols-3' }: { count?: number; label?: string; columns?: string }) {
  return (
    <div role="status" aria-label={label} className={cn('grid grid-cols-1 gap-4', columns)}>
      {Array.from({ length: count }, (_, i) => (
        <StudentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LoadingList({ count = 3, label = 'Loading…' }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  );
}
