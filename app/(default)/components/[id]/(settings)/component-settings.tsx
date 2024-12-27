import { Settings, Loader } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { changeVisibilityByChatId, updateTheme } from "../actions";

const themes = [
  "light",
  "dark",
  "cupcake",
  "retro",
  "sunset",
  "night",
  "winter",
  "cyberpunk",
  "autumn",
  "dracula",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "halloween",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "coffee",
  "acid",
  "lemonade",
  "business",
  "cmyk",
];

type ComponentSettingsProps = {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
  selectedTheme: string | null | undefined;
  setSelectedTheme: (theme: string) => void;
  chatId: string;
  refreshChatData: () => Promise<void>;
  handleComponentFiles: (
    _completion: string,
    theme: string | null | undefined,
    isFirstRun?: boolean,
    tabName?: string,
  ) => void;
  completion: string;
  selectedVersion: number;
};

export default function ComponentSettings({
  isVisible,
  setVisible,
  selectedTheme,
  setSelectedTheme,
  chatId,
  refreshChatData,
  handleComponentFiles,
  completion,
  selectedVersion,
}: ComponentSettingsProps) {
  const [isSettingLoading, setIsSettingLoading] = useState("");
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);
  const handleVisibility = async () => {
    if (isVisibilityLoading || isSettingLoading) return;
    try {
      setIsVisibilityLoading(true);
      await changeVisibilityByChatId(chatId, !isVisible);
      setVisible(!isVisible);
      setIsVisibilityLoading(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Premium account required",
        description:
          "You are not premium, the visibility cannot be changed. Please upgrade to premium and try again.",
        duration: 5000,
      });
    }
  };

  const setTheme = async (theme: string) => {
    if (isSettingLoading || isVisibilityLoading || theme === selectedTheme)
      return;
    setIsSettingLoading(theme);
    await updateTheme(chatId, theme, selectedVersion);
    await refreshChatData();
    handleComponentFiles(completion, theme);
    setSelectedTheme(theme);
    setIsSettingLoading("");
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">
          <Settings className="w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-auto">
        <SheetTitle className="mb-4">Component Settings</SheetTitle>
        <div>
          <h3 className="mb-4 text-base font-semibold">Change visibility</h3>
          <div className="space-y-4">
            <div className="mb-5 flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Private mode</Label>
                <p className="text-sm text-muted-foreground">
                  When private, the component will not be visible to the public.
                </p>
              </div>
              <Switch
                checked={!isVisible}
                onCheckedChange={handleVisibility}
                disabled={isVisibilityLoading}
              />
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-1 text-base font-semibold">Change theme</h3>
          <h4 className="mb-4 text-sm">
            Current theme: <span className="text-primary">{selectedTheme}</span>
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {themes.map((theme) => (
                <div
                  key={theme}
                  className={cn(
                    "relative aspect-video cursor-pointer rounded-md items-center justify-center border-2 opacity-75 hover:border-2 hover:border-primary hover:opacity-100 overflow-hidden",
                    {
                      "border-primary opacity-100": selectedTheme === theme,
                    },
                  )}
                  onClick={() => setTheme(theme)}
                >
                  {isSettingLoading === theme && (
                    <Loader className="absolute inset-0 z-10 m-auto size-6 animate-spin text-foreground opacity-100" />
                  )}
                  <img
                    src={`/daisy-themes/${theme}.png`}
                    alt="Theme"
                    className={cn("size-full scale-110 object-cover", {
                      "opacity-50": isSettingLoading === theme,
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
