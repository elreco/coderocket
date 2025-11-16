"use server";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

import "@/styles/crisp.css";
import {
  fetchChatById,
  fetchMessagesByChatId,
  fetchLastAssistantMessageByChatId,
  fetchLastUserMessageByChatId,
} from "../actions";

import ComponentCompletion from "./component-completion";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chat = await fetchChatById(slug);

  if (!chat) {
    return {
      title: "Component not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const lastUserMessage = await fetchLastUserMessageByChatId(chat.id);
  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(chat.id);

  if (!lastAssistantMessage) {
    return {
      title: "CodeRocket",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const componentTitle = chat.title || "Tailwind Component";
  const fullTitle = `${componentTitle} - CodeRocket | Tailwind AI Component`;
  const componentUrl = `https://www.coderocket.app/components/${chat.slug}`;

  const description = lastUserMessage?.content
    ? `${lastUserMessage.content.slice(0, 155)}...`
    : `AI-generated ${chat.framework} component using Tailwind CSS v4. Created with CodeRocket (formerly Tailwind AI). Create, customize, and deploy stunning web components instantly.`;

  const keywords = [
    componentTitle.toLowerCase(),
    "tailwind ai",
    "Tailwind AI",
    `${chat.framework} component`,
    `tailwind ${chat.framework}`,
    "tailwind css component",
    "ai generated component",
    "tailwind ai generator",
    "responsive design",
    chat.framework,
    "tailwind component generator",
  ];

  if (chat.clone_url) {
    keywords.push("website clone", "cloned component");
  }

  const ogImage = lastAssistantMessage?.screenshot
    ? lastAssistantMessage.screenshot
    : "https://www.coderocket.app/og.png";

  return {
    title: fullTitle,
    description,
    keywords: keywords.filter((k): k is string => k != null),
    authors: [
      {
        name: chat.user?.full_name || "CodeRocket User",
        url: `https://www.coderocket.app/users/${chat.user_id}`,
      },
    ],
    creator: chat.user?.full_name || "CodeRocket",
    publisher: "CodeRocket",
    robots: chat.is_private
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    alternates: {
      canonical: componentUrl,
    },
    openGraph: {
      type: "article",
      locale: "en_US",
      url: componentUrl,
      title: fullTitle,
      description,
      siteName: "CodeRocket",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${componentTitle} - ${chat.framework} component built with Tailwind CSS`,
        },
      ],
      ...(chat.created_at && {
        publishedTime: new Date(chat.created_at).toISOString(),
      }),
      ...(chat.user?.full_name && {
        authors: [chat.user.full_name],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
      creator: "@coderocketapp",
      site: "@coderocketapp",
    },
  };
}

export default async function Components({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const userData = await supabase.auth.getUser();
  const connectedUser = userData.data.user;
  const chat = await fetchChatById(slug);

  const isNotFound = chat?.is_private && chat?.user_id !== connectedUser?.id;

  if (!chat || isNotFound) {
    return notFound();
  }

  const lastUserMessage = await fetchLastUserMessageByChatId(chat.id);
  const messages = await fetchMessagesByChatId(chat.id);
  const lastAssistantMessage = await fetchLastAssistantMessageByChatId(chat.id);

  if (!lastUserMessage || !messages) {
    return notFound();
  }

  const authorized = connectedUser?.id === chat?.user_id;
  const user = chat?.user || { id: chat?.user_id };

  const likesCount = chat.likes || 0;
  const hasEnoughLikes = likesCount >= 5;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: chat.title || "Tailwind Component",
    description:
      lastUserMessage.content?.slice(0, 200) ||
      "AI-generated component created with CodeRocket (formerly Tailwind AI)",
    url: `https://www.coderocket.app/components/${chat.slug}`,
    programmingLanguage: chat.framework,
    runtimePlatform: "Web Browser",
    ...(chat.clone_url && { codeRepository: chat.clone_url }),
    author: {
      "@type": "Person",
      name: chat.user?.full_name || "Anonymous",
    },
    dateCreated: chat.created_at,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: likesCount,
    },
    ...(hasEnoughLikes && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.5",
        ratingCount: likesCount.toString(),
        bestRating: "5",
        worstRating: "1",
      },
    }),
    image:
      lastAssistantMessage?.screenshot || "https://www.coderocket.app/og.png",
    license: "https://creativecommons.org/licenses/by/4.0/",
  };

  return (
    <>
      {!chat.is_private && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ComponentCompletion
        chatId={chat.id}
        authorized={authorized}
        user={user}
      />
    </>
  );
}
