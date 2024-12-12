import Link from "next/link";
import { ReactNode, Suspense } from "react";

import { getUserDetails, getSubscription } from "@/app/supabase-server";
import ChatCard from "@/components/chat-card";
import ComponentCard from "@/components/component-card";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getUserChats } from "../chats/actions";
import { getChatsFromUser } from "../components/actions";

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

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat("en-US", {
      style: "currency",
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      currency: subscription?.prices?.currency!,
      minimumFractionDigits: 0,
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  const chats = await getUserChats();
  const chatsFromUser = await getChatsFromUser();
  return (
    <Container>
      <PageTitle
        title="My Account"
        subtitle="Manage your account and billing."
      />
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
          <div className="mb-4 mt-8 h-16 text-xl font-medium text-primary">
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
            <div className="flex w-full flex-col items-center justify-between sm:flex-row">
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
                className="bg-background"
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
            <div className="flex w-full flex-col items-start justify-between sm:flex-row sm:items-center">
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
                className="bg-background"
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
            <div className="flex w-full items-center justify-between">
              <Link href="/">
                <Button variant="background">Generate component</Button>
              </Link>
              <Link href="/components/featured">
                <Button>View featured components</Button>
              </Link>
            </div>
          }
        >
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {chatsFromUser?.map((chat) => (
              <ComponentCard key={chat.chat_id} chat={chat} />
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-3 pb-20">
        <Card
          title="Your Components (old version - deprecated)"
          description="Your generated components"
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
    <div className="w-full rounded-md border bg-card">
      <div className="px-5 py-4">
        <h3 className="mb-1 text-2xl font-medium">{title}</h3>
        <p>{description}</p>
        {children}
      </div>
      <div className="flex h-20 w-full items-center justify-between rounded-b-md border-t p-4 ">
        {footer}
      </div>
    </div>
  );
}
