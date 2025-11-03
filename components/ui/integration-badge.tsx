import { SiFigma } from "@icons-pack/react-simple-icons";
import { Database, Plug2, Mail, CreditCard } from "lucide-react";
import { ReactNode } from "react";

import { IntegrationType } from "@/utils/integrations";

import { Badge } from "./badge";

interface IntegrationBadgeProps {
  type: IntegrationType;
  variant?: "default" | "secondary" | "outline";
  showIcon?: boolean;
}

const integrationConfig: Record<
  IntegrationType,
  { label: string; icon: ReactNode; color: string }
> = {
  [IntegrationType.SUPABASE]: {
    label: "Supabase",
    icon: <Database className="size-3" />,
    color: "text-green-600",
  },
  [IntegrationType.FIGMA]: {
    label: "Figma",
    icon: <SiFigma className="size-3" />,
    color: "text-purple-600",
  },
  [IntegrationType.STRIPE]: {
    label: "Stripe",
    icon: <CreditCard className="size-3" />,
    color: "text-purple-600",
  },
  [IntegrationType.BLOB]: {
    label: "Vercel Blob",
    icon: <Database className="size-3" />,
    color: "text-blue-600",
  },
  [IntegrationType.RESEND]: {
    label: "Resend",
    icon: <Mail className="size-3" />,
    color: "text-orange-600",
  },
  [IntegrationType.AUTH]: {
    label: "Auth",
    icon: <Plug2 className="size-3" />,
    color: "text-indigo-600",
  },
};

export function IntegrationBadge({
  type,
  variant = "secondary",
  showIcon = true,
}: IntegrationBadgeProps) {
  const config = integrationConfig[type];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {showIcon && <span className={config.color}>{config.icon}</span>}
      <span>{config.label}</span>
    </Badge>
  );
}
