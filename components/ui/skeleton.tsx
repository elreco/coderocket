import clsx from "clsx";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("bg-primary/10 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
