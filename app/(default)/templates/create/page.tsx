import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceCategories } from "../actions";

import { BackButton } from "./back-button";
import { CreateTemplateForm } from "./create-template-form";

export const metadata = {
  title: "Add Template - CodeRocket Templates",
  description:
    "Share your private component as a free or premium template. Earn 70% from premium uses.",
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
        <BackButton />
      </div>

      <PageTitle
        title="Add Template"
        subtitle="Share your private component as a free template or earn 70% from premium uses."
      />

      {/* Form */}
      <CreateTemplateForm categories={categories} />
    </Container>
  );
}
