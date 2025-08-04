import { redirect } from "next/navigation";

import { getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceCategories } from "../actions";

import { BackButton } from "./back-button";
import { CreateListingForm } from "./create-listing-form";

export const metadata = {
  title: "Create Listing - CodeRocket Marketplace",
  description:
    "List your private component on the marketplace and earn money from sales.",
};

async function checkUserAccess() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Check if user has premium subscription
  const subscription = await getSubscription();
  if (!subscription) {
    redirect("/pricing?reason=marketplace-create");
  }

  return userData.user;
}

export default async function CreateListingPage() {
  await checkUserAccess();
  const categories = await getMarketplaceCategories();

  return (
    <Container className="pr-2 sm:pr-11">
      {/* Breadcrumb */}
      <div className="mb-6">
        <BackButton />
      </div>

      <PageTitle
        title="Create Listing"
        subtitle="List your private component on the marketplace and earn 70% from each sale."
      />

      {/* Form */}
      <CreateListingForm categories={categories} />
    </Container>
  );
}
