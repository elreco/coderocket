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
  const [isListedOnMarketplace, setIsListedOnMarketplace] = useState(false);
  const [isCheckingMarketplace, setIsCheckingMarketplace] = useState(true);

  const isPremium = !!subscription;
  const isCheckingPremium = false;

  useEffect(() => {
    const checkMarketplaceListing = async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          setIsCheckingMarketplace(false);
          return;
        }

        const { data: marketplaceListing, error } = await supabase
          .from("marketplace_listings")
          .select("id")
          .eq("chat_id", chatId)
          .eq("seller_id", userData.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking marketplace listing:", error);
        }

        setIsListedOnMarketplace(!!marketplaceListing);
      } catch (error) {
        console.error("Error checking marketplace listing:", error);
        setIsListedOnMarketplace(false);
      } finally {
        setIsCheckingMarketplace(false);
      }
    };

    if (chatId) {
      checkMarketplaceListing();
    }
  }, [chatId]);

  const handleVisibility = async () => {
    if (isVisibilityLoading || isListedOnMarketplace || !isPremium) return;
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
          <div className="mb-5 flex flex-row items-center justify-between rounded-lg bg-background p-4">
            <div className="space-y-0.5">
              <Label>Private mode</Label>
              <p className="text-sm text-muted-foreground">
                When private, the component will not be visible to the public.
                Components listed on the marketplace must remain private to
                maintain exclusivity for buyers.
              </p>
              {!isPremium && (
                <p className="text-sm text-amber-600">
                  ⚠️ Premium subscription required to change component
                  visibility.
                </p>
              )}
              {isListedOnMarketplace && (
                <p className="text-sm text-amber-600">
                  ⚠️ This component is listed on the marketplace and cannot be
                  made public.
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
                        isCheckingMarketplace ||
                        isCheckingPremium ||
                        !isPremium ||
                        (isListedOnMarketplace && !isVisible)
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
                {isListedOnMarketplace && !isVisible && isPremium && (
                  <TooltipContent>
                    <p>
                      Cannot make public: component is listed on marketplace.
                      <br />
                      Remove from marketplace first to make it public.
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
