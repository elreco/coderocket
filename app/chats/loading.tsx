import { Container } from "@/components/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="pt-24">
      <Skeleton className="h-[20px] w-[100px] rounded-full" />
    </Container>
  );
}
