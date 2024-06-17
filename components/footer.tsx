import Logo from "@/components/icons/logo";

export function Footer() {
  return (
    <footer className="fixed bottom-0 z-50 mx-auto flex w-full items-center justify-between border-t bg-white px-6 py-2">
      <Logo />

      <p className="text-xs text-gray-700">
        Copyright {new Date().getFullYear()} -{" "}
        <a
          href="https://linkedin.com/in/alexandre-le-corre"
          target="_blank"
          className="text-xs font-medium text-gray-900 hover:text-gray-700"
        >
          contact
        </a>{" "}
        - <span className="font-medium">tailwindai.dev</span>
      </p>
    </footer>
  );
}
