"use client";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import Link from "next/link";

const baseStyles = {
  solid:
    "inline-flex items-center justify-center rounded-lg text-sm font-medium py-[calc(theme(spacing.2)-2.5px)] px-[calc(theme(spacing.3)-1px)] outline-2 outline-offset-2 transition-colors",
  outline:
    "inline-flex bg-white items-center justify-center rounded-lg border py-[calc(theme(spacing.2)-1px)] px-[calc(theme(spacing.3)-1px)] text-sm outline-2 outline-offset-2 transition-colors",
};

const variantStyles = {
  solid: {
    cyan: "relative overflow-hidden bg-cyan-500 text-white before:absolute before:inset-0 active:before:bg-transparent hover:before:bg-white/10 active:bg-cyan-600 active:text-white/80 before:transition-colors",
    white:
      "bg-white text-cyan-900 hover:bg-white/90 active:bg-white/90 active:text-cyan-900/70",
    gray: "bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-800 active:text-white/80",
  },
  outline: {
    gray: "border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-100 active:text-gray-700/80",
  },
};

type VariantKey = keyof typeof variantStyles;
type ColorKey<Variant extends VariantKey> =
  keyof (typeof variantStyles)[Variant];

type ButtonProps<
  Variant extends VariantKey,
  Color extends ColorKey<Variant>,
> = {
  variant?: Variant;
  color?: Color;
  loading?: boolean;
} & (
  | Omit<React.ComponentPropsWithoutRef<typeof Link>, "color">
  | (Omit<React.ComponentPropsWithoutRef<"button">, "color"> & {
      href?: undefined;
    })
);

export function Button<
  Color extends ColorKey<Variant>,
  Variant extends VariantKey = "solid",
>({
  variant,
  color,
  loading,
  className,
  ...props
}: ButtonProps<Variant, Color>) {
  variant = variant ?? ("solid" as Variant);
  color = color ?? ("gray" as Color);

  className = clsx(
    baseStyles[variant],
    variantStyles[variant][color] || "",
    className,
  );

  // Modify rendering logic to handle the loading state
  if (loading) {
    return (
      <button
        className={clsx(
          "flex items-center justify-center bg-gray-700 text-white hover:bg-gray-700 active:bg-gray-700",
          className,
        )}
        disabled={true}
      >
        <ArrowPathIcon className="mr-2 size-4 animate-spin" />{" "}
        <div className="whitespace-nowrap">Loading</div>
      </button>
    );
  }

  return typeof props.href === "undefined" ? (
    <button className={className} {...props} />
  ) : (
    <Link className={className} {...props} />
  );
}
