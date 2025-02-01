"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { postData } from "@/utils/helpers";

export default function ManageSubscriptionButton() {
  const router = useRouter();
  const redirectToCustomerPortal = async () => {
    try {
      const { url } = await postData({
        url: "/api/create-portal-link",
      });
      router.push(url);
    } catch (error) {
      if (error) return alert((error as Error).message);
    }
  };

  return (
    <div className="flex w-full flex-col items-start justify-between sm:flex-row sm:items-center">
      <Button onClick={redirectToCustomerPortal}>Upgrade your plan</Button>
    </div>
  );
}
