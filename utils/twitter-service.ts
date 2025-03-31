"use server";

import { TwitterApi } from "twitter-api-v2";

import { createClient } from "@/utils/supabase/server";

// Check if auto-tweeting is enabled
const isAutoTweetEnabled = true;

/**
 * Creates an authenticated Twitter client
 */
async function createTwitterClient(): Promise<TwitterApi> {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY as string,
    appSecret: process.env.TWITTER_API_SECRET as string,
    accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
    accessSecret: process.env.TWITTER_ACCESS_SECRET as string,
  });
}

/**
 * Posts a tweet about a newly built component with its screenshot
 */
export async function tweetComponent(
  chatId: string,
  version: number,
  screenshotUrl?: string,
): Promise<boolean> {
  // Check if auto-tweeting is enabled
  if (!isAutoTweetEnabled) {
    console.log(
      "Auto-tweeting is disabled. Set ENABLE_AUTO_TWEET=true to enable.",
    );
    return false;
  }

  try {
    // Get chat details for tweet content
    const supabase = await createClient();
    const { data: chat } = await supabase
      .from("chats")
      .select("*, messages(content)")
      .eq("id", chatId)
      .single();

    if (!chat) {
      console.error("Could not find chat for tweet:", chatId);
      return false;
    }

    const title = chat.title || "Tailwind Component";

    // Generate component URL
    const componentUrl = `https://www.tailwindai.dev/components/${chat.slug}`;

    // Create hashtags
    const hashtags = ["#TailwindCSS", "#AI"];

    // If it's a clone, add related hashtag and mention the source
    let cloneText = "";
    if (chat.clone_url) {
      hashtags.push("#WebsiteClone");
      cloneText = `\nClone of: ${chat.clone_url}`;
    }

    // Construct tweet text
    const tweetText = `Check out this ${chat.framework} component built with Tailwind AI: "${title}"\n\n${componentUrl}${cloneText}\n\n${hashtags.join(" ")}`;

    // Initialize Twitter client
    const twitterClient = await createTwitterClient();
    const v1Client = twitterClient.v1;
    const v2Client = twitterClient.v2;

    // Upload media if screenshot exists
    let mediaId: string | undefined;
    if (screenshotUrl) {
      try {
        // Fetch the image from the Supabase URL
        const response = await fetch(screenshotUrl);

        if (!response.ok) {
          console.error("Failed to fetch image from URL:", screenshotUrl);
        } else {
          const buffer = Buffer.from(await response.arrayBuffer());
          mediaId = await v1Client.uploadMedia(buffer, {
            mimeType: "image/png",
          });
        }
      } catch (error) {
        console.error("Error uploading media to Twitter:", error);
      }
    }

    // Post the tweet
    const tweet = await v2Client.tweet(
      tweetText,
      mediaId ? { media: { media_ids: [mediaId] } } : undefined,
    );
    console.log("Tweet posted successfully:", tweet);
    return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error tweeting component:", error.data);
    return false;
  }
}
