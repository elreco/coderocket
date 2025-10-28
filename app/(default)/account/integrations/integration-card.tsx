import {
  Database,
  CreditCard,
  Mail,
  Plug2,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IntegrationBadge } from "@/components/ui/integration-badge";
import { IntegrationType, UserIntegration } from "@/utils/integrations";

import { deleteIntegration } from "./actions";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

interface IntegrationCardProps {
  integration: UserIntegration;
  onEdit: (integration: UserIntegration) => void;
  onDelete: () => void;
}

const integrationIcons: Record<IntegrationType, React.ReactNode> = {
  [IntegrationType.SUPABASE]: <Database className="size-8 text-green-600" />,
  [IntegrationType.STRIPE]: <CreditCard className="size-8 text-purple-600" />,
  [IntegrationType.BLOB]: <Database className="size-8 text-blue-600" />,
  [IntegrationType.RESEND]: <Mail className="size-8 text-orange-600" />,
  [IntegrationType.AUTH]: <Plug2 className="size-8 text-indigo-600" />,
};

export function IntegrationCard({
  integration,
  onEdit,
  onDelete,
}: IntegrationCardProps) {
  const [isActive] = useState(integration.is_active);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteConfirm = async () => {
    const result = await deleteIntegration(integration.id);
    if (result.success) {
      onDelete();
    }
  };

  const formattedDate = new Date(integration.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-background p-2">
            {integrationIcons[integration.integration_type]}
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {integration.name}
              {isActive && <CheckCircle className="size-4 text-green-600" />}
            </CardTitle>
            <CardDescription className="mt-1">
              <IntegrationBadge
                type={integration.integration_type}
                showIcon={false}
              />
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <p>Created: {formattedDate}</p>
            <p className="mt-1">
              Status:{" "}
              <span
                className={
                  isActive ? "font-medium text-green-600" : "text-gray-500"
                }
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(integration)}
              className="flex-1"
            >
              <Edit className="mr-2 size-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        integration={integration}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}
