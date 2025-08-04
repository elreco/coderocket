import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    // Verify this is a cron request (you might want to add authentication)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const supabase = await createClient();

    // Update pending earnings to available after 7 days
    const { data, error } = await supabase.rpc(
      "update_pending_earnings_to_available",
    );

    if (error) {
      console.error("Failed to update earnings:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update earnings" }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount: data || 0,
        message: `Updated ${data || 0} earnings from pending to available`,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Cron job error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}

// Also allow POST for manual triggers
export async function POST(req: Request) {
  return GET(req);
}
