import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceCategories } from "../actions";

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

  return userData.user;
}

export default async function CreateListingPage() {
  await checkUserAccess();
  const categories = await getMarketplaceCategories();

  return (
    <Container className="pr-2 sm:pr-11">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketplace" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Marketplace
          </Link>
        </Button>
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
