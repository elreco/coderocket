import clsx from "clsx";

export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx(
        "size-full min-h-full px-4 pb-12 pt-20 font-normal sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
