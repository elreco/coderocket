import Logo from "@/components/icons/logo";

export function Footer() {
  return (
    <footer className="fixed bottom-0 z-50 mx-auto flex w-full items-center justify-between border-t bg-white px-6 py-2">
      {/* Wrapper for logo and Product Hunt badge */}
      <div className="flex items-center space-x-4">
        <Logo />
        <a
          href="https://www.producthunt.com/posts/tailwind-ai?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-tailwind&#0045;ai"
          target="_blank"
        >
          <img
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=426541&theme=dark"
            alt="Tailwind&#0032;AI - AI&#0045;Powered&#0032;Tailwind&#0032;Component&#0032;Generation | Product Hunt"
            className="h-[40px] w-[180px]"
          />
        </a>
      </div>

      {/* Paragraph aligned to the right */}
      <p className="text-right text-xs text-gray-700">
        Copyright {new Date().getFullYear()} -{" "}
        <a
          href="https://instagram.com/tailwindai.dev"
          target="_blank"
          className="text-xs font-medium text-gray-900 hover:text-gray-700"
        >
          instagram
        </a>{" "}
        -{" "}
        <a
          href="https://tools.tailwindai.dev"
          target="_blank"
          className="text-xs font-medium text-gray-900 hover:text-gray-700"
        >
          AI Tools
        </a>{" "}
        - <span className="font-medium">tailwindai.dev</span>
      </p>
    </footer>
  );
}
