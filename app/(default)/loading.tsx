import { Container } from "@/components/container";
import Logo from "@/components/icons/logo";

export default function Loading() {
  return (
    <Container>
      <div className="relative flex size-full items-center justify-center rounded-md bg-background ">
        <Logo className="w-16 animate-pulse " />
      </div>
    </Container>
  );
}
