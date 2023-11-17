import { Container } from "@/components/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="pt-24">
      <Skeleton className="w-[100px] h-[20px] rounded-full" />
    </Container>
  );
}
