import { Container } from "@/components/container";
import Logo from "@/components/icons/logo";

export default function Loading() {
  return (
    <Container className="pr-2 sm:pr-11">
      <div className="relative flex size-full animate-pulse items-center justify-center rounded-md bg-background py-2">
        <Logo className="w-16" />
      </div>
    </Container>
  );
}
