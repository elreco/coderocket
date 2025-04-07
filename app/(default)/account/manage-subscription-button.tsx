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
      if (error) return console.error((error as Error).message);
    }
  };

  return (
    <div className="flex w-full flex-col items-start justify-between space-x-2 sm:flex-row sm:items-center">
      <Button onClick={redirectToCustomerPortal}>Manage billing</Button>
      <Button onClick={redirectToCustomerPortal}>Upgrade your plan</Button>
    </div>
  );
}
