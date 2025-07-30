import { useState, useEffect } from "react";

import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

import GitHubSync from "./github-sync";

export default function ComponentSettings({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isVisible, setVisible, chatId } = useComponentContext();
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListedOnMarketplace, setIsListedOnMarketplace] = useState(false);
  const [isCheckingMarketplace, setIsCheckingMarketplace] = useState(true);

  // Check if component is listed on marketplace
  useEffect(() => {
    const checkMarketplaceListing = async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          setIsCheckingMarketplace(false);
          return;
        }

        const { data: marketplaceListing } = await supabase
          .from("marketplace_listings")
          .select("id")
          .eq("chat_id", chatId)
          .eq("seller_id", userData.user.id)
          .eq("is_active", true)
          .single();

        setIsListedOnMarketplace(!!marketplaceListing);
      } catch (error) {
        console.error("Error checking marketplace listing:", error);
      } finally {
        setIsCheckingMarketplace(false);
      }
    };

    if (chatId) {
      checkMarketplaceListing();
    }
  }, [chatId]);
  const handleVisibility = async () => {
    if (isVisibilityLoading || isListedOnMarketplace) return;
    try {
      setIsVisibilityLoading(true);
      await changeVisibilityByChatId(chatId, !isVisible);
      setVisible(!isVisible);
      setIsVisibilityLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let title = "Error";
      let description = "Something went wrong. Please try again.";

      if (error?.message === "payment-required") {
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-auto">
        <SheetTitle className="mb-4">Component Settings</SheetTitle>

        <div className="space-y-6">
          {/* Visibility Settings */}
          <div>
            <h3 className="mb-4 text-base font-semibold">Change visibility</h3>
            <div className="space-y-4">
              <div className="mb-5 flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Private mode</Label>
                  <p className="text-sm text-muted-foreground">
                    When private, the component will not be visible to the
                    public. Components listed on the marketplace must remain
                    private to maintain exclusivity for buyers.
                  </p>
                  {isListedOnMarketplace && (
                    <p className="text-sm text-amber-600">
                      ⚠️ This component is listed on the marketplace and cannot
                      be made public.
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
                            (isListedOnMarketplace && !isVisible)
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    {isListedOnMarketplace && !isVisible && (
                      <TooltipContent>
                        <p>
                          Cannot make public: component is listed on
                          marketplace.
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

          {/* GitHub Sync Settings */}
          <div>
            <GitHubSync closeSheet={() => setIsOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
