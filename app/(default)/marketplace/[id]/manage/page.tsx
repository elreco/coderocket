import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

import { getMarketplaceListing } from "../../actions";

import { EditListingForm } from "./edit-listing-form";

export default async function ManageListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get the listing
  const listing = await getMarketplaceListing(id);
  if (!listing) {
    notFound();
  }

  // Verify user owns this listing
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user || userData.user.id !== listing.seller_id) {
    redirect("/marketplace");
  }

  return (
    <Container className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/marketplace/${id}`} className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Listing
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Listing</h1>
        <p className="mt-2 text-muted-foreground">
          Update your component listing details
        </p>
      </div>

      {/* Edit Form */}
      <EditListingForm listing={listing} />
    </Container>
  );
}
