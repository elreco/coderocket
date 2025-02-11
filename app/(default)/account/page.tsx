import { format } from "date-fns";
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
  MAX_GENERATIONS,
  MAX_ITERATIONS,
} from "@/utils/config";
import { formatToTimestamp } from "@/utils/date";
import { createClient } from "@/utils/supabase/server";

import { getUser, updateEmail, updateName } from "./actions";
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
  let totalComponents = 0;
  let resetDate = null;
  let maxMessages = 0;
  let maxGenerations = 0;

  if (user) {
    // Compter le nombre de composants (chats) générés
    const { count: componentsCount } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    totalComponents = componentsCount || 0;

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
      // Pour les utilisateurs gratuits
      maxMessages = MAX_ITERATIONS;
      maxGenerations = MAX_GENERATIONS;
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
      <div className="flex flex-col gap-4 pb-10">
        <Card
          title="Your Plan"
          description={
            subscription
              ? `You are currently on the ${subscription?.prices?.products?.name} plan.`
              : "You are not currently subscribed to any plan."
          }
          footer={
            <div className="flex items-center gap-4">
              <ManageSubscriptionButton />
              {subscription && <UnsubscribeSurveyDialog />}
            </div>
          }
        >
          <div className="mb-4 mt-8 h-16 text-xl font-medium text-primary">
            {subscription ? (
              `${subscriptionPrice}/${subscription?.prices?.interval}`
            ) : (
              <Link href="/pricing">Choose your plan</Link>
            )}
          </div>
        </Card>

        {!subscription ? (
          <Card title="Usage" description="Tracking your usage limits">
            <div className="mb-4 mt-8 space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Components generated
                  </span>
                  <span className="font-medium">
                    {totalComponents} / {maxGenerations} components
                  </span>
                </div>

                <Progress value={(totalComponents / maxGenerations) * 100} />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Free plan limits
                  </span>
                  <span className="font-medium">
                    {maxGenerations} components / {maxMessages} versions per
                    component
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card
            title="Usage"
            description="Tracking your usage for the current period"
          >
            <div className="mb-4 mt-8 space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Components used
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
              </div>
            </div>
          </Card>
        )}

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
    <div className="w-full rounded-md border bg-card">
      <div className="px-5 py-4">
        <h3 className="mb-1 text-2xl font-medium">{title}</h3>
        <p>{description}</p>
        {children}
      </div>
      {footer && (
        <div className="flex h-20 w-full items-center justify-between rounded-b-md border-t p-4 ">
          {footer}
        </div>
      )}
    </div>
  );
}
