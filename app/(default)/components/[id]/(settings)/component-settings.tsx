import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ComponentSettingsProps = {
  isVisible: boolean;
  handleVisibility: (checked: boolean) => void;
  selectedTheme: string;
  setTheme: (theme: string) => void;
  themes: string[];
};

export default function ComponentSettings({
  isVisible,
  handleVisibility,
  selectedTheme,
  setTheme,
  themes,
}: ComponentSettingsProps) {
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
              <Switch checked={!isVisible} onCheckedChange={handleVisibility} />
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
                    "aspect-video cursor-pointer rounded-md items-center justify-center border-2 opacity-75 hover:border-2 hover:border-primary hover:opacity-100 overflow-hidden",
                    {
                      "border-primary opacity-100": selectedTheme === theme,
                    },
                  )}
                  onClick={() => setTheme(theme)}
                >
                  <img
                    src={`/daisy-themes/${theme}.png`}
                    alt="Theme"
                    className="size-full scale-110 object-cover"
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
