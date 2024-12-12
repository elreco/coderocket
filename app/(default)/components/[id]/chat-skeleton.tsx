import { Skeleton } from "@/components/ui/skeleton";

export default function ChatSkeleton() {
  return (
    <div className="flex w-full flex-col space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[75px] rounded-lg" />
            <Skeleton className="h-[75px] rounded-lg" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}
