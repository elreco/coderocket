import Logo from "@/components/icons/logo";

export function Footer() {
  return (
    <footer className="mx-auto mt-10 flex items-center justify-between border-t bg-white px-6 py-2">
      <Logo />
      <p className="text-xs text-gray-700">
        Copyright {new Date().getFullYear()} -{" "}
        <span className="font-semibold">tailwindai.dev</span>
      </p>
    </footer>
  );
}
