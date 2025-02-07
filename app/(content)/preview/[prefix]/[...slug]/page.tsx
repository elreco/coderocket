import { Watermark } from "@/components/watermark";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ prefix: string; slug?: string[] }>;
  searchParams: Promise<{ watermark?: string }>;
}) {
  const { prefix, slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { watermark } = await searchParams;

  return (
    <div className="size-full">
      <Watermark />
      <iframe
        className="size-full border-none"
        src={`https://${prefix}.webcontainer.tailwindai.dev/${slug ? slug.join("/") : ""}`}
      />
    </div>
  );
}
