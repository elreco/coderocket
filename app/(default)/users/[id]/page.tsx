import { Mail, Calendar, Plus, Heart, GitFork } from "lucide-react";
import { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSubscription } from "@/app/supabase-server";
import { ComponentCard } from "@/components/component-card";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { avatarApi } from "@/utils/config";
import { getRelativeDate } from "@/utils/date";

import {
  getUser,
  getLatestComponentsByUserId,
  getLatestActivityByUserId,
  getLikesCountByUserId,
  getComponentsCountByUserId,
  getRemixesCountByUserId,
} from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;

  const user = await getUser(id);
  if (!user) {
    return {
      title: "User not found - Tailwind AI",
    };
  }

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: user.full_name
      ? `${user.full_name} - Tailwind AI`
      : "Anonymous user - Tailwind AI",
    description: `${user.full_name || "Anonymous user"} - Tailwind AI`,
    openGraph: {
      images: [user.avatar_url ? user.avatar_url : "", ...previousImages],
    },
  };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  const subscription = await getSubscription(user.id);
  const latestComponents = await getLatestComponentsByUserId(
    user.id,
    5,
    0,
    false,
    "",
  );
  const latestActivity = await getLatestActivityByUserId(user.id);
  const getComponentsCount = await getComponentsCountByUserId(user.id);
  const getRemixesCount = await getRemixesCountByUserId(user.id);
  const getLikesCount = await getLikesCountByUserId(user.id);

  return (
    <Container>
      <PageTitle title={user.full_name || "No name"} subtitle="User profile" />
      <div className="grid grid-cols-1 gap-4 pb-4 xl:grid-cols-3">
        <div className="col-span-1">
          <Card className="mb-4">
            <CardContent className="relative">
              {!subscription ? (
                <Badge className="absolute right-2 top-2 hover:bg-primary">
                  Free user
                </Badge>
              ) : (
                <Badge className="absolute right-2 top-2 bg-amber-500 hover:bg-amber-500">
                  Pro user
                </Badge>
              )}
              <div className="flex items-center justify-center py-6 lg:py-10">
                <div className="w-full space-y-6 lg:space-y-12">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="size-16 border border-primary lg:size-20">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        <img
                          src={`${avatarApi}${user.full_name}`}
                          alt="logo"
                          className="size-full"
                        />
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {user.full_name}
                      </h5>
                      <div className="text-xs text-muted-foreground lg:text-sm">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x text-center">
                    <div className="px-1 lg:px-2">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {getComponentsCount}
                      </h5>
                      <div className="text-xs text-muted-foreground lg:text-sm">
                        Components
                      </div>
                    </div>
                    <div className="px-1 lg:px-2">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {getRemixesCount}
                      </h5>
                      <div className="text-xs text-muted-foreground lg:text-sm">
                        Remixes
                      </div>
                    </div>
                    <div className="px-1 lg:px-2">
                      <h5 className="text-base font-semibold lg:text-lg">
                        {getLikesCount}
                      </h5>
                      <div className="text-xs text-muted-foreground lg:text-sm">
                        Likes
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-y-4 text-xs lg:text-sm">
                    <TooltipProvider>
                      <div className="flex items-center gap-3">
                        <Mail className="size-4 text-muted-foreground" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate">{user.email}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>User email</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="size-4 text-muted-foreground" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{getRelativeDate(user.created_at)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Account creation date</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h5 className="my-4 text-lg font-semibold">Latest activity</h5>
              <div className="flex flex-col gap-y-4">
                {latestActivity.length > 0 ? (
                  latestActivity.map((activity) => (
                    <Link
                      href={`/components/${activity.chat?.slug || activity.chat?.id}`}
                      key={`${activity.type}-${activity.data.id}`}
                      className="block w-full transition-opacity hover:opacity-80"
                    >
                      <div className="flex items-center justify-between gap-x-3">
                        <div className="flex min-w-0 flex-1 items-center gap-x-3">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                              activity.type === "like"
                                ? "bg-pink-500"
                                : activity.type === "remix"
                                  ? "bg-blue-500"
                                  : "bg-primary"
                            } text-primary-foreground`}
                          >
                            {activity.type === "like" && (
                              <Heart className="size-4" />
                            )}
                            {activity.type === "remix" && (
                              <GitFork className="size-4" />
                            )}
                            {activity.type === "creation" && (
                              <Plus className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {activity.chat?.title || "Untitled Component"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.type === "like" && "Liked a component"}
                              {activity.type === "remix" &&
                                "Remixed a component"}
                              {activity.type === "creation" &&
                                "Created a component"}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                          {getRelativeDate(activity.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No activity yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="col-span-1 xl:col-span-2">
          <CardContent>
            <h5 className="my-4 text-base font-semibold lg:text-lg">
              Latest components
            </h5>
            {latestComponents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                {latestComponents.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-4 lg:row-span-2">
                    <ComponentCard chat={latestComponents[0]} />
                  </div>
                )}
                {latestComponents.length > 1 && (
                  <div className="sm:col-span-1 lg:col-span-2">
                    <ComponentCard chat={latestComponents[1]} />
                  </div>
                )}
                {latestComponents.length > 2 && (
                  <div className="sm:col-span-1 lg:col-span-2">
                    <ComponentCard chat={latestComponents[2]} />
                  </div>
                )}
                {latestComponents.length > 3 && (
                  <div className="sm:col-span-1 lg:col-span-3">
                    <ComponentCard chat={latestComponents[3]} />
                  </div>
                )}
                {latestComponents.length > 4 && (
                  <div className="sm:col-span-1 lg:col-span-3">
                    <ComponentCard chat={latestComponents[4]} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No components created yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
