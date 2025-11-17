import { Skeleton } from "@/components/ui/skeleton";

export function ComponentSidebarSkeleton() {
  return (
    <div className="size-full overflow-y-auto">
      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-6 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-14 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-10 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-20 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>
      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-6 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-14 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-10 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>

      <div className="mb-8 w-full space-y-2">
        <Skeleton className="bg-background h-20 w-3/4 rounded-md" />
        <Skeleton className="bg-background h-4 w-1/2 rounded-md" />
      </div>
    </div>
  );
}
