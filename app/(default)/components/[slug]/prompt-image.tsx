export function PromptImage({ image }: { image: string | null }) {
  return (
    image && (
      <img
        src={image}
        alt="screenshot"
        className="aspect-video w-full rounded-md border border-foreground/10 object-contain shadow-md"
      />
    )
  );
}
