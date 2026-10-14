import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md bg-bg-hover", className)} />;
}

/**
 * Loading state that mirrors the dashboard's real layout. A layout-shaped
 * skeleton tells the user what is arriving; a centred spinner tells them
 * nothing and makes the wait feel longer.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sheen rounded-card border border-border bg-bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="sheen rounded-card border border-border bg-bg-card p-5 xl:col-span-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-5 h-[260px] w-full rounded-lg" />
        </div>
        <div className="sheen rounded-card border border-border bg-bg-card p-5">
          <Skeleton className="h-4 w-28" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
