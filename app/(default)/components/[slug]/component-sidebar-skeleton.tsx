import { Skeleton } from "@/components/ui/skeleton";

export function ComponentSidebarSkeleton() {
  return (
    <div className="size-full overflow-y-auto">
      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-14 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-10 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-20 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>
      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-14 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-10 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="h-20 w-3/4 rounded-md bg-background" />
        <Skeleton className="h-4 w-1/2 rounded-md bg-background" />
      </div>
    </div>
  );
}
