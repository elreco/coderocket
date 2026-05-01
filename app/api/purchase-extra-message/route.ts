import { stripe } from "@/utils/stripe";
import { buildAccountUrl, buildAppUrl } from "@/utils/runtime-config";
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
    const { quantity = 1 } = await req.json();

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(
          JSON.stringify({
            error: { statusCode: 401, message: "Not authenticated" },
          }),
          { status: 401 },
        );
      }

      const customer = await createOrRetrieveCustomer({
        uuid: user.id,
        email: user.email || "",
      });

      const unit_amount = 100;

      const session = await stripe.checkout.sessions.create({
        tax_id_collection: { enabled: true },
        billing_address_collection: "required",
        customer,
        customer_update: {
          name: "auto",
          address: "auto",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Additional Rockets",
                description: `Purchase of ${quantity} Extra Rocket${quantity > 1 ? "s" : ""} (1 generation each)`,
              },
              unit_amount: unit_amount,
            },
            quantity,
          },
        ],
        mode: "payment",
        allow_promotion_codes: true,
        success_url: `${buildAccountUrl()}?rockets=${quantity}`,
        cancel_url: buildAppUrl("/"),
        metadata: {
          userId: user.id,
          rockets: quantity.toString(),
        },
      });

      if (session) {
        return new Response(JSON.stringify({ sessionUrl: session.url }), {
          status: 200,
        });
      } else {
        return new Response(
          JSON.stringify({
            error: { statusCode: 500, message: "Session is not defined" },
          }),
          { status: 500 },
        );
      }
    } catch (err: unknown) {
      console.log(err);
      return new Response(JSON.stringify(err), { status: 500 });
    }
  } else {
    return new Response("Method Not Allowed", {
      headers: { Allow: "POST" },
      status: 405,
    });
  }
}
