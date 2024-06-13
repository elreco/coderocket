import { Container } from "@/components/container";
import Logo from "@/components/icons/logo";

export default function Loading() {
  return (
    <Container>
      <div className="relative flex size-full animate-pulse items-center justify-center rounded-md bg-gray-900/20 ">
        <Logo className="w-16" />
      </div>
    </Container>
  );
}
