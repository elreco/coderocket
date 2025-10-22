import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceListing } from "../../actions";

import { EditTemplateForm } from "./edit-template-form";

export default async function ManageListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get the listing
  const template = await getMarketplaceListing(id);
  if (!template) {
    notFound();
  }

  // Verify user owns this listing
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user || userData.user.id !== template.seller_id) {
    redirect("/templates");
  }

  return (
    <Container className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/templates/${id}`} className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Listing
          </Link>
        </Button>
      </div>

      <PageTitle
        title="Edit Template"
        subtitle="Update your component listing details"
      />

      {/* Edit Form */}
      <EditTemplateForm template={template} />
    </Container>
  );
}
