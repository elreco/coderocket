import { useState, useEffect } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComponentContext } from "@/context/component-context";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

import { changeVisibilityByChatId } from "../actions";

export default function SettingsContent() {
  const { isVisible, setVisible, chatId, subscription } = useComponentContext();
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);

  const isPremium = !!subscription;
  const isCheckingPremium = false;

  const handleVisibility = async () => {
    if (isVisibilityLoading || !isPremium) return;
    try {
      setIsVisibilityLoading(true);
      await changeVisibilityByChatId(chatId, !isVisible);
      setVisible(!isVisible);
      setIsVisibilityLoading(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let title = "Error";
      let description = "Something went wrong. Please try again.";

      if (errorMessage === "payment-required") {
        title = "Premium account required";
        description =
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.";
      }

      toast({
        variant: "destructive",
        title,
        description,
        duration: 5000,
      });
      setIsVisibilityLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-3">
      <div>
        <h4 className="mb-4 text-base font-semibold">Change visibility</h4>
        <div className="space-y-4">
          <div className="bg-background mb-5 flex flex-row items-center justify-between rounded-lg p-4">
            <div className="space-y-0.5">
              <Label>Private mode</Label>
              <p className="text-muted-foreground text-sm">
                When private, the component will not be visible to the public.
              </p>
              {!isPremium && (
                <p className="text-sm text-amber-600">
                  ⚠️ Premium subscription required to change component
                  visibility.
                </p>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={!isVisible}
                      onCheckedChange={handleVisibility}
                      disabled={
                        isVisibilityLoading ||
                        isCheckingPremium ||
                        !isPremium
                      }
                    />
                  </div>
                </TooltipTrigger>
                {!isPremium && (
                  <TooltipContent>
                    <p>
                      Premium subscription required to change component
                      visibility.
                      <br />
                      Upgrade to premium to make your components private.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
