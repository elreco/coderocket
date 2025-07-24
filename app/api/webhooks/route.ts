import Stripe from "stripe";

import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange,
  updatePaymentRecord,
} from "@/utils/supabase-admin";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "payment_intent.succeeded",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "product.created":
        case "product.updated":
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case "price.created":
        case "price.updated":
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          // eslint-disable-next-line no-case-declarations
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === "customer.subscription.created",
          );
          break;
        case "checkout.session.completed":
          // eslint-disable-next-line no-case-declarations
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === "subscription") {
            const subscriptionId = checkoutSession.subscription;
            await manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true,
            );
          } else if (checkoutSession.mode === "payment") {
            const metadata = checkoutSession.metadata;

            // Handle marketplace purchases
            if (metadata && metadata.type === "marketplace_purchase") {
              const { handleMarketplacePurchase } = await import(
                "@/app/(default)/marketplace/marketplace-purchase-handler"
              );
              const result = await handleMarketplacePurchase(metadata);

              if (!result.success) {
                console.error(
                  "Failed to process marketplace purchase:",
                  result.error,
                );
                // Don't fail the webhook, but log the error
              }
            }
            // Handle extra messages purchases
            else if (metadata && metadata.extraMessages && metadata.userId) {
              const userId = metadata.userId;
              const extraMessages = parseInt(metadata.extraMessages, 10);

              if (extraMessages > 0) {
                // Mettre à jour le compteur de messages supplémentaires dans la base de données
                const supabase = await createClient();

                // Vérifier si l'utilisateur existe déjà dans la table extra_messages
                const { data: existingData } = await supabase
                  .from("extra_messages")
                  .select("*")
                  .eq("user_id", userId)
                  .single();

                if (existingData) {
                  // Mettre à jour le nombre de messages supplémentaires
                  await supabase
                    .from("extra_messages")
                    .update({
                      count: existingData.count + extraMessages,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", userId);
                } else {
                  // Créer une nouvelle entrée
                  await supabase.from("extra_messages").insert({
                    user_id: userId,
                    count: extraMessages,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }
              }
            }
          }
          break;
        case "payment_intent.succeeded":
          await updatePaymentRecord(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      console.log(error);
      return new Response(
        "Webhook handler failed. View your nextjs function logs.",
        {
          status: 400,
        },
      );
    }
  }
  return new Response(JSON.stringify({ received: true }));
}
