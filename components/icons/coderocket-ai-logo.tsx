import { forwardRef, type SVGProps } from "react";

import { cn } from "@/lib/utils";

export const CoderocketAILogo = forwardRef<
  SVGSVGElement,
  SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 34"
      role="img"
      aria-label="CodeRocket AI Logo"
      className={cn("size-4 shrink-0 fill-current", className)}
      {...props}
    >
      <g transform="translate(0, 0) rotate(0)" id="logogram">
        <path
          fill="currentColor"
          d="M15.4992 0H36.5808L21.0816 22.9729H0L15.4992 0Z"
        />
        <path
          fill="currentColor"
          d="M16.4224 25.102L10.4192 34H32.5008L48 11.0271H31.7024L22.2064 25.102H16.4224Z"
        />
      </g>
    </svg>
  );
});

CoderocketAILogo.displayName = "CoderocketAILogo";
