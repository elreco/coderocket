import { Loader } from "lucide-react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Tables } from "@/types_db";

import { updateTheme } from "../actions";

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
  selectedTheme: string | null | undefined;
  setSelectedTheme: (theme: string) => void;
  chatId: string;
  refreshChatData: () => Promise<Tables<"messages">[] | undefined>;
  handleComponentFiles: (
    _completion: string,
    theme: string | null | undefined,
    isFirstRun?: boolean,
    tabName?: string,
  ) => void;
  completion: string;
  selectedVersion: number;
  children: React.ReactNode;
};

export default function ComponentSettings({
  selectedTheme,
  setSelectedTheme,
  chatId,
  refreshChatData,
  handleComponentFiles,
  completion,
  selectedVersion,
  children,
}: ComponentSettingsProps) {
  const [isSettingLoading, setIsSettingLoading] = useState("");

  const setTheme = async (theme: string) => {
    if (isSettingLoading || theme === selectedTheme) return;
    setIsSettingLoading(theme);
    await updateTheme(chatId, theme, selectedVersion);
    await refreshChatData();
    handleComponentFiles(completion, theme);
    setSelectedTheme(theme);
    setIsSettingLoading("");
  };
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-auto">
        <SheetTitle className="mb-4">Component Theme</SheetTitle>
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
