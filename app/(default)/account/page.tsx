import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode, Suspense } from "react";

import { getUserDetails, getSubscription } from "@/app/supabase-server";
import ChatCard from "@/components/chat-card";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getUserChats } from "../chats/actions";

import { getUser, updateEmail, updateName } from "./actions";
import ManageSubscriptionButton from "./manage-subscription-button";

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

  if (!user) {
    return redirect("/login");
  }

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat("en-US", {
      style: "currency",
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      currency: subscription?.prices?.currency!,
      minimumFractionDigits: 0,
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  const chats = await getUserChats();
  return (
    <Container>
      <h1 className="mb-1 text-lg font-medium text-gray-900 sm:text-left sm:text-2xl">
        My Account
      </h1>
      <h2 className="mb-8 text-lg text-gray-700 sm:text-left sm:text-xl">
        Manage your account and billing.
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card
          title="Your Plan"
          description={
            subscription
              ? `You are currently on the ${subscription?.prices?.products?.name} plan.`
              : "You are not currently subscribed to any plan."
          }
          footer={<ManageSubscriptionButton />}
        >
          <div className="mb-4 mt-8 text-xl font-medium text-gray-700 hover:text-gray-900">
            {subscription ? (
              `${subscriptionPrice}/${subscription?.prices?.interval}`
            ) : (
              <Link href="/pricing">Choose your plan</Link>
            )}
          </div>
        </Card>
        <Card
          title="Your Name"
          description="Please enter your full name, or a display name you are comfortable with."
          footer={
            <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">64 characters maximum</p>
              <Suspense fallback={<Button loading></Button>}>
                <Button type="submit" form="nameForm">
                  Update Name
                </Button>
              </Suspense>
            </div>
          }
        >
          <div className="mb-4 mt-8 text-xl">
            <form id="nameForm" action={updateName}>
              <Input
                type="text"
                name="name"
                defaultValue={userDetails?.full_name ?? ""}
                placeholder="Your name"
                maxLength={64}
              />
            </form>
          </div>
        </Card>
        <Card
          title="Your Email"
          description="Please enter the email address you want to use to login."
          footer={
            <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">
                We will email you to verify the change.
              </p>
              <Button type="submit" form="emailForm">
                Update Email
              </Button>
            </div>
          }
        >
          <div className="mb-4 mt-8 text-xl">
            <form id="emailForm" action={updateEmail}>
              <Input
                type="text"
                name="email"
                defaultValue={user ? user.email : ""}
                placeholder="Your email"
                maxLength={64}
              />
            </form>
          </div>
        </Card>
      </div>
      <div className="mt-3 pb-20">
        <Card
          title="Your Components"
          description="Your generated components"
          footer={
            <div className="flex items-center justify-between">
              <Button variant="outline" href="/">
                Generate component
              </Button>
              <Button href="/chats">View featured components</Button>
            </div>
          }
        >
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {chats.map((chat) => (
              <ChatCard key={chat.chat_id} chat={chat} />
            ))}
          </div>
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
    <div className="w-full rounded-md border bg-white">
      <div className="px-5 py-4 ">
        <h3 className="mb-1 text-2xl font-medium text-gray-700">{title}</h3>
        <p className="text-gray-700">{description}</p>
        {children}
      </div>
      <div className="rounded-b-md border-t bg-white p-4 text-gray-700">
        {footer}
      </div>
    </div>
  );
}
