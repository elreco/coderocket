import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function POST(req: Request) {
  if (req.method === "POST") {
    // Get the number of versions to purchase (default 1)
    const { quantity = 1 } = await req.json();

    // Calculate the actual number of messages (1 version = 2 messages)
    const messageQuantity = quantity * 2;

    try {
      // Get the user from Supabase auth
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

      // Get or create the customer in Stripe
      const customer = await createOrRetrieveCustomer({
        uuid: user.id,
        email: user.email || "",
      });

      // Fixed price for an additional version (1 dollar = 100 cents)
      const unit_amount = 100;

      // Create a payment session in Stripe
      const session = await stripe.checkout.sessions.create({
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        customer,
        customer_update: {
          address: "auto",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Additional Version",
                description: `Purchase of ${quantity} additional version${quantity > 1 ? "s" : ""}`,
              },
              unit_amount: unit_amount,
            },
            quantity,
          },
        ],
        mode: "payment",
        allow_promotion_codes: true,
        success_url: `https://www.tailwindai.dev/account?extra_messages=${messageQuantity}&versions=${quantity}`,
        cancel_url: `https://www.tailwindai.dev/`,
        metadata: {
          userId: user.id,
          extraMessages: messageQuantity.toString(),
          versions: quantity.toString(),
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
