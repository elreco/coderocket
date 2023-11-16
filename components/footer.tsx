import Logo from "@/components/icons/logo";

export function Footer() {
  return (
    <footer className="mx-auto bg-white px-6 py-2 border-t mt-10 flex items-center justify-between">
      <Logo />
      <p className="text-gray-700 text-xs">
        Copyright {new Date().getFullYear()} -{" "}
        <span className="font-semibold">tailwindai.dev</span>
      </p>
    </footer>
  );
}
