import { format } from "date-fns";
import { Check, XIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode, Suspense } from "react";

import { getUserDetails, getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  getMaxMessagesPerPeriod,
  TRIAL_PLAN_MESSAGES_PER_MONTH,
  getExtraMessagesCount,
  PRO_PLAN_MESSAGES_PER_PERIOD,
  STARTER_PLAN_MESSAGES_PER_PERIOD,
} from "@/utils/config";
import { formatToTimestamp } from "@/utils/date";
import { createClient } from "@/utils/supabase/server";

import { getUser, updateEmail, updateName } from "./actions";
import { BuyExtraMessages } from "./components/buy-extra-messages";
import ManageSubscriptionButton from "./manage-subscription-button";
import UnsubscribeSurveyDialog from "./unsubscribe-survey-dialog";

// Définir l'action du formulaire comme une fonction serveur
async function handleUserInfoUpdate(formData: FormData) {
  "use server";

  try {
    await Promise.all([updateName(formData), updateEmail(formData)]);
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
}

export const metadata = {
  title: `My Account - Tailwind AI`,
  description: "Manage your account and billing.",
};

export default async function Account() {
  const [userData, userDetails, subscription] = await Promise.all([
    getUser(),
    getUserDetails(),
    getSubscription(),
  ]);

  const user = userData.data.user;
  const supabase = await createClient();

  // Calculer l'utilisation et la date de réinitialisation
  let usage = 0;
  let resetDate = null;
  let maxMessages = 0;
  let extraMessages = 0;

  if (user) {
    // Récupérer le nombre de messages supplémentaires
    extraMessages = await getExtraMessagesCount(user.id);

    if (subscription) {
      const currentPeriodStart = new Date(subscription.current_period_start);
      const { count } = await supabase
        .from("messages")
        .select("*, chats!inner(*)", { count: "exact", head: true })
        .eq("chats.user_id", user.id)
        .gte("created_at", formatToTimestamp(currentPeriodStart));

      usage = count || 0;
      maxMessages = getMaxMessagesPerPeriod(subscription);
      resetDate = new Date(subscription.current_period_end);
    } else {
      // Utiliser le premier jour du mois en cours comme période de départ
      const today = new Date();
      const currentPeriodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      // Vérifier la limite mensuelle pour les utilisateurs gratuits
      const { count } = await supabase
        .from("messages")
        .select("*, chats!inner(*)", { count: "exact", head: true })
        .eq("chats.user_id", user.id)
        .gte("created_at", formatToTimestamp(currentPeriodStart));

      usage = count || 0;
      maxMessages = TRIAL_PLAN_MESSAGES_PER_MONTH;
      // Définir la date de réinitialisation au premier jour du mois prochain
      resetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }
  }

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: subscription?.prices?.currency ?? "USD",
      minimumFractionDigits: 0,
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  return (
    <Container>
      <PageTitle
        title="My Account"
        subtitle="Manage your account and billing."
      />
      <div className="mb-4 grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Card
          title="Your Plan"
          description={
            subscription
              ? `You are currently on the ${subscription?.prices?.products?.name} plan.`
              : "You are not currently subscribed to any plan."
          }
          footer={
            <div className="flex items-center gap-4">
              {subscription ? (
                <ManageSubscriptionButton />
              ) : (
                <Button asChild>
                  <Link href="/pricing">Choose your plan</Link>
                </Button>
              )}
              {subscription && <UnsubscribeSurveyDialog />}
            </div>
          }
        >
          <div className="my-8 text-xl font-medium text-primary">
            <div className="flex flex-col items-center gap-2">
              <p className="text-2xl text-amber-500">
                {subscription
                  ? `${subscriptionPrice}/${subscription?.prices?.interval}`
                  : "Free plan"}
              </p>
              {!subscription && <Link href="/pricing">Choose your plan</Link>}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Plan Features:</h4>
            <ul className="space-y-2">
              {subscription ? (
                <>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    {subscription?.prices?.products?.name === "Starter"
                      ? STARTER_PLAN_MESSAGES_PER_PERIOD
                      : PRO_PLAN_MESSAGES_PER_PERIOD}{" "}
                    messages per month
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    Generate with Image
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    Improve prompt
                  </li>
                  {subscription?.prices?.products?.name === "Pro" && (
                    <>
                      <li className="flex items-center text-sm">
                        <Check className="mr-2 size-4 text-emerald-500" />
                        AI Full Power
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="mr-2 size-4 text-emerald-500" />
                        Extended support
                      </li>
                    </>
                  )}
                </>
              ) : (
                <>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    {
                      TRIAL_PLAN_MESSAGES_PER_MONTH
                    } messages per month
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="mr-2 size-4 text-border" />
                    Improve prompt
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="mr-2 size-4 text-border" />
                    Generate with Image
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="mr-2 size-4 text-border" />
                    AI Full Power
                  </li>
                </>
              )}
            </ul>
          </div>
        </Card>

        <Card
          title="Your Information"
          description="Manage your personal information and account settings."
          footer={
            <div className="flex w-full flex-col items-start justify-between sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">
                Email changes require verification.
              </p>
              <Suspense fallback={<Button loading></Button>}>
                <Button type="submit" form="userInfoForm">
                  Update Information
                </Button>
              </Suspense>
            </div>
          }
        >
          <form
            id="userInfoForm"
            action={handleUserInfoUpdate}
            className="mb-4 mt-8 space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                className="bg-background"
                name="name"
                defaultValue={userDetails?.full_name ?? ""}
                placeholder="Your name"
                maxLength={64}
              />
              <p className="text-sm text-muted-foreground">
                64 characters maximum
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                name="email"
                defaultValue={user ? user.email : ""}
                placeholder="Your email"
                maxLength={64}
                className="bg-background"
              />
            </div>
          </form>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-x-4 pb-10 md:grid-cols-2">
        {/* Composant pour acheter des messages supplémentaires */}
        <Card
          title="Usage"
          description={"Tracking your usage for the current month"}
        >
          <div className="mb-4 mt-8 space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Messages used
                </span>
                <span className="font-medium">
                  {usage} / {maxMessages}
                </span>
              </div>

              <Progress value={(usage / maxMessages) * 100} />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Reset date
                </span>
                <span className="font-medium">
                  {resetDate ? format(resetDate, "d MMMM yyyy") : "N/A"}
                </span>
              </div>

              {extraMessages > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Extra messages available
                  </span>
                  <span className="font-medium text-emerald-500">
                    {extraMessages}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
        <Suspense fallback={<div>Loading...</div>}>
          <BuyExtraMessages />
        </Suspense>
      </div>
    </Container>
  );
}

interface Props {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

function Card({ title, description, footer, children }: Props) {
  return (
    <div className="flex size-full flex-col rounded-md border bg-card">
      <div className="grow px-5 py-4">
        <h3 className="mb-1 text-2xl font-medium">{title}</h3>
        <p>{description}</p>
        {children}
      </div>
      {footer && (
        <div className="mt-auto flex w-full items-center justify-between rounded-b-md border-t p-4">
          {footer}
        </div>
      )}
    </div>
  );
}
