import clsx from "clsx";

export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx(
        "size-full min-h-full p-2 pt-10 sm:pl-11 sm:pt-2",
        className,
      )}
      {...props}
    />
  );
}
