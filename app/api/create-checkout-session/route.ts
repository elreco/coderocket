import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import { createOrRetrieveCustomer } from "@/utils/supabase-admin";

export async function POST(req: Request) {
  if (req.method === "POST") {
    // 1. Destructure the price and quantity from the POST body
    const { price, quantity = 1, metadata = {} } = await req.json();

    try {
      // 2. Get the user from Supabase auth
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 3. Retrieve or create the customer in Stripe
      const customer = await createOrRetrieveCustomer({
        uuid: user?.id || "",
        email: user?.email || "",
      });

      // 4. Create a checkout session in Stripe
      let session;
      if (price.type === "recurring") {
        session = await stripe.checkout.sessions.create({
          billing_address_collection: "required",
          customer,
          customer_update: {
            address: "auto",
          },
          line_items: [
            {
              price: price.id,
              quantity,
            },
          ],
          mode: "subscription",
          allow_promotion_codes: true,
          subscription_data: {
            trial_settings: {
              end_behavior: {
                missing_payment_method: "cancel",
              },
            },
            metadata,
          },
          success_url: `https://www.tailwindai.dev/account`,
          cancel_url: `https://www.tailwindai.dev/`,
        });
      } else if (price.type === "one_time") {
        session = await stripe.checkout.sessions.create({
          billing_address_collection: "required",
          customer,
          customer_update: {
            address: "auto",
          },
          line_items: [
            {
              price: price.id,
              quantity,
            },
          ],
          mode: "payment",
          allow_promotion_codes: true,
          success_url: `https://www.tailwindai.dev/account?payment-success`,
          cancel_url: `https://www.tailwindai.dev/`,
        });
      }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
