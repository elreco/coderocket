import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function POST(req: Request) {
  if (req.method === "POST") {
    // Get the quantity of messages to purchase (default 1)
    const { quantity = 1 } = await req.json();

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

      // Fixed price for an additional message (2 dollars = 200 cents)
      const unit_amount = 200;

      // Create a payment session in Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
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
                name: "Additional Message",
                description: `Purchase of ${quantity} additional message${quantity > 1 ? "s" : ""}`,
              },
              unit_amount: unit_amount,
            },
            quantity,
          },
        ],
        mode: "payment",
        allow_promotion_codes: true,
        success_url: `https://www.tailwindai.dev/account?extra_messages=${quantity}`,
        cancel_url: `https://www.tailwindai.dev/`,
        metadata: {
          userId: user.id,
          extraMessages: quantity.toString(),
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
