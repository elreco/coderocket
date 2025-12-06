import { format } from "date-fns";
import { Check, XIcon, Plug2 } from "lucide-react";
import Link from "next/link";
import { ReactNode, Suspense } from "react";

import { getExtraMessagesCount } from "@/app/(default)/components/actions";
import { getUserDetails, getSubscription } from "@/app/supabase-server";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FILE_LIMITS_PER_PLAN } from "@/utils/config";
import {
  tokensToRockets,
  getPlanRocketLimits,
  ROCKET_LIMITS_PER_PLAN,
} from "@/utils/rocket-conversion";
import { getUserTokenUsage } from "@/utils/token-pricing";

import { getUser, updateEmail, updateName } from "./actions";
import { BuyExtraMessages } from "./components/buy-extra-messages";
import GitHubConnection from "./components/github-connection";
import SubscriptionRefresh from "./components/subscription-refresh";
import { getGithubConnection } from "./github-actions";
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
  title: `My Account - CodeRocket`,
  description: "Manage your account and billing.",
};

export default async function Account() {
  const [userData, userDetails, subscription, githubConnection] =
    await Promise.all([
      getUser(),
      getUserDetails(),
      getSubscription(),
      getGithubConnection(),
    ]);

  const user = userData.data.user;

  let resetDate = null;
  let extraRockets = 0;
  let tokenUsage = { input_tokens: 0, output_tokens: 0, total_cost: 0 };
  let rocketsUsed = 0;
  let rocketLimit = 0;
  let planDescription = "";

  if (user) {
    extraRockets = await getExtraMessagesCount(user.id);

    if (subscription) {
      const currentPeriodStart = new Date(subscription.current_period_start);
      const currentPeriodEnd = new Date(subscription.current_period_end);

      tokenUsage = await getUserTokenUsage(
        user.id,
        currentPeriodStart,
        currentPeriodEnd,
      );

      const planName = subscription.prices?.products?.name || "free";
      const limits = getPlanRocketLimits(planName);
      rocketLimit = limits.monthly_rockets;
      planDescription = limits.description;
      resetDate = currentPeriodEnd;
    } else {
      const today = new Date();
      const currentPeriodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const currentPeriodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1,
      );

      tokenUsage = await getUserTokenUsage(
        user.id,
        currentPeriodStart,
        currentPeriodEnd,
      );

      const limits = getPlanRocketLimits("free");
      rocketLimit = limits.monthly_rockets;
      planDescription = limits.description;
      resetDate = currentPeriodEnd;
    }

    rocketsUsed = tokensToRockets(
      tokenUsage.input_tokens + tokenUsage.output_tokens,
    );
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
      <Suspense fallback={null}>
        <SubscriptionRefresh />
      </Suspense>
      <PageTitle
        title="My Account"
        subtitle="Manage your account and billing."
      />
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
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
          <div className="text-primary my-8 text-xl font-medium">
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
                      ? ROCKET_LIMITS_PER_PLAN.starter.monthly_rockets.toLocaleString()
                      : subscription?.prices?.products?.name === "Pro"
                        ? ROCKET_LIMITS_PER_PLAN.pro.monthly_rockets.toLocaleString()
                        : ROCKET_LIMITS_PER_PLAN.enterprise.monthly_rockets.toLocaleString()}{" "}
                    🚀 Rockets per month
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    Generate with files
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    {subscription?.prices?.products?.name === "Starter"
                      ? `${FILE_LIMITS_PER_PLAN.starter} files maximum`
                      : subscription?.prices?.products?.name === "Pro"
                        ? `${FILE_LIMITS_PER_PLAN.pro} files maximum`
                        : subscription?.prices?.products?.name === "Enterprise"
                          ? "Unlimited files"
                          : "Generate with files"}
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    Improve prompt
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-emerald-500" />
                    Download code
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
                      ROCKET_LIMITS_PER_PLAN.free.monthly_rockets
                    } 🚀 Rockets per month
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="text-border mr-2 size-4" />
                    Improve prompt
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="text-border mr-2 size-4" />
                    Generate with files
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="text-border mr-2 size-4" />
                    Download code
                  </li>
                  <li className="flex items-center text-sm">
                    <XIcon className="text-border mr-2 size-4" />
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
            className="mt-8 mb-4 space-y-6"
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
              <p className="text-muted-foreground text-sm">
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

      {/* Integrations Section */}
      <div className="mb-4">
        <Card
          title="Integrations"
          description="Connect external services to add backend functionality to your generated apps."
          footer={
            <Button asChild>
              <Link
                href="/account/integrations"
                className="flex items-center gap-2"
              >
                <Plug2 className="size-4" />
                Manage Integrations
              </Link>
            </Button>
          }
        >
          <div className="my-8">
            <p className="text-muted-foreground text-sm">
              Configure integrations like Supabase, Stripe, and more to
              automatically generate full-stack applications with backend
              functionality.
            </p>
          </div>
        </Card>
      </div>

      {/* GitHub Integration Section */}
      <div className="mb-4">
        <Card
          title="GitHub Integration"
          description="Connect your GitHub account to sync your components to repositories."
        >
          <div className="mt-8">
            <GitHubConnection initialConnection={githubConnection} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 pb-10 xl:grid-cols-2">
        {/* Composant pour acheter des messages supplémentaires */}
        <Card
          title="Usage"
          description={"Track your Rockets usage for the current month"}
        >
          <div className="mt-8 mb-4 space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  🚀 Rockets used for the current period
                </span>
                <span className="font-medium">
                  {rocketsUsed.toFixed(0)} / {rocketLimit}
                </span>
              </div>

              <Progress value={(rocketsUsed / rocketLimit) * 100} />

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{planDescription}</span>
                <span>
                  {((rocketsUsed / rocketLimit) * 100).toFixed(0)}% used
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Resets on</span>
                <span className="font-medium">
                  {resetDate ? format(resetDate, "d MMMM yyyy") : "N/A"}
                </span>
              </div>

              {extraRockets > 0 && (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      🚀 Extra Rockets
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {extraRockets}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Use these when you reach your monthly limit
                  </p>
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
    <div className="bg-card flex size-full flex-col rounded-md border">
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
