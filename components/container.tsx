import { cn } from "@/lib/utils";

export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "size-full min-h-full overflow-x-hidden p-2 pt-10 sm:px-11 sm:pt-2",
        className,
      )}
      {...props}
    />
  );
}
