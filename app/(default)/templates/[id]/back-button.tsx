"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleBack = () => {
    setIsNavigating(true);
    router.push("/marketplace");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      disabled={isNavigating}
      className="flex items-center gap-2"
    >
      {isNavigating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ArrowLeft className="size-4" />
      )}
      Back to Marketplace
    </Button>
  );
}
