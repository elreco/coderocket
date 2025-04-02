import { Bell } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SidebarNotification({
  title,
  description,
  buttonLink,
  buttonLabel,
}: {
  title: string;
  description: string;
  buttonLink?: string;
  buttonLabel?: string;
}) {
  return (
    <Card className="border border-primary/30 bg-primary/10 shadow-none">
      <form>
        <CardHeader className={buttonLink ? "p-4 pb-0" : "p-4"}>
          <CardTitle className="flex items-center gap-1 text-xs text-primary">
            <Bell className="size-3" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-foreground/75">
            {description}
          </CardDescription>
        </CardHeader>
        {buttonLink && (
          <CardContent className="grid gap-2.5 p-4">
            <Link href={buttonLink}>
              <Button className="w-full text-xs" size="sm">
                {buttonLabel}
              </Button>
            </Link>
          </CardContent>
        )}
      </form>
    </Card>
  );
}
