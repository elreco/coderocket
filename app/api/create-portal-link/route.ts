import { stripe } from "@/utils/stripe";
import { buildAccountUrl } from "@/utils/runtime-config";
import { billingEnabled } from "@/utils/server-config";
import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function POST(req: Request) {
  if (!billingEnabled) {
    return new Response(
      JSON.stringify({
        error: {
          statusCode: 404,
          message: "Billing is disabled for this self-hosted instance.",
        },
      }),
      { status: 404 },
    );
  }

  if (req.method === "POST") {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw Error("Could not get user");
      const customer = await createOrRetrieveCustomer({
        uuid: user.id || "",
        email: user.email || "",
      });

      if (!customer) throw Error("Could not get customer");
      const { url } = await stripe.billingPortal.sessions.create({
        customer,
        return_url: buildAccountUrl(),
      });
      return new Response(JSON.stringify({ url }), {
        status: 200,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.log(err);
      return new Response(
        JSON.stringify({ error: { statusCode: 500, message: err.message } }),
        {
          status: 500,
        },
      );
    }
  } else {
    return new Response("Method Not Allowed", {
      headers: { Allow: "POST" },
      status: 405,
    });
  }
}
