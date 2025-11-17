import { Loader } from "lucide-react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useComponentContext } from "@/context/component-context";
import { cn } from "@/lib/utils";
import { extractDataTheme, setDataTheme } from "@/utils/completion-parser";
import { themes } from "@/utils/config";

import { updateTheme } from "../actions";

export default function ComponentSettings({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    chatId,
    refreshChatData,
    handleChatFiles,
    completion,
    selectedVersion,
    setCompletion,
  } = useComponentContext();

  const [isSettingLoading, setIsSettingLoading] = useState("");
  const [open, setOpen] = useState(false);

  const setTheme = async (theme: string) => {
    if (isSettingLoading || theme === extractDataTheme(completion)) return;
    setIsSettingLoading(theme);
    const completionWithTheme = setDataTheme(completion, theme);
    await updateTheme(chatId, theme, selectedVersion ?? 0, completionWithTheme);
    if (refreshChatData !== undefined) {
      await refreshChatData();
    }
    handleChatFiles(completionWithTheme);
    setCompletion(completionWithTheme);
    setIsSettingLoading("");
    setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-auto">
        <SheetTitle className="mb-4">Component Theme</SheetTitle>
        <div>
          <h3 className="mb-1 text-base font-semibold">Change theme</h3>
          <h4 className="mb-4 text-sm">
            Current theme:{" "}
            <span className="text-primary">{extractDataTheme(completion)}</span>
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {themes.map((theme) => (
                <div
                  key={theme}
                  className={cn(
                    "border-primary/20 hover:border-primary relative aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 p-1 opacity-75 transition-all duration-300 hover:opacity-100",
                    {
                      "border-primary opacity-100":
                        extractDataTheme(completion) === theme,
                    },
                  )}
                  onClick={() => setTheme(theme)}
                >
                  {isSettingLoading === theme && (
                    <Loader className="text-foreground absolute inset-0 z-10 m-auto size-6 animate-spin opacity-100" />
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
