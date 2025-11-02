import { redirect } from "next/navigation";

import SupabaseProjectSelector from "./supabase-project-selector";

interface Project {
  id: string;
  name: string;
  region: string;
  organization_id: string;
  status: string;
}

export default async function SupabaseSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const params = await searchParams;
  const dataParam = params.data;

  if (!dataParam) {
    redirect("/account/integrations?error=invalid_data");
  }

  try {
    const tempData = JSON.parse(Buffer.from(dataParam, "base64url").toString());

    if (!tempData.projects || !tempData.access_token || !tempData.userId) {
      redirect("/account/integrations?error=invalid_data");
    }

    if (Date.now() - tempData.timestamp > 5 * 60 * 1000) {
      redirect("/account/integrations?error=expired");
    }

    return (
      <div className="container mx-auto max-w-2xl py-10">
        <SupabaseProjectSelector
          projects={tempData.projects}
          accessToken={tempData.access_token}
          userId={tempData.userId}
        />
      </div>
    );
  } catch (error) {
    console.error("Error parsing data:", error);
    redirect("/account/integrations?error=invalid_data");
  }
}
