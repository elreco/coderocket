export const storageUrl =
  "https://jojdwiugelqhcajbccxn.supabase.co/storage/v1/object/public/images";

export const screenshotApiUrl =
  "https://websitescreenshot.vercel.app/api/screenshot?url=";

export const maxPromptLength = 1000;

export const openAIModel = "gpt-4o";

export const amount = 50;

export const formattedAmount = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
}).format(amount / 100);
